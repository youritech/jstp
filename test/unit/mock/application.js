'use strict';

const jstp = require('../../..');
const constants = require('../constants');

// Application mock
//
const applicationMock = {
  name: constants.TEST_APPLICATION,

  callMethod(connection, interfaceName, methodName, args, callback) {
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

  getMethods(interfaceName) {
    if (interfaceName === constants.TEST_INTERFACE) {
      return Object.keys(applicationMock)
        .filter(key => key.startsWith('method'));
    }
  },

  method1(connection, callback) {
    callback();
  },

  method2(connection, first, second, callback) {
    callback(null, first + second);
  },

  method3(connection, callback) {
    callback(new Error('Example error'));
  },

  method4() {
    throw new Error('Internal error');
  }
};

module.exports = applicationMock;
