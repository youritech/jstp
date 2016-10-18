'use strict';

var events = require('events');
var chai = require('chai');
var chaiSpies = require('chai-spies');

var Connection = require('..').Connection;

var expect = chai.expect;  // eslint-disable-line no-unused-vars
chai.use(chaiSpies);

describe('JSTP Connection', function() {
  var transportMock = new events.EventEmitter();

  var serverMock = new events.EventEmitter();

  var clientMock = new events.EventEmitter();

  var serverConnection;  // eslint-disable-line no-unused-vars
  var clientConnection;  // eslint-disable-line no-unused-vars

  beforeEach(function() {
    serverConnection = new Connection(transportMock, serverMock);
    clientConnection = new Connection(transportMock, null, clientMock);
  });
});
