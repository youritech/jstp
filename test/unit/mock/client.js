'use strict';

const events = require('events');
const util = require('util');

const applicationMock = require('./application');

module.exports = ClientMock;

// Client mock
//
function ClientMock() {
  events.EventEmitter.call(this);

  this.application = applicationMock;
}

util.inherits(ClientMock, events.EventEmitter);
