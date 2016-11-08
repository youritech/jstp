'use strict';

var jstp = require('../../..');
var constants = require('../constants');

var common = require('../../../lib/common');

// Application mock
//
var applicationMock = {
  name: constants.TEST_APPLICATION,

  callMethod: function(connection, interfaceName, methodName, args) {
    if (interfaceName !== constants.TEST_INTERFACE) {
      throw new jstp.RemoteError(jstp.ERR_INTERFACE_NOT_FOUND);
    }

    if (methodName in applicationMock &&
        common.startsWith(methodName, 'method')) {
      applicationMock[methodName].apply(null, args);
    } else {
      throw new jstp.RemoteError(jstp.ERR_METHOD_NOT_FOUND);
    }
  },

  getMethods: function(interfaceName) {
    if (interfaceName === constants.TEST_INTERFACE) {
      return Object.keys(applicationMock).filter(function(key) {
        return common.startsWith(key, 'method');
      });
    }
  },

  method1: function(callback) {
    callback();
  },

  method2: function(first, second, callback) {
    callback(null, first + second);
  },

  method3: function(callback) {
    callback(new Error('Example error'));
  },

  method4: function() {
    throw new Error('Internal error');
  }
};

module.exports = applicationMock;
