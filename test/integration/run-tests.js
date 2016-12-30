'use strict';

const common = require('./common');
const servers = require('./server');

servers.start(() => {
  common.runScript('clients-launcher', (error) => {
    if (error) {
      throw error;
    }

    servers.stop();
  });
});
