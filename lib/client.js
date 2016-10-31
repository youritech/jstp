'use strict';

var events = require('events');
var util = require('util');

var common = require('./common');
var Connection = require('./connection');

module.exports = Client;

// JSTP client
//   rawClient - underlying network client
//   applicationProvider - application provider
//
function Client(rawClient, applicationProvider) {
  events.EventEmitter.call(this);

  this.rawClient = rawClient;
  this.applicationProvider = applicationProvider;

  common.forwardEvent(rawClient, this, 'error');
}

util.inherits(Client, events.EventEmitter);

// Connect to a server
//   callback - callback function
//
Client.prototype.connect = function(callback) {
  this.rawClient.connect(function(error) {
    if (error) {
      return callback(error);
    }

    var transport = this.rawClient.createTransport();
    var connection = new Connection(transport, null, this);

    callback(null, connection);
  });
};

// Connect from the server
//   callback - callback function
//
Client.prototype.disconnect = function(callback) {
  this.rawClient.disconnect(callback);
};

// Get the application
//
Client.prototype.getApplication = function() {
  return this.applicationProvider.getApplication();
};
