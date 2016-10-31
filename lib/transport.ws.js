'use strict';

var events = require('events');
var http = require('http');
var https = require('https');
var util = require('util');

var websocket = require('websocket');

var common = require('./common');
var Server = require('./server');
var Client = require('./client');

var WebSocketServer = websocket.server;
var WebSocketClient = websocket.client;

var PROTOCOL_NAME = 'metarhia-jstp';

var ws = {};
module.exports = ws;

// Create a JSTP server bound to a WebSocket server
//   config - HTTP/HTTPS and WebSocket servers config
//   appsProvider - server applications provider
//   authProvider - authentication provider
//   originCheckStrategy - a function that checks the origin of a WebSocket
//     request and returns a boolean indicating whether to allow it (optional)
//
ws.createServer = function(config, appsProvider,
                           authProvider, originCheckStrategy) {
  var secure = false;

  if (typeof(config) === 'number') {
    config = { port: config };
  } else if (config.key && config.cert) {
    secure = true;
  }

  var httpServer = secure ?
    https.createServer(config) :
    http.createServer();

  httpServer.on('request', httpRequestHandler);

  var wsServer = new JstpWebSocketServer(httpServer,
    config, originCheckStrategy);
  var jstpServer = new Server(wsServer, appsProvider, authProvider);

  return jstpServer;
};

// Create a JSTP client that will transfer data over a WebSocket connection
//   config - WebSocket client config
//   appProvider - client application provider
//
ws.createClient = function(config, appProvider) {
  if (typeof(config) === 'string') {
    config = { url: config };
  }

  var wsClient = new JstpWebSocketClient(config);
  var jstpClient = new Client(wsClient, appProvider);

  return jstpClient;
};

// HTTP requests handler for the HTTP/HTTPS server WebSocket server is bound to
//  request - HTTP request
//  response - HTTP response
//
function httpRequestHandler(request, response) {
  response.writeHead(400);
  response.end();
}

// WebSocket server for JSTP server
//   httpServer - HTTP/HTTPS server instance
//   config - HTTP/HTTPS and WebSocket servers config
//   originCheckStrategy - a function that checks the origin of a WebSocket
//     request and returns a boolean indicating whether to allow it (optional)
//
function JstpWebSocketServer(httpServer, config, originCheckStrategy) {
  events.EventEmitter.call(this);

  this.httpServer = httpServer;
  this.config = common.extend(config, {
    httpServer: httpServer,
    autoAcceptConnections: false
  });
  this.isOriginAllowed = originCheckStrategy || ws.allowAllOriginCheckStrategy;

  common.forwardMultipleEvents(httpServer, this, [
    'listening',
    'close',
    'error'
  ]);

  this.wsServer = new WebSocketServer(this.config);
  this.wsServer.on('request', this._onRequest.bind(this));
}

util.inherits(JstpWebSocketServer, events.EventEmitter);
ws.JstpWebSocketServer = JstpWebSocketServer;

// Switch the server into listening state
//   callback - callback function (optional)
//
JstpWebSocketServer.prototype.listen = function(callback) {
  this.httpServer.listen(this.config.port, callback);
};

// Stop listening for connections
//   callback - callback function (optional)
//
JstpWebSocketServer.prototype.close = function(callback) {
  this.httpServer.close(callback);
};

// Create a JSTP transport from a WebSocket connection
//   connection - WebSocket connection
//
JstpWebSocketServer.prototype.createTransport = function(connection) {
  return new WebSocketTransport(connection);
};

// WebSocket request handler
//   request - WebSocket request
//
JstpWebSocketServer.prototype._onRequest = function(request) {
  if (!this.isOriginAllowed(request.origin)) {
    request.reject();
    return;
  }

  var connection = request.accept(PROTOCOL_NAME, request.origin);
  this.emit('connection', connection);
};

// Default originCheckStrategy value for ws.createClient and
// JstpWebSocketServer constructor
//
ws.allowAllOriginCheckStrategy = function(/* origin */) {
  return true;
};

// Client WebSocket connection for JSTP
//   config - WebSocket client configuration
//
function JstpWebSocketClient(config) {
  events.EventEmitter.call(this);

  this.config = config;
  this.wsClient = new WebSocketClient(config);
  this.connection = null;
}

util.inherits(JstpWebSocketClient, events.EventEmitter);
ws.JstpWebSocketClient = JstpWebSocketClient;

// Connect to the server
//  callback - callback function
//
JstpWebSocketClient.prototype.connect = function(callback) {
  if (this.connection) {
    return callback(new Error('Already connected'));
  }

  this.wsClient.once('connect', function(connection) {
    this.connection = connection;
    this.connection.on('error', this._onError.bind(this));

    callback();
  }.bind(this));

  this.wsClient.once('connectFailed', function(error) {
    callback(error);
  });

  this.wsClient.connect(this.config.url, PROTOCOL_NAME);
};

// Disconnect from the server
//
JstpWebSocketClient.prototype.disconnect = function() {
  this.connection.close();
  this.connection = null;
};

// Create a JSTP transport from the underlying WebSocket connection
//
JstpWebSocketClient.prototype.createTransport = function() {
  if (!this.connection) {
    throw new Error('Not connected yet');
  }

  return new WebSocketTransport(this.connection);
};

// Connection error handler
//   error - error that has occured
//
JstpWebSocketClient.prototype._onError = function(error) {
  this.connection.drop();
  this.connection = null;

  this.emit('error', error);
};

// WebSocket transport for JSTP
//   connection - WebSocket connection
//
function WebSocketTransport(connection) {
  events.EventEmitter.call(this);

  this.connection = connection;

  this.connection.on('message', this._onMessage.bind(this));
  this.connection.on('close', this._onClose.bind(this));
  this.connection.on('error', this._onError.bind(this));
}

util.inherits(WebSocketTransport, events.EventEmitter);
ws.WebSocketTransport = WebSocketTransport;

// Get the address of a remote host
//
WebSocketTransport.prototype.getRemoteAddress = function() {
  return this.connection.remoteAddress;
};

// Send data over the connection
//   data - Buffer or string
//
WebSocketTransport.prototype.send = function(data) {
  if (Buffer.isBuffer(data)) {
    data = data.toString();
  }

  this.connection.sendUTF(data);
};

// End the connection optionally sending the last chunk of data
//   data - Buffer or string (optional)
//
WebSocketTransport.prototype.end = function(data) {
  if (data) {
    this.send(data);
  }

  this.close();
};

// WebSocket message handler
//   message - WebSocket message
//
WebSocketTransport.prototype._onMessage = function(message) {
  var data = message.type === 'utf8' ?
    message.utf8Data :
    message.binaryData.toString();

  this.emit('data', '[' + data + ']');
};

// Connection close handler
//
WebSocketTransport.prototype._onClose = function() {
  this.emit('close');
};

// Connection error handler
//   error - error that has occured
//
WebSocketTransport.prototype._onError = function(error) {
  this.connection.drop();
  this.emit('error', error);
};
