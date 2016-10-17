/* global api */
'use strict';

var Connection;

var events = require('events');

if (typeof(require) === 'undefined') {
  Connection = api.jstp.Connection;
} else {
  Connection = require('..').Connection;
  var expect = require('expect.js');
  var sinon = require('sinon');
}

describe('JSTP Connection', function() {
  var transportMock = new events.EventEmitter();

  var serverMock = new events.EventEmitter();

  var clientMock = new events.EventEmitter();

  var serverConnection;
  var clientConnection;

  beforeEach(function() {
    serverConnection = new Connection(transportMock, serverMock);
    clientConnection = new Connection(transportMock, null, clientMock);
  });
});
