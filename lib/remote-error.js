'use strict';

var util = require('util');

module.exports = RemoteError;

// JSTP remote error class
// TODO: implement RPC stacktrace
//   code - error code
//   message - optional error message
//
function RemoteError(code, message) {
  message = message || RemoteError.defaultMessages[code];
  Error.call(this, message);

  this.code = code;
  this.message = message;

  if (message) {
    this.jstpArray = [code, message];
  } else {
    this.message = code;
    this.jstpArray = [code];
  }

  this.name = 'RemoteError';
}

util.inherits(RemoteError, Error);

// Default messages for predefined error codes
//
RemoteError.defaultMessages = {
  10: 'Application not found',
  11: 'Authentication failed',
  12: 'Interface not found',
  13: 'Incompatible interface',
  14: 'Method not found'
};

RemoteError.APP_NOT_FOUND = new RemoteError(10);
RemoteError.AUTH_FAILED = new RemoteError(11);
RemoteError.INTERFACE_NOT_FOUND = new RemoteError(12);
RemoteError.INTERFACE_INCOMPATIBLE = new RemoteError(13);
RemoteError.METHOD_NOT_FOUND = new RemoteError(14);
