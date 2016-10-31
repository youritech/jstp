'use strict';

var events = require('events');
var util = require('util');

var jstp = require('../../..');

var constants = require('../constants');
var applicationMock = require('./application');

module.exports = ServerMock;

// Server mock
//
function ServerMock() {
  events.EventEmitter.call(this);
}

util.inherits(ServerMock, events.EventEmitter);

ServerMock.prototype.listen = function(callback) {
  callback();
};

ServerMock.prototype.getClients = function() {
  return [];
};

ServerMock.prototype.broadcast = function() {  };

ServerMock.prototype.startAuthenticatedSession =
  function(connection, application, username, password, callback) {
    if (application.name !== constants.TEST_APPLICATION) {
      return callback(new jstp.RemoteError(jstp.ERR_APP_NOT_FOUND));
    }

    if (username !== constants.TEST_USERNAME ||
        password !== constants.TEST_PASSWORD) {
      return callback(new jstp.RemoteError(jstp.ERR_AUTH_FAILED));
    }

    callback(null, constants.TEST_SESSION_ID);
  };

ServerMock.prototype.startAnonymousSession =
  function(connection, application, callback) {
    if (application.name !== constants.TEST_APPLICATION) {
      return callback(new jstp.RemoteError(jstp.ERR_APP_NOT_FOUND));
    }

    callback(null, constants.TEST_SESSION_ID);
  };

ServerMock.prototype.getApplication = function(applicationName) {
  if (applicationName === constants.TEST_APPLICATION) {
    return applicationMock;
  }
};
