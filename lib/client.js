'use strict';

var events = require('events');
var util = require('util');

var metasync = require('metasync');

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
  }.bind(this));
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

// Helper methods that calls 'connect' and then performs handshake
//   appName - name of the application to connect to
//     (see Connection#handshake(appName, username, password, callback))
//   username - user login (or null for anonymous session)
//   password - user password (or null for anonymous session)
//   callback - callback function with signature (error, connection, sessionId)
//
Client.prototype.connectAndHandshake =
  function(appName, username, password, callback) {
    this.connect(function(error, connection) {
      if (error) {
        return callback(error);
      }

      connection.handshake(appName, username, password, function(error, sid) {
        if (error) {
          return callback(error);
        }

        callback(null, connection, sid);
      });
    });
  };

// Helper methods that calls 'connect', performs handshake and loads
// introspection of specified interfaces
//   appName - name of the application to connect to
//     (see Connection#handshake(appName, username, password, callback))
//   username - user login (or null for anonymous session)
//   password - user password (or null for anonymous session)
//   interfaces - array of names of interfaces to inspect
//   callback - callback function with signature
//     (error, connection, sessionId, api)
//
Client.prototype.connectAndInspect =
  function(appName, username, password, interfaces, callback) {
    this.connectAndHandshake(appName, username, password,
      handshakeCallback.bind(this, interfaces, callback));
  };

// Internal function, part of Client#connectAndInspect method
//
function handshakeCallback(interfaces, callback, error, connection, sid) {
  if (error) {
    return callback(error);
  }

  var errors = {};

  var collector = new metasync.DataCollector(interfaces.length, function(api) {
    if (Object.keys(errors) > 0) {
      api._errors = errors;
    }

    callback(null, connection, sid, api);
  });

  interfaces.forEach(function(interfaceName) {
    connection.inspect(interfaceName, function(error, appInterface) {
      if (error) {
        appInterface = null;
        errors[interfaceName] = error;
      }

      collector.collect(interfaceName, appInterface);
    });
  });
}
