'use strict';

var common = require('./common');
var servers = require('./server');

servers.start(function() {
  common.runScript('clients-launcher', function(error) {
    if (error) {
      throw error;
    }

    servers.stop();
  });
});
