'use strict';

var events = require('events');
var util = require('util');

var common = require('./common');
var Connection = require('./connection');
var simpleAuth = require('./simple-auth');

var HANDSHAKE_TIMEOUT = 3000;

module.exports = Server;

// JSTP server
//   rawServer - an underlying server or its adapter
//   applicationsProvider - applications provider
//   authCallback - authentication callback
//
function Server(rawServer, applicationsProvider, authCallback) {
  events.EventEmitter.call(this);

  this.rawServer = rawServer;
  this.applications = applicationsProvider;
  this.startSession = authCallback || simpleAuth.startSession;

  this.clients = {};
  this._cachedClientsArray = [];

  this.on('connect', this._onClientConnect.bind(this));
  this.on('disconnect', this._onClientDisconnect.bind(this));

  rawServer.on('connection', this._onRawConnection.bind(this));

  common.forwardMultipleEvents(rawServer, this, [
    'listening',
    'close',
    'error'
  ]);
}

util.inherits(Server, events.EventEmitter);

// Switch the server into the listening state, if the underlying server
// supports such operation. In some cases, for example, when a JSTP server has
// been created on top of existing WebSocket connection, this function does
// nothing apart from calling a callback.
//   callback - callback function (optional)
//
Server.prototype.listen = function(callback) {
  this.rawServer.listen(callback);
};

// Stop listening for connections and shut down the server
//
Server.prototype.close = function() {
  this.rawServer.close();

  Object.keys(this.clients).forEach(function(cid) {
    var connection = this.clients[cid];
    connection.close();
  });
};

// Get all clients as an array of JSTP connection instances
//
Server.prototype.getClients = function() {
  if (this._cachedClientsArray.length === 0) {
    this._cachedClientsArray = Object.keys(this.clients).map(function(cid) {
      return this.clients[cid];
    });
  }

  return this._cachedClientsArray;
};

// Get an application
//   applicationName - name of the application to get
//
Server.prototype.getApplication = function(applicationName) {
  return this.applications.getApplication(applicationName);
};

// Handler of a new connection event emitter from the underlying server
//   socket - a lower-level socket or connection
//
Server.prototype._onRawConnection = function(socket) {
  var connection = new Connection(this.rawServer.createTransport(socket), this);

  connection.setTimeout(HANDSHAKE_TIMEOUT, function() {
    if (!connection.handshakeDone) {
      connection.close();
      this.emit('handshakeTimeout', connection, this);
    }
  });
};

// Client connection event handler
//   connection - JSTP connection instance
//
Server.prototype._onClientConnect = function(connection) {
  this.clients[connection.id] = connection;
  this._cachedClientsArray.push(connection);

  connection.on('error', function(error) {
    this.emit('connectionError', error, connection);
  }.bind(this));
};

// Client connection close event handler
//   connection - JSTP connection instance
//
Server.prototype._onClientDisconnect = function(connection) {
  delete this.clients[connection.id];
  this._cachedClientsArray = [];
};
