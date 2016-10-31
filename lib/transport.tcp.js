'use strict';

var net = require('net');
var tls = require('tls');
var util = require('util');
var events = require('events');

var common = require('./common');
var Server = require('./server');

var tcp = {};
module.exports = tcp;

// Create a JSTP server bound to a TCP server
//   config - TCP server config
//   appsProvider - application provider
//   authProvider - authentication provider
//
tcp.createServer = function(config, appsProvider, authProvider) {
  var secure = false;

  if (typeof(config) === 'number') {
    config = { port: config };
  } else if (config.key && config.cert) {
    secure = true;
  }

  var tcpServer = secure ?
    tls.createServer(config) :
    net.createServer(config);

  var transportServer = new TcpTransportServer(tcpServer, config.port);
  var jstpServer = new Server(transportServer, appsProvider, authProvider);

  return jstpServer;
};

// TCP server adapter for JSTP server
//   server - TCP server instance
//   port - port to listen on
//
function TcpTransportServer(server, port) {
  events.EventEmitter.call(this);

  this.server = server;
  this.port = port;

  common.forwardMultipleEvents(server, this, [
    'connection',
    'listening',
    'close',
    'error'
  ]);
}

util.inherits(TcpTransportServer, events.EventEmitter);
tcp.TcpTransportServer = TcpTransportServer;

// Switch the server into listening state
//   callback - callback function (optional)
//
TcpTransportServer.prototype.listen = function(callback) {
  this.server.listen(this.port, callback);
};

// Stop listening for connections
//   callback - callback function (optional)
//
TcpTransportServer.prototype.close = function(callback) {
  this.server.close(callback);
};

// Create a JSTP transport from a TCP socket
//   socket - TCP socket instance
//
TcpTransportServer.prototype.createTransport = function(socket) {
  return new TcpTransport(socket);
};

// JSTP transport for TCP
//   socket - TCP socket instance
//
function TcpTransport(socket) {
  events.EventEmitter.call(this);
  this.socket = socket;

  this._buffer = [];
  this._bufferSize = 0;

  this.socket.on('data', this._onSocketData.bind(this));
  this.socket.on('close', this._onSocketClose.bind(this));
  this.socket.on('error', this._onSocketError.bind(this));
}

util.inherits(TcpTransport, events.EventEmitter);
tcp.TcpTransport = TcpTransport;

// Get the address of a remote host
//
TcpTransport.prototype.getRemoteAddress = function() {
  return this.socket.getRemoteAddress();
};

// Send data over the connection
//   data - Buffer or string
//
TcpTransport.prototype.send = function(data) {
  var buffer = this._prepareDataForSending(data);
  this.socket.write(buffer);
};

// End the connection optionally sending the last chunk of data
//   data - Buffer or string (optional)
//
TcpTransport.prototype.end = function(data) {
  var buffer;

  if (data) {
    buffer = this._prepareDataForSending(data);
  }

  this.socket.end(buffer);
};

// Prepare data to be sent as a JSTP packet
//   data - Buffer or string
//
TcpTransport.prototype._prepareDataForSending = function(data) {
  var size = data.length + 1;
  var buffer = common.createZeroFilledBuffer(size);

  // Since we allocate a zero-filled buffer which size is equal to data.length
  // incremented by one, the last byte is equal to zero and serves as the
  // package delimiter
  if (typeof(data) === 'string') {
    buffer.write(data);
  } else {
    data.copy(buffer);
  }

  return buffer;
};

// TCP socket data handler
//   data - data received
//
TcpTransport.prototype._onSocketData = function(chunk) {
  var messageEnd = false;
  var chunkLength = chunk.length;

  for (var i = 0; i < chunkLength; i++) {
    if (chunk[i] === 0) {
      chunk[i] = ',';
    }

    if (i === chunkLength - 1) {
      messageEnd = true;
    }
  }

  this._buffer.push(chunk);
  this._bufferSize += chunkLength;

  if (messageEnd) {
    var data = Buffer.concat(this._buffer, this._bufferSize);

    this._buffer = [];
    this._bufferSize = 0;

    this.emit('data', '[' + data.toString() + ']');
  }
};

// TCP socket close handler
//
TcpTransport.prototype._onSocketClose = function() {
  this.emit('close');
};

// TCP socket error handler
//   error - error that has occured
//
TcpTransport.prototype._onSocketError = function(error) {
  this.socket.destroy();
  this.emit('error', error);
};
