'use strict';

var events = require('events');
var chai = require('chai');
var chaiSpies = require('chai-spies');

var Connection = require('..').Connection;

var expect = chai.expect;
chai.use(chaiSpies);

describe('JSTP Connection', function() {
  // Transport mock
  //
  var transportMock = new events.EventEmitter();
  transportMock.buffer = '';

  transportMock.getRemoteAddress = function() {
    return '127.0.0.1';
  };

  transportMock.addDataToBuffer = function(data) {
    if (data instanceof Buffer) {
      data = data.toString();
    }

    transportMock.buffer += data;

    if (data.endsWith('}')) {
      transportMock.buffer += ',';
    }
  };

  transportMock.isBufferReady = function() {
    return transportMock.buffer.length > 0 &&
      transportMock.buffer.endsWith(',');
  };

  transportMock.getBufferContent = function() {
    return '[' + transportMock.buffer + ']';
  };

  transportMock.send = function(data) {  // eslint-disable-line no-unused-vars
  };

  transportMock.end = function(data) {
    if (data) {
      transportMock.send(data);
    }
  };

  // Server mock
  //
  var serverMock = new events.EventEmitter();

  serverMock.startAuthenticatedSession = function(connection, application,
      username, password, callback) {

  };

  serverMock.startAnonymousSession = function(connection, application,
      callback) {

  };

  serverMock.getApplication = function(applicationName) {

  };

  var clientMock = new events.EventEmitter();

  // Client mock
  //
  clientMock.getApplication = function() {

  };

  var serverConnection;
  var clientConnection;

  beforeEach(function() {
    serverConnection = new Connection(transportMock, serverMock);
    clientConnection = new Connection(transportMock, null, clientMock);
  });

  it('should send anonymous handshake for the first time from a client',
    function() {
      chai.spy.on(transportMock, 'send');

      var callback = chai.spy.on(function() {
        transportMock.send.restore();
      });

      clientConnection.handshake('testApp', null, null, callback);
      transportMock.emit('data',
        '{handshake:[0],ok:\'12892e85-5bd7-4c77-a0c5-a0aecfcbc93a\'}');

      expect(transportMock.send)
        .to.be.called.with('{handshake:[0,\'testApp\']}');

      expect(callback).to.be.called();
    });
});
