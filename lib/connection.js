'use strict';

var events = require('events');
var util = require('util');

var jsrs = require('./record-serialization');
var RemoteError = require('./remote-error');

module.exports = Connection;

var nextConnectionId = 0;

// JSTP connection class
//   transport - an abstract socket
//   server - optional JSTP server instance, used only for server-side parts
//            of connections
//   client - optional JSTP client instance, used only for client-side parts
//            of connections
//
function Connection(transport, server, client) {
  events.EventEmitter.call(this);

  this.transport = transport;
  this.server = server;
  this.client = client;

  this.id = nextConnectionId++;
  this.nextPacketId = 0;

  if (server) {
    this.kind = 'server';
    this.packetIdDelta = -1;
  } else {
    this.kind = 'client';
    this.packetIdDelta = 1;
  }

  this.remoteAddress = transport.getRemoteAddress();

  this.callbacks = {};

  this.handshakeDone = false;
  this.authenticated = false;

  this.application = null;

  transport.on('data', this.onSocketData.bind(this));
  transport.on('close', this.onSocketClose.bind(this));
  transport.on('error', this.onSocketError.bind(this));

  this.handlers = {
    handshake: this.processHandshakePacket.bind(this),
    call: this.processCallPacket.bind(this),
    callback: this.processCallbackPacket.bind(this),
    event: this.processEventPacket.bind(this),
    inspect: this.processInspectPacket.bind(this)
  };
}

util.inherits(Connection, events.EventEmitter);

// Incoming data event handler
//   data - data to process
//
Connection.prototype.onSocketData = function(data) {
  this.emit('data', data);

  this.transport.addDataToBuffer(data);

  if (this.transport.isBufferReady()) {
    var packets = this.transport.getPacketsFromBuffer();
    var parsedPackets = jsrs.parse(packets);

    this.processPackets(parsedPackets);
  }
};

// Closed socket event handler
//
Connection.prototype.onSocketClose = function() {
  this.emit('close', this);

  if (this.server) {
    this.server.emit('disconnect', this);
  }
};

// Socket error event handler
//   error - error that has occured
//
Connection.prototype.onSocketError = function(error) {
  this.emit('error', error, this);
};

// Process parsed incoming packets
//   packets - array of packets
//
Connection.prototype.processPackets = function(packets) {
  for (var index = 0; index < packets.length; index++) {
    var packet = packets[index];
    this.emit('packet', packet, this);

    var keys = Object.keys(packet);
    var kind = keys[0];

    if (!this.handshakeDone && kind !== 'handshake') {
      this.rejectPacket(packet, true);
      return;
    }

    var handler = this.handlers[kind];
    if (handler) {
      handler(packet, keys);
    } else {
      this.rejectPacket(packet);
    }
  }
};

// Reject incoming packet
//   packet - rejected packet
//   fatal - if true, close the connection
//
Connection.prototype.rejectPacket = function(packet, fatal) {
  this.emit('packetRejected', packet, this);

  if (fatal) {
    this.end();
  }
};

// Process incoming handshake packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processHandshakePacket = function(packet, keys) {
  if (this.handshakeDone) {
    this.emit('abundantHandshake', packet, this);
    return;
  }

  var packetId = packet.handshake[0];
  var callback = this.callbacks[packetId];

  if (packet.ok) {
    this.emit('handshake', packet.ok, this);

    if (callback) {
      delete this.callbacks[packetId];
      this.handshakeDone = true;

      this.application = this.client.getApplication();

      callback(null, packet.ok);
    }
  } else if (packet.error) {
    if (callback) {
      delete this.callbacks[packetId];
      callback(new RemoteError(packet.error[0], packet.error[1]));
    }
  } else {
    this.processHandshakeRequest(packet, keys);
  }
};

// Process incoming handshake packet which is a handshake request, not a
// response
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processHandshakeRequest = function(packet, keys) {
  if (!this.server) {
    this.end(this.createPacket('handshake', null, 'error',
      RemoteError.NOT_A_SERVER.jstpArray));
    return;
  }

  var applicationName = packet.handshake[1];
  var application = this.server.applications.getApplication(applicationName);

  if (!application) {
    this.end(this.createPacket('handshake', null, 'error',
      RemoteError.APP_NOT_FOUND.jstpArray));
    return;
  }

  this.application = application;

  var username = keys[1];
  var password = packet[username];

  this.emit('handshakeRequest', application, username, password, this);

  if (username) {
    this.server.auth.startAuthenticatedSession(
      this, username, password, this.onAuthenticatedSessionCreated.bind(this));
  } else {
    this.server.auth.startAnonymousSession(
      this, this.onSessionCreated.bind(this));
  }
};

// Callback of authentication operation. This function is passed to
// startAuthenticatedSession and startAnonymousSession functions (wrapped into
// onAuthenticatedSessionCreated or directly respectively) of the
// authentication service injected into JSTP server as a dependency as a
// callback function since these operations may be (and most probably will be)
// asynchronous.
//   error - error that has occured or null
//   sessionId - session id or hash
//
Connection.prototype.onSessionCreated = function(error, sessionId) {
  if (error) {
    this.end(this.createPacket('handshake', null, 'error',
      RemoteError.AUTH_FAILED.jstpArray));
    return;
  }

  this.handshakeDone = true;

  this.emit('client', sessionId, this);

  if (this.server) {
    this.server.emit('connect', this);
  }
};

// onSessionCreated wrapper for authenticated connections
//   error - error that has occured or null
//   sessionId - session id or hash
//
Connection.prototype.onAuthenticatedSessionCreated =
  function(error, sessionId) {
    if (!error) {
      this.authenticated = true;
    }

    this.onSessionCreated(error, sessionId);
  };

// Process incoming call packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processCallPacket = function(packet, keys) {
  var packetId = packet.call[0];
  var interfaceName = packet.call[1];
  var methodName = keys[1];
  var args = packet[methodName];

  args.push(this.sendCallbackInternal.bind(this, packetId));
  this.application.callMethod(this, interfaceName, methodName, args);
};

// Process incoming callback packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processCallbackPacket = function(packet) {
  var packetId = packet.callback[0];
  var callback = this.callbacks[packetId];

  if (callback) {
    delete this.callbacks[packetId];

    if (packet.ok) {
      callback.apply(this, [null].concat(packet.ok));
    } else if (packet.error) {
      callback(RemoteError.fromJstpArray(packet.error));
    } else {
      this.rejectPacket(packet);
    }
  } else {
    this.emit('callbackForUnknownPacket', packetId, packet, this);
  }
};

// Process incoming event packet
//   packet - parsed packet
//   keys - array of packet keys
//
// eslint-disable-next-line no-unused-vars
Connection.prototype.processEventPacket = function(packet, keys) {

};

// Process incoming inspect packet
//   packet - parsed packet
//   keys - array of packet keys
//
// eslint-disable-next-line no-unused-vars
Connection.prototype.processInspectPacket = function(packet, keys) {

};

// Internal method used to send callbacks of call and inspect packets
// Signature: Connection#sendCallbackInternal(packetId, error, ...result)
//   packetId - id of a packet to send callback for
//   error - error that has occured, if any
//   result - data to send back as a result
//
Connection.prototype.sendCallbackInternal = function(packetId, error) {
  var result = Array.prototype.slice.call(arguments, 2);

  if (error && error instanceof RemoteError) {
    error = error.jstpArray;
  } else if (error && !Array.isArray(error)) {
    error = [0, error.toString()];
  }

  this.callback(packetId, error, result);
};