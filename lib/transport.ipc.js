'use strict';

const sock = require('./transport.socket');

const ipc = {};
module.exports = ipc;

// Create a JSTP client bound to a Unix Domain Socket
//   config - socket server config
//   applications - applications index
//   authCallback - authentication callback
//
ipc.createServer = (config, applications, authCallback) => {
  if (typeof(config) === 'string') {
    config = { path: config };
  }
  if (!config.path) {
    throw new Error('Socket path must be specified');
  }
  if (config.port) {
    config = Object.assign({}, config);
    delete config.port;
  }
  return sock.createServer(config, applications, authCallback);
};

// Create a JSTP client bound to a Unix Domain Socket
//   config - network client config
//   application - client application
//
ipc.createClient = (config, application) => {
  if (typeof(config) === 'string') {
    config = { path: config };
  }
  if (!config.path) {
    throw new Error('Socket path must be specified');
  }
  return sock.createClient(config, application);
};
