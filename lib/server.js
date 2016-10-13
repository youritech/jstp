'use strict';

var events = require('events');
var util = require('util');

var server = {};
module.exports = server;

// JSTP server
//   transport - transport provider
//   applicationsProvider - applications provider
//   authProvider - authentication provider
//
function Server(transport, applicationsProvider, authProvider) {
  events.EventEmitter.call(this);

  this.transport = transport;
  this.applications = applicationsProvider;
  this.auth = authProvider;

  this.clients = {};
  this._cachedClientsArray = [];

  this.on('connect', this.onClientConnect.bind(this));
  this.on('disconnect', this.onClientDisconnect.bind(this));
}

util.inherits(Server, events.EventEmitter);

// Client connection event handler
//   connection - JSTP connection instance
//
Server.prototype.onClientConnect = function(connection) {
  this.clients[connection.id] = connection;
  this._cachedClientsArray.push(connection);
};

// Client connection close event handler
//   connection - JSTP connection instance
//
Server.prototype.onClientDisconnect = function(connection) {
  delete this.clients[connection.id];
  this._cachedClientsArray = [];
};

// Get all clients as an array of JSTP connection instances
//
Server.prototype.getClients = function() {
  if (this._cachedClientsArray.length === 0) {
    for (var client in this.clients) {
      if (!this.clients.hasOwnProperty(client)) {
        continue;
      }
      this._cachedClientsArray.push(client);
    }
  }

  return this._cachedClientsArray;
};

// Broadcast a packet to all clients
//   data - packet to broadcast
//
Server.prototype.broadcast = function(data) {
  this.getClients().forEach(function(connection) {
    connection.send(data);
  });
};

// Get an application
//   applicationName - name of the application to get
//
Server.prototype.getApplication = function(applicationName) {
  return this.applications.getApplication(applicationName);
};

// Start an authenticated session
//   connection - JSTP connection
//   application - application to connect to
//   username - user login
//   password - user password
//   callback - callback function with the signature of (error, sessionId)
//
Server.prototype.startAuthenticatedSession =
  function(connection, application, username, password, callback) {
    this.auth.startAuthenticatedSession(connection, application,
      username, password, callback);
  };

// Start an anonymous session
//   connection - JSTP connection
//   application - application to connect to
//   callback - callback function with the signature of (error, sessionId)
//
Server.prototype.startAnonymousSession =
  function(connection, application, callback) {
    this.auth.startAnonymousSession(connection, application, callback);
  };
