'use strict';

var crypto = require('crypto');
var events = require('events');

// Simple generic authentication provider. You are free to implement
// whatever suits your needs instead.
//
var simpleAuthProvider = new events.EventEmitter();
module.exports = simpleAuthProvider;

// Start anonymous session
//   connection - JSTP connection
//   application - application instance
//   callback - callback function that has signature (error, sessionId)
//
simpleAuthProvider.startAnonymousSession =
  function(connection, application, callback) {
    var uuid = generateUuid4();
    var sessionId = uuidToString(uuid);

    this.emit('session', sessionId, connection, application);
    callback(null, sessionId);
  };

// Start authenticated session
//   connection - JSTP connection
//   application - application instance
//   username - user login
//   password - user password
//   callback - callback function that has signature (error, sessionId)
//
simpleAuthProvider.startAuthenticatedSession =
  // eslint-disable-next-line no-unused-vars
  function(connection, application, username, password, callback) {
    throw new Error('You must implement your own authentication provider ' +
      'to be able to use password authentication in JSTP');
  };

// Generate UUID v4 and return a Buffer
//
function generateUuid4() {
  var VERSION_POS = 6;
  var Y_POS = 8;

  var Y_VALUES_SHIFTED = [0x80, 0x90, 0xA0, 0xB0];
  var Y_VALUES_COUNT = Y_VALUES_SHIFTED.length;

  var bytes = crypto.randomBytes(128);

  bytes[VERSION_POS] &= 0x0F;
  bytes[VERSION_POS] |= 0x40;

  var byteAtY = bytes[Y_POS];
  bytes[Y_POS] = byteAtY & 0x0F | Y_VALUES_SHIFTED[byteAtY % Y_VALUES_COUNT];

  return bytes;
}

// Get the canonical string representation of a UUID
//   uuid - 16-byte Buffer containing the UUID
//
function uuidToString(uuid) {
  var chunks = [
    uuid.readUIntBE(0, 4),
    uuid.readUIntBE(4, 2),
    uuid.readUIntBE(6, 2),
    uuid.readUIntBE(8, 2),
    uuid.readUIntBE(10, 6)
  ];

  return chunks.map(function(chunk) {
    var hex = chunk.toString(16);
    if (hex.length % 2) {
      hex = '0' + hex;
    }
    return hex;
  }).join('-');
}
