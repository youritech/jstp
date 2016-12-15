'use strict';

var url = require('url');
var common = require('./common');
var sock = require('./transport.socket');

var tcp = {};
module.exports = tcp;

// Create a JSTP server bound to TCP server
//   config - socket server config
//   applications - applications index
//   authCallback - authentication callback
//
tcp.createServer = function(config, applications, authCallback) {
  if (typeof(config) === 'number') {
    config = { port: config };
  }
  if (!config.port) {
    throw new Error('Port number must be specified');
  }
  if (config.path) {
    config = common.extend({}, config);
    delete config.path;
  }
  return sock.createServer(config, applications, authCallback);
};

// Create a JSTP client bound to a TCP socket
//   config - network client config
//   application - client application
//
tcp.createClient = function(config, application) {
  if (typeof(config) === 'string') {
    config = parseUrl(config);
  }
  if (!config.host || !config.port) {
    throw new Error('Host and port must be specified');
  }
  return sock.createClient(config, application);
};

function parseUrl(urlString) {
  var urlObject = url.parse(urlString);
  var config = {};

  if (urlObject.protocol === 'jstp') {
    config.secure = false;
  } else if (urlObject.protocol === 'jstps') {
    config.secure = true;
  } else {
    throw new Error('Invalid URL schema');
  }

  config.host = urlObject.hostname;
  config.port = urlObject.port;

  return config;
}
