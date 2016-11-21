'use strict';

var common = require('./lib/common');

var jstp = {};
module.exports = jstp;

common.extend(jstp,
  require('./lib/record-serialization'),
  require('./lib/object-serialization'),
  require('./lib/errors'),
  require('./lib/applications')
);

jstp.RemoteProxy = require('./lib/remote-proxy');
jstp.Connection = require('./lib/connection');
jstp.Server = require('./lib/server');

jstp.tcp = require('./lib/transport.tcp');
jstp.ws = require('./lib/transport.ws');

jstp.simpleAuth = require('./lib/simple-auth');
