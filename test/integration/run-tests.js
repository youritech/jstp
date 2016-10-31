'use strict';

var childProcess = require('child_process');
var path = require('path');

var metasync = require('metasync');

function runScript(script, callback) {
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

    console.log();
    callback(error);
  }
}

metasync.sequential([
  runScript.bind(null, 'tcp-server-client'),
  runScript.bind(null, 'ws-server-client')
], function(result) {
  if (result instanceof Error) {
    throw result;
  }
});
