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
//
function Connection(transport, server) {
  events.EventEmitter.call(this);

  this.transport = transport;
  this.server = server;

  this.id = nextConnectionId++;
  this.nextPacketId = 0;

  if (server) {
    this.kind = 'server';
    this.packetIdDelta = -1;
  } else {
    this.kind = 'client';
    this.packetIdDelta = 1;
  }

  this.remoteAddress = transport.remoteAddress;

  this.callbacks = {};

  this.handshakeDone = false;
  this.authenticated = false;

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

    var handler = this.handlers[kind];
    if (handler) {
      handler(packet, keys);
    } else {
      this.emit('unknownKind', packet, this);
    }
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

  var username = keys[1];
  var password = packet[username];

  this.emit('handshakeRequest', application, username, password, this);

  if (username) {
    this.server.auth.startAuthenticatedSession(
      this, username, password, afterAuth);
  } else {
    this.server.auth.startAnonymousSession(this, afterAuth);
  }

  function afterAuth(error, sessionHash) {
    if (error) {
      this.end(this.createPacket('handshake', null, 'error',
        RemoteError.AUTH_FAILED.jstpArray));
      return;
    }

    this.emit('client', sessionHash, this);

    if (this.server) {
      this.server.emit('connect', this);
    }
  }
};

// Process incoming call packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processCallPacket = function(packet, keys) {

};

// Process incoming callback packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processCallbackPacket = function(packet, keys) {

};

// Process incoming event packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processEventPacket = function(packet, keys) {

};

// Process incoming inspect packet
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processInspectPacket = function(packet, keys) {

};
