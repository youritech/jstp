'use strict';

var events = require('events');
var util = require('util');

var jsrs = require('./record-serialization');
var RemoteError = require('./remote-error');
var RemoteProxy = require('./remote-proxy');

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
  this.remoteProxies = {};

  transport.on('data', this.onSocketData.bind(this));
  transport.on('close', this.onSocketClose.bind(this));
  transport.on('error', this.onSocketError.bind(this));

  this.handlers = {
    handshake: this.processHandshakePacket.bind(this),
    call: this.processCallPacket.bind(this),
    callback: this.processCallbackPacket.bind(this),
    event: this.processEventPacket.bind(this),
    inspect: this.processInspectPacket.bind(this),
    state: this.processStatePacket.bind(this)
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
    this.handshakeError(RemoteError.NOT_A_SERVER);
    return;
  }

  var applicationName = packet.handshake[1];
  var application = this.server.getApplication(applicationName);

  if (!application) {
    this.handshakeError(RemoteError.APP_NOT_FOUND);
    return;
  }

  this.application = application;

  var username = keys[1];
  var password = packet[username];

  this.emit('handshakeRequest', application, username, password, this);

  if (username) {
    this.server.startAuthenticatedSession(this, application,
      username, password, this.onAuthenticatedSessionCreated.bind(this));
  } else {
    this.server.auth.startAnonymousSession(this, application,
      this.onSessionCreated.bind(this));
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
    this.handshakeError(RemoteError.AUTH_FAILED);
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

// End the connection with handshake error
//   error - error that has occured
//
Connection.prototype.handshakeError = function(error) {
  var normalizedError = RemoteError.getJstpArrayFor(error);
  var packet = this.createPacket('handshake', null, 'error', normalizedError);

  this.end(packet);
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

  args.push(this.remoteCallbackWrapper.bind(this, packetId));
  this.application.callMethod(this, interfaceName, methodName, args);
};

// Process incoming callback packet
//   packet - parsed packet
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
Connection.prototype.processEventPacket = function(packet, keys) {
  var interfaceName = packet.event[1];
  var eventName = keys[1];
  var eventArgs = packet[eventName];

  this.emit('remoteEvent', interfaceName, eventName, eventArgs, this);

  var remoteProxy = this.remoteProxies[interfaceName];
  if (remoteProxy) {
    remoteProxy.emit(eventName, eventArgs, true);
  }
};

// Process incoming inspect packet
//   packet - parsed packet
//
Connection.prototype.processInspectPacket = function(packet) {
  var packetId = packet.inspect[0];
  var interfaceName = packet.inspect[1];

  var methods = this.application.getMethods(interfaceName);
  if (methods) {
    this.callback(packetId, null, methods);
  } else {
    this.callback(packetId, RemoteError.INTERFACE_NOT_FOUND);
  }
};

// Process incoming state packet
//   packet - parsed packet
//
Connection.prototype.processStatePacket = function(packet, keys) {
  var path = packet.state[1];
  var verb = keys[1];
  var value = packet[verb];

  this.emit('stateChange', path, verb, value, this);
};

// Callback of functions invoked via call packets
// Signature: Connection#remoteCallbackWrapper(packetId, error, ...result)
//   packetId - id of a packet to send callback for
//   error - error that has occured, if any
//   result - data to send back as a result
//
Connection.prototype.remoteCallbackWrapper = function(packetId, error) {
  var result = Array.prototype.slice.call(arguments, 2);
  this.callback(packetId, error, result);
};

// Create a JSTP packet
//   kind - packet kind
//   target - name of an interface or an application (optional)
//   verb - action specific for different packet kinds
//   args - action arguments
//
Connection.prototype.createPacket = function(kind, target, verb, args) {
  var packet = {};

  packet[kind] = target ?
    [this.nextPacketId, target] :
    [this.nextPacketId];

  if (verb) {
    packet[verb] = args;
  }

  this.nextPacketId += this.packetIdDelta;

  return packet;
};

// Send a JSTP packet over this connection
//   packet - a packet to send
//
Connection.prototype.send = function(packet) {
  var data = jsrs.stringify(packet);
  this.transport.send(data);
};

// Close the connection, optionally sending a final packet
//   packet - a packet to send (optional)
//
Connection.prototype.end = function(packet) {
  if (packet) {
    var data = jsrs.stringify(packet);
    this.transport.end(data);
  } else {
    this.transport.end();
  }
};

// Send a call packet over the connection
//   interfaceName - name of an interface
//   methodName - name of a method
//   args - method arguments
//   callback - callback function that is invoked after a callback packet
//              has been received
//
Connection.prototype.call =
  function(interfaceName, methodName, args, callback) {
    var packet = this.createPacket('call', interfaceName, methodName, args);

    if (callback) {
      var packetId = packet.call[0];
      this.callbacks[packetId] = callback;
    }

    this.send(packet);
  };

// Send a callback packet over the connection
//   packetId - id of a call packet to send callback packet for
//   error - error that has occured or null
//   result - result of a remote method if there was no error
//
Connection.prototype.callback = function(packetId, error, result) {
  var packet;

  if (error) {
    error = RemoteError.getJstpArrayFor(error);
    packet = this.createPacket('callback', null, 'error', error);
  } else {
    packet = this.createPacket('callback', null, 'ok', result);
  }

  packet.callback[0] = packetId;

  this.send(packet);
};

// Send an event packet over the connection
//   interfaceName - name of an interface
//   eventName - name of an event
//   args - event arguments as an object
//
Connection.prototype.event = function(interfaceName, eventName, args) {
  var packet = this.createPacket('event', interfaceName, eventName, args);
  this.send(packet);
};

// Send a state synchronization packet over the connection
//   path - path to a value in the application state
//   verb - operation with this value (inc, dec, let, delete, push, pop, shift,
//          unshift)
//   value - a value to modify the current value with
//
Connection.prototype.state = function(path, verb, value) {
  var packet = this.createPacket('state', path, verb, value);
  this.send(packet);
};

// Send a handshake packet over the connection
//   appName - name of an application to connect to
//   login - user name (optional)
//   password - user password (optional)
//   callback - callback function to invoke after the handshake is completed
//
Connection.prototype.handshake = function(appName, login, password, callback) {
  var packet = this.createPacket('handshake', appName, login, password);

  if (callback) {
    var packetId = packet.handshake[0];
    this.callbacks[packetId] = callback;
  }

  this.send(packet);
};

// Send an inspect packet over the connection
//   interfaceName - name of an interface to inspect
//   callback - callback function to invoke after another side responds
//              with interface introspection
//
Connection.prototype.inspect = function(interfaceName, callback) {
  var packet = this.createPacket('inspect', interfaceName, null, null);
  var packetId = packet.inspect[0];
  var self = this;

  this.callbacks[packetId] = function(error) {
    if (error) {
      return callback(error);
    }

    var methods = Array.prototype.slice.call(arguments, 1);
    var proxy = new RemoteProxy(this, interfaceName, methods);

    self.remoteProxies[interfaceName] = proxy;

    if (callback) {
      callback(null, proxy);
    }
  };
};
