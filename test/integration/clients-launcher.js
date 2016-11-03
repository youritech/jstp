'use strict';

var common = require('./common');

var CLIENTS_COUNT = 50;

for (var i = 0; i < CLIENTS_COUNT; i++) {
  common.runScript('client', function(error) {
    if (error) {
      throw error;
    }
  });
}
