'use strict';

const common = require('./common');

const CLIENTS_COUNT = 50;

const childProcesses = [];

for (let i = 0; i < CLIENTS_COUNT; i++) {
  const process = common.runScript('client', (error) => {
    if (error) {
      childProcesses.forEach((process) => {
        process.kill();
      });

      throw error;
    }
  });

  childProcesses.push(process);
}
