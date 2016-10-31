'use strict';

var constants = require('../constants');

// Authentication provider mock
//
var authProviderMock = {};

authProviderMock.startAnonymousSession =
  function(connection, application, callback) {
    callback(null, constants.TEST_SESSION_ID);
  };

authProviderMock.startAuthenticatedSession =
  function(connection, application, username, password, callback) {
    if (username === constants.TEST_USERNAME &&
        password === constants.TEST_PASSWORD) {
      callback(null, constants.TEST_SESSION_ID);
    } else {
      callback(new Error('Invalid credentials'));
    }
  };

module.exports = authProviderMock;
