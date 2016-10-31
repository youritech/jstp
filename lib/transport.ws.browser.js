/* eslint-env browser, commonjs */
'use strict';

var events = require('events');
var util = require('util');

var Client = require('./client');
var common = require('./common');
var constants = require('./internal-constants');

var ws = {};
module.exports = ws;

// Create a JSTP client that will transfer data over a WebSocket connection
//   url - WebSocket endpoint URL
//   appProvider - client application provider
//
ws.createClient = function(url, appProvider) {
  var wsClient = new W3CWebSocketClient(url);
  var jstpClient = new Client(wsClient, appProvider);

  return jstpClient;
};

// Client WebSocket connection for JSTP
//   url - WebSocket endpoint URL
//
function W3CWebSocketClient(url) {
  events.EventEmitter.call(this);

  this.url = url;
  this.socket = null;
  this.socketEventEmitter = null;
  this.socketDidOpen = false;
}

util.inherits(W3CWebSocketClient, events.EventEmitter);
ws.W3CWebSocketClient = W3CWebSocketClient;

// Connect to the server
//  callback - callback function
//
W3CWebSocketClient.prototype.connect = function(callback) {
  if (this.socket) {
    if (callback) {
      callback(new Error('Already connected'));
    }
    return;
  }

  this.socket = new WebSocket(this.url, constants.WEBSOCKET_PROTOCOL_NAME);
  this.socketEventEmitter = new events.EventEmitter();

  this.socket.onopen = this._onOpen.bind(this);
  this.socket.onclose = this._onClose.bind(this);
  this.socket.onerror = this._onError.bind(this);
  this.socket.onmessage = this._onMessage.bind(this);

  this.socketEventEmitter.once('connectFailed', function(error) {
    if (callback) {
      callback(error);
    }
  });

  this.socketEventEmitter.once('open', function() {
    if (callback) {
      callback();
    }
  });
};

// Disconnect from the server
//
W3CWebSocketClient.prototype.disconnect = function() {
  this.socket.close();
  this.socket = null;
  this.socketEventEmitter = null;
  this.socketDidOpen = false;
};

// Create a JSTP transport from the underlying WebSocket connection
//
W3CWebSocketClient.prototype.createTransport = function() {
  if (!this.socket) {
    throw new Error('Not connected yet');
  }

  return new W3CWebSocketTransport(this.socket, this.socketEventEmitter);
};

// W3C WebSocket open event handler
//
W3CWebSocketClient.prototype._onOpen = function() {
  this.socketDidOpen = true;
  this.socketEventEmitter.emit('open');
};

// W3C WebSocket close event handler
//
W3CWebSocketClient.prototype._onClose = function() {
  this.socketEventEmitter.emit('close');
};

// W3C WebSocket error event handler
//
W3CWebSocketClient.prototype._onError = function(error) {
  if (this.socketDidOpen) {
    this.socketEventEmitter.emit('error', error);
  } else {
    this.socketEventEmitter.emit('connectFailed', error);
  }
};

// W3C WebSocket error event handler
//
W3CWebSocketClient.prototype._onMessage = function(message) {
  this.socketEventEmitter.emit('message', message);
};

// W3C WebSocket transport for JSTP
//   socket - WebSocket instance
//   socketEventEmitter - an EventEmitter that proxies socket events
//
function W3CWebSocketTransport(socket, socketEventEmitter) {
  events.EventEmitter.call(this);

  this.socket = socket;
  this.socketEventEmitter = socketEventEmitter;

  common.forwardMultipleEvents(socketEventEmitter, this, [
    'close',
    'error'
  ]);

  this.socketEventEmitter.on('message', this._onMessage.bind(this));
}

util.inherits(W3CWebSocketTransport, events.EventEmitter);
ws.W3CWebSocketTransport = W3CWebSocketTransport;

// Get the address of a remote host
//
W3CWebSocketTransport.prototype.getRemoteAddress = function() {
  return this.socket.url;
};

// Send data over the connection
//   data - Buffer or string
//
W3CWebSocketTransport.prototype.send = function(data) {
  if (Buffer.isBuffer(data)) {
    data = data.toString();
  }

  this.socket.send(data);
};

// End the connection optionally sending the last chunk of data
//   data - Buffer or string (optional)
//
W3CWebSocketTransport.prototype.end = function(data) {
  if (data) {
    this.send(data);
  }

  this.socket.close();
};

// WebSocket message handler
//   message - WebSocket message
//
W3CWebSocketTransport.prototype._onMessage = function(message) {
  var data = typeof(message.data) === 'string' ?
    message.data :
    new Buffer(message.data).toString();

  this.emit('data', '[' + data + ']');
};
