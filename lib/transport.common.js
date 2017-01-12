'use strict';

const common = {};
module.exports = common;

// Check if the client is in the connected state and throw an error otherwise
//
common.ensureClientConnected = (client) => {
  if (!client.isConnected) {
    throw new Error('Not connected yet');
  }
};
