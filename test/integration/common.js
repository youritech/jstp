'use strict';

const childProcess = require('child_process');
const path = require('path');

const common = {};
module.exports = common;

common.TCP_PORT = 3000;
common.WS_PORT = 8080;
common.UNIX_SOCKET = 'jstp.sock';

common.fatal = function(message) {
  console.error(message);
  process.exit(1);
};

common.runScript = function(script, callback) {
  const scriptPath = path.join(__dirname, script);
  const process = childProcess.fork(scriptPath);
  let callbackCalled = false;

  process.on('error', (error) => {
    invokeCallback(error);
  });

  process.on('exit', (code) => {
    const error = code === 0 ?
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

  return process;
};
