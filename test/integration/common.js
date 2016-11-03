'use strict';

var childProcess = require('child_process');
var path = require('path');

var common = {};
module.exports = common;

common.TCP_PORT = 3000;
common.WS_PORT = 8080;

common.fatal = function(message) {
  console.error(message);
  process.exit(1);
};

common.runScript = function(script, callback) {
  var scriptPath = path.join(__dirname, script);
  var callbackCalled = false;
  var process = childProcess.fork(scriptPath);

  process.on('error', function(error) {
    invokeCallback(error);
  });

  process.on('exit', function(code) {
    var error = code === 0 ?
      null :
      new Error('Child process failed with exit code ' + code);

    invokeCallback(error);
  });

  function invokeCallback(error) {
    if (callbackCalled) {
      return;
    }

    callbackCalled = true;

    callback(error);
  }
};
