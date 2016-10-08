'use strict';

var events = require('events');
var util = require('util');

var server = {};
module.exports = server;

// JSTP server
//   transport - transport provider
//   applications - application APIs provider
//   auth - authentication provider
//
function Server(transport, applications, auth) {
  events.EventEmitter.call(this);

  this.transport = transport;
  this.applications = applications;
  this.auth = auth;

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
