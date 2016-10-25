'use strict';

var events = require('events');
var util = require('util');

var jsrs = require('./record-serialization');
var common = require('./common');
var errors = require('./errors');
var RemoteProxy = require('./remote-proxy');

module.exports = Connection;

var nextConnectionId = 0;

// JSTP connection class
//   transport - an abstract socket
//   server - JSTP server instance, used only for server-side parts
//            of connections (optional, but either server or client
//            is required)
//   client - JSTP client instance, used only for client-side parts
//            of connections (optional, but either server or client
//            is required)
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
  } else if (client) {
    this.kind = 'client';
    this.packetIdDelta = 1;
  } else {
    throw new Error('either server or client is required');
  }

  this.remoteAddress = transport.getRemoteAddress();

  this.callbacks = {};

  this.handshakeDone = false;
  this.authenticated = false;
  this.sessionId = null;

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
    var packets = this.transport.getBufferContent();
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

  if (packet.handshake[1]) {  // if there is an application name
    this.processHandshakeRequest(packet, keys);
  } else {
    this.processHandshakeResponse(packet, keys);
  }
};

// Process incoming handshake packet which is a handshake request
//   packet - parsed packet
//   keys - array of packet keys
//
Connection.prototype.processHandshakeRequest = function(packet, keys) {
  if (!this.server) {
    this.handshakeError(errors.ERR_NOT_A_SERVER);
    return;
  }

  var applicationName = packet.handshake[1];
  var application = this.server.getApplication(applicationName);

  if (!application) {
    this.handshakeError(errors.ERR_APP_NOT_FOUND);
    return;
  }

  this.application = application;

  var username = keys[1];
  var password = packet[username];

  this.emitPacketEvent('handshakeRequest', packet, packet.handshake[0], {
    packetType: 'handshake',
    handshakeRequest: true,
    username: username,
    password: password
  });

  if (username) {
    this.server.startAuthenticatedSession(this, application,
      username, password, this.onAuthenticatedSessionCreated.bind(this));
  } else {
    this.server.startAnonymousSession(this, application,
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
    this.handshakeError(errors.ERR_AUTH_FAILED);
    return;
  }

  this.handshakeDone = true;

  this.emit('client', sessionId, this);
  this.server.emit('connect', this);

  var packet = this.createPacket('handshake', null, 'ok', sessionId);
  this.send(packet);
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

// Process incoming handshake packet which is a handshake response
//   packet - parsed packet
//
Connection.prototype.processHandshakeResponse = function(packet) {
  var packetId = packet.handshake[0];
  var callback = this.callbacks[packetId];

  if (!callback) {
    this.rejectPacket(packet);
  }

  if (packet.ok) {
    delete this.callbacks[packetId];

    this.handshakeDone = true;
    this.application = this.client.getApplication();
    this.emitPacketEvent('handshake', packet, packetId, {
      sessionId: packet.ok
    });

    callback(null, packet.ok);
  } else if (packet.error) {
    delete this.callbacks[packetId];
    callback(errors.RemoteError.fromJstpArray(packet.error));
  } else {
    this.rejectPacket(packet, true);
  }
};

// End the connection with handshake error
//   error - error that has occured
//
Connection.prototype.handshakeError = function(error) {
  var normalizedError = errors.RemoteError.getJstpArrayFor(error);
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

  this.emitPacketEvent('call', packet, packetId, {
    interfaceName: interfaceName,
    methodName: methodName
  });

  var callback = this.remoteCallbackWrapper.bind(this, packetId);
  args.push(callback);

  try {
    this.application.callMethod(this, interfaceName, methodName, args);
  } catch (error) {
    if (error instanceof errors.RemoteError) {
      callback(error);
    } else {
      callback(errors.ERR_INTERNAL_API_ERROR);
      throw error;
    }
  }
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
      callback(errors.RemoteError.fromJstpArray(packet.error));
    } else {
      this.rejectPacket(packet);
    }
  }

  var eventArgs = callback ?
    null :
    { sourcePacketUnknown: true };

  this.emitPacketEvent('callback', packet, packetId, eventArgs);

  if (!callback) {
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

  this.emitPacketEvent('event', packet, packet.event[0], {
    interfaceName: interfaceName,
    remoteEventName: eventName,
    remoteEventArgs: eventArgs
  });

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

  this.emitPacketEvent('inspect', packet, packetId, {
    interfaceName: interfaceName
  });

  var methods = this.application.getMethods(interfaceName);
  if (methods) {
    this.callback(packetId, null, methods);
  } else {
    this.callback(packetId, errors.ERR_INTERFACE_NOT_FOUND);
  }
};

// Process incoming state packet
//   packet - parsed packet
//
Connection.prototype.processStatePacket = function(packet, keys) {
  var path = packet.state[1];
  var verb = keys[1];
  var value = packet[verb];

  this.emitPacketEvent('state', packet, packet.state[0], {
    path: path,
    verb: verb,
    value: value
  });
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

// Emit an event notifying about incoming packet. The event payload is an
// object that contains information about the connection, application, packet,
// packet type, packet ID and any additional data that you pass to this
// function.
//   kind - packet type and event name
//   packet - parsed packet
//   packetId - packet ID
//   args - additional event arguments (optional)
//
Connection.prototype.emitPacketEvent = function(kind, packet, packetId, args) {
  var eventArgs = {
    connection: this,
    packetType: kind,
    packet: packet,
    packetId: packetId,
    application: this.application
  };

  if (args) {
    common.extend(eventArgs, args);
  }

  this.emit(kind, eventArgs);
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
    error = errors.RemoteError.getJstpArrayFor(error);
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
    var self = this;

    this.callbacks[packetId] = function(error, sessionId) {
      if (login && password && !error) {
        self.authenticated = true;
      }

      callback(error, sessionId);
    };
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

  this.send(packet);
};
