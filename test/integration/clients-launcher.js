'use strict';

var common = require('./common');

var CLIENTS_COUNT = 50;

var childProcesses = [];

for (var i = 0; i < CLIENTS_COUNT; i++) {
  var process = common.runScript('client', function(error) {
    if (error) {
      childProcesses.forEach(function(process) {
        process.kill();
      });

      throw error;
    }
  });

  childProcesses.push(process);
}
