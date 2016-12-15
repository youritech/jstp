'use strict';

var common = require('./common');
var sock = require('./transport.socket');

var ipc = {};
module.exports = ipc;

// Create a JSTP client bound to a Unix Domain Socket
//   config - socket server config
//   applications - applications index
//   authCallback - authentication callback
//
ipc.createServer = function(config, applications, authCallback) {
  if (typeof(config) === 'string') {
    config = { path: config };
  }
  if (!config.path) {
    throw new Error('Socket path must be specified');
  }
  if (config.port) {
    config = common.extend({}, config);
    delete config.port;
  }
  return sock.createServer(config, applications, authCallback);
};

// Create a JSTP client bound to a Unix Domain Socket
//   config - network client config
//   application - client application
//
ipc.createClient = function(config, application) {
  if (typeof(config) === 'string') {
    config = { path: config };
  }
  if (!config.path) {
    throw new Error('Socket path must be specified');
  }
  return sock.createClient(config, application);
};
