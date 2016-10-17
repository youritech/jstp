'use strict';

var common = require('./lib/common');

var jstp = {};
module.exports = jstp;

common.extend(jstp,
  require('./lib/record-serialization'),
  require('./lib/object-serialization')
);

jstp.RemoteError = require('./lib/remote-error');
