'use strict';

var fs = require('fs');
var net = require('net');
var tls = require('tls');
var util = require('util');
var events = require('events');

var jsrs = require('./record-serialization');
var common = require('./common');
var Server = require('./server');
var Client = require('./client');

var SEPARATOR = common.createZeroFilledBuffer(1);
var MAX_PACKET_SIZE = 8 * 1024 * 1024;

var sock = {};
module.exports = sock;

// Create a JSTP server bound to a POSIX socket
//   config - socket server config
//   applications - applications index
//   authCallback - authentication callback
//
sock.createServer = function(config, applications, authCallback) {
  var secure = config.key && config.cert;
  var rawServer = (secure ? tls : net).createServer(config);
  var transportServer = new SocketServer(rawServer, config);
  var jstpServer = new Server(transportServer, applications, authCallback,
    config.heartbeat);
  return jstpServer;
};

// Create a JSTP client that will transfer data over a socket
//   config - network client config
//   application - client application
//
sock.createClient = function(config, application) {
  var rawClient = new SocketClient(config);
  var jstpClient = new Client(rawClient, application, config.heartbeat);
  return jstpClient;
};

// Socket connection server
//   server - network server instance
//   config - server config
//
function SocketServer(server, config) {
  events.EventEmitter.call(this);

  this.server = server;
  this.port = config.port;
  this.path = config.path;

  common.forwardMultipleEvents(server, this, [
    'listening',
    'close',
    'error'
  ]);

  var connectEventName = config.secure ? 'secureConnection' : 'connection';
  common.forwardEvent(server, this, connectEventName, 'connection');
}

util.inherits(SocketServer, events.EventEmitter);
sock.SocketServer = SocketServer;

// Switch the server into listening state
//   callback - callback function (optional)
//
SocketServer.prototype.listen = function(callback) {
  if (this.port) {
    this.server.listen(this.port, callback);
  } else {
    var self = this;
    fs.unlink(self.path, function() {
      self.server.listen(self.path, callback);
      self.server.once('close', function() {
        // In Node.js >= 6, calling an asynchronous function without callback
        // is deprecated
        fs.unlink(self.path, function() {  });
      });
    });
  }
};

// Stop listening for connections
//   callback - callback function (optional)
//
SocketServer.prototype.close = function() {
  this.server.close();
};

// Create a JSTP transport from a socket
//   socket - socket instance
//
SocketServer.prototype.createTransport = function(socket) {
  return new SocketTransport(socket);
};

// Socket connection client
//   config - socket config
//
function SocketClient(config) {
  events.EventEmitter.call(this);

  this.config = config;
  this.socket = null;
  this.isConnected = false;
}

util.inherits(SocketClient, events.EventEmitter);
sock.SocketClient = SocketClient;

// Connect to the server
//  callback - callback function
//
SocketClient.prototype.connect = function(callback) {
  if (this.isConnected) {
    return callback(new Error('Already connected'));
  }

  var netModule = this.config.secure ? tls : net;

  this.socket = netModule.connect(this.config, function() {
    this.isConnected = true;
    callback();
    this.emit('connect');
  }.bind(this));

  this.socket.on('error', function(error) {
    if (this.isConnected) {
      this.emit('error', error);
    } else {
      callback(error);
    }
  }.bind(this));

  this.socket.on('close', this._onSocketClose.bind(this));
};

// Disconnect from the server
//
SocketClient.prototype.disconnect = function(callback) {
  this._ensureConnected();

  if (callback) {
    this.socket.once('close', callback);
  }

  this.socket.end();
};

// Create a JSTP transport from the underlying socket
//
SocketClient.prototype.createTransport = function() {
  this._ensureConnected();
  return new SocketTransport(this.socket);
};

// Socket close handler
//
SocketClient.prototype._onSocketClose = function() {
  this.isConnected = false;
  this.emit('close');
};

// Check if the client is in the connected state and throw an error otherwise
//
SocketClient.prototype._ensureConnected = function() {
  if (!this.isConnected) {
    throw new Error('Not connected yet');
  }
};

// JSTP transport for POSIX socket
//   socket - socket instance
//
function SocketTransport(socket) {
  events.EventEmitter.call(this);

  this.socket = socket;
  this._buffer = '';
  this._uncorkSocket = this.socket.uncork.bind(this.socket);

  this.remoteAddress = socket.remoteAddress;

  this.socket.setEncoding('utf8');
  this.socket.on('data', this._onSocketData.bind(this));

  common.forwardMultipleEvents(this.socket, this, [
    'error',
    'close'
  ]);
}

util.inherits(SocketTransport, events.EventEmitter);
sock.SocketTransport = SocketTransport;

// Send data over the connection
//   data - Buffer or string
//
SocketTransport.prototype.send = function(data) {
  this.socket.cork();
  this.socket.write(data);
  this.socket.write(SEPARATOR);
  process.nextTick(this._uncorkSocket);
};

// End the connection optionally sending the last chunk of data
//   data - Buffer or string (optional)
//
SocketTransport.prototype.end = function(data) {
  if (data) {
    this.socket.cork();
    this.socket.write(data);
    this.socket.end(SEPARATOR);
  } else {
    this.socket.end();
  }

  this.socket.destroy();
};

// Socket data handler
//   data - data received
//
SocketTransport.prototype._onSocketData = function(chunk) {
  var packets = [];
  this._buffer += chunk;

  try {
    this._buffer = jsrs.parseNetworkPackets(this._buffer, packets);
  } catch (error) {
    this.emit('error', error);
    return;
  }

  var packetsCount = packets.length;
  for (var i = 0; i < packetsCount; i++) {
    this.emit('packet', packets[i]);
  }

  if (this._buffer.length > MAX_PACKET_SIZE) {
    this.emit('error', new Error('Maximal packet size exceeded'));
  }
};
