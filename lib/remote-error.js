'use strict';

var util = require('util');

module.exports = RemoteError;

// JSTP remote error class
// TODO: implement RPC stacktrace
//   code - error code
//   message - optional error message
//
function RemoteError(code, message) {
  message = message || RemoteError.defaultMessages[code] || code;
  Error.call(this, message);

  this.code = code;
  this.name = 'RemoteError';
}

util.inherits(RemoteError, Error);

// Convert a RemoteError instance to array representing an error in JSTP
// packets
//
RemoteError.prototype.toJstpArray = function() {
  if (this.message && !RemoteError.defaultMessages.hasOwnProperty(this.code)) {
    return [this.code, this.message];
  } else {
    return [this.code];
  }
};

// Factory method that creates a RemoteError instance from a JSTP array
//   array - array in the form of [code, description]
//
RemoteError.fromJstpArray = function(array) {
  return new RemoteError(array[0], array[1]);
};

// Prepare an error to be sent in a JSTP packet
//   error - an error to prepare (instance of Error, RemoteError, a string or
//           a regular JavaScript array of error code and error description)
//
RemoteError.getJstpArrayFor = function(error) {
  if (error instanceof RemoteError) {
    return error.toJstpArray();
  } else if (Array.isArray(error)) {
    return error;
  } else if (typeof(error) === 'string') {
    return [0, error];
  } else {
    return [0, error.toString()];
  }
};

// Default messages for predefined error codes
//
RemoteError.defaultMessages = {
  10: 'Application not found',
  11: 'Authentication failed',
  12: 'Interface not found',
  13: 'Incompatible interface',
  14: 'Method not found',
  15: 'Not a server'
};

RemoteError.APP_NOT_FOUND = new RemoteError(10);
RemoteError.AUTH_FAILED = new RemoteError(11);
RemoteError.INTERFACE_NOT_FOUND = new RemoteError(12);
RemoteError.INTERFACE_INCOMPATIBLE = new RemoteError(13);
RemoteError.METHOD_NOT_FOUND = new RemoteError(14);
RemoteError.NOT_A_SERVER = new RemoteError(15);
