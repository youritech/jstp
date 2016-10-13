'use strict';

// JSRD utilities

var JSRD = {};

JSRD.getField = function(data, metadata, field) {
  var i = 0;
  for (var key in metadata) {
    if (key === field) {
      return data[i];
    }
    i++;
  }
};

JSRD.setField = function(data, metadata, field, value) {
  var i = 0;
  for (var key in metadata) {
    if (key === field) {
      data[i] = value;
    }
    i++;
  }
};

// JSRD and JSRM usage example

var data = ['Marcus Aurelius', 'AE127095'];
var metadata = { name: 'string', passport: '[string(8)]' };
var name = JSRD.getField(data, metadata, 'name');
console.log('Name = ' + name);
JSRD.setField(data, metadata, 'name', 'Marcus');
console.dir(data);
