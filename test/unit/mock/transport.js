'use strict';

var events = require('events');
var util = require('util');

module.exports = TransportMock;

// Transport mock
//
function TransportMock() {
  events.EventEmitter.call(this);
  this.buffer = '';
  this.closed = false;
}

util.inherits(TransportMock, events.EventEmitter);

TransportMock.prototype.getRemoteAddress = function() {
  return '127.0.0.1';
};

TransportMock.prototype.send = function(data) {
  if (!this.closed) {
    this.emit('dataSent', data);
  }
};

TransportMock.prototype.end = function(data) {
  if (data) {
    this.send(data);
  }

  this.closed = true;
  this.emit('close');
};

TransportMock.prototype.emitPacket = function(packet) {
  this.emit('packet', packet);
};
