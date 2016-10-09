'use strict';

var events = require('events');
var util = require('util');

var client = {};
module.exports = client;

// JSTP client
//   transport - JSTP transport
//   applicationProvider - application API provider
//
function Client(transport, applicationProvider) {
  events.EventEmitter.call(this);

  this.transport = transport;
  this.applicationProvider = applicationProvider;
}

util.inherits(Client, events.EventEmitter);

// Get application API
//
Client.prototype.getApplication = function() {
  return this.applicationProvider.getApplication();
};
