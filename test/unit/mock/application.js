'use strict';

var jstp = require('../../..');
var constants = require('../constants');

// Application mock
//
var applicationMock = {
  name: constants.TEST_APPLICATION,

  callMethod: function(connection, interfaceName, methodName, args, callback) {
    if (interfaceName !== constants.TEST_INTERFACE) {
      return callback(jstp.ERR_INTERFACE_NOT_FOUND);
    }

    if (methodName in applicationMock && methodName.startsWith('method')) {
      applicationMock[methodName].apply(null,
        [connection].concat(args, callback));
    } else {
      return callback(jstp.ERR_METHOD_NOT_FOUND);
    }
  },

  getMethods: function(interfaceName) {
    if (interfaceName === constants.TEST_INTERFACE) {
      return Object.keys(applicationMock).filter(function(key) {
        return key.startsWith('method');
      });
    }
  },

  method1: function(connection, callback) {
    callback();
  },

  method2: function(connection, first, second, callback) {
    callback(null, first + second);
  },

  method3: function(connection, callback) {
    callback(new Error('Example error'));
  },

  method4: function() {
    throw new Error('Internal error');
  }
};

module.exports = applicationMock;
