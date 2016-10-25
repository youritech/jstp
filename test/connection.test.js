'use strict';

var events = require('events');
var util = require('util');

var chai = require('chai');
var chaiSpies = require('chai-spies');

var jstp = require('..');

var expect = chai.expect;
chai.use(chaiSpies);

// Constants

var TEST_APPLICATION = 'testApp';
var TEST_INTERFACE = 'testInterface';
var TEST_USERNAME = 'user';
var TEST_PASSWORD = 'password';
var TEST_SESSION_ID = '12892e85-5bd7-4c77-a0c5-a0aecfcbc93a';
var TEST_EVENT = 'testEvent';

// Application mock
//
var applicationMock = {
  name: TEST_APPLICATION,

  callMethod: function(connection, interfaceName, methodName, args) {
    if (interfaceName !== TEST_INTERFACE) {
      throw new jstp.RemoteError(jstp.ERR_INTERFACE_NOT_FOUND);
    }

    if (methodName in applicationMock && methodName.startsWith('method')) {
      applicationMock[methodName].apply(null, args);
    } else {
      throw new jstp.RemoteError(jstp.ERR_METHOD_NOT_FOUND);
    }
  },

  getMethods: function(interfaceName) {
    if (interfaceName === TEST_INTERFACE) {
      return Object.keys(applicationMock).filter(function(key) {
        return key.startsWith('method');
      });
    }
  },

  method1: function(callback) {
    callback();
  },

  method2: function(first, second, callback) {
    callback(null, first + second);
  },

  method3: function(callback) {
    callback(new Error('Example error'));
  },

  method4: function() {
    throw new Error('Internal error');
  }
};

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

TransportMock.prototype.addDataToBuffer = function(data) {
  if (data instanceof Buffer) {
    data = data.toString();
  }

  this.buffer += data;

  if (data.endsWith('}')) {
    this.buffer += ',';
  }
};

TransportMock.prototype.isBufferReady = function() {
  return this.buffer.length > 0 && this.buffer.endsWith(',');
};

TransportMock.prototype.getBufferContent = function() {
  var packets = '[' + this.buffer + ']';
  this.buffer = '';

  return packets;
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

// Server mock
//
function ServerMock() {
  events.EventEmitter.call(this);
}

util.inherits(ServerMock, events.EventEmitter);

ServerMock.prototype.startAuthenticatedSession =
  function(connection, application, username, password, callback) {
    if (application.name !== TEST_APPLICATION) {
      return callback(new jstp.RemoteError(jstp.ERR_APP_NOT_FOUND));
    }

    if (username !== TEST_USERNAME || password !== TEST_PASSWORD) {
      return callback(new jstp.RemoteError(jstp.ERR_AUTH_FAILED));
    }

    callback(null, TEST_SESSION_ID);
  };

ServerMock.prototype.startAnonymousSession =
  function(connection, application, callback) {
    if (application.name !== TEST_APPLICATION) {
      return callback(new jstp.RemoteError(jstp.ERR_APP_NOT_FOUND));
    }

    callback(null, TEST_SESSION_ID);
  };

ServerMock.prototype.getApplication = function(applicationName) {
  if (applicationName === TEST_APPLICATION) {
    return applicationMock;
  }
};

// Client mock
//
function ClientMock() {
  events.EventEmitter.call(this);
}

util.inherits(ClientMock, events.EventEmitter);

ClientMock.prototype.getApplication = function() {
  return applicationMock;
};

// Connection tests
//
describe('JSTP Connection', function() {
  var serverTransportMock;
  var clientTransportMock;
  var serverMock;
  var clientMock;
  var serverConnection;
  var clientConnection;

  function performHandshakeFromClient(callback) {
    clientConnection.handshake(TEST_APPLICATION, null, null, callback);
    clientTransportMock.emit('data',
      '{handshake:[0],ok:\'' + TEST_SESSION_ID + '\'}');
  }

  function emulateHandshakeOnServer() {
    serverTransportMock.emit('data',
      '{handshake:[0,\'' + TEST_APPLICATION + '\']}');
  }

  function testPacketSending(packetType, test) {
    var description = 'must send ' + packetType + ' packets';

    it(description + ' (client)', function() {
      performHandshakeFromClient(function() {
        test(clientConnection, clientTransportMock);
      });
    });

    it(description + ' (server)', function() {
      emulateHandshakeOnServer();
      test(serverConnection, serverTransportMock);
    });
  }

  beforeEach(function() {
    clientTransportMock = new TransportMock();
    serverTransportMock = new TransportMock();

    serverMock = new ServerMock();
    clientMock = new ClientMock();

    serverConnection = new jstp.Connection(serverTransportMock, serverMock);
    clientConnection =
      new jstp.Connection(clientTransportMock, null, clientMock);
  });

  describe('handshake', function() {
    it('must send anonymous handshake from a client', function() {
      chai.spy.on(clientTransportMock, 'send');

      var callback = chai.spy(function(error, sessionId) {
        expect(error).to.not.exist;
        expect(sessionId).to.equal(TEST_SESSION_ID);

        expect(clientConnection.authenticated).to.be.false;
        expect(clientConnection.handshakeDone).to.be.true;

        clientTransportMock.send.reset();
      });

      clientConnection.handshake(TEST_APPLICATION, null, null, callback);

      expect(clientTransportMock.send)
        .to.be.called.with('{handshake:[0,\'' + TEST_APPLICATION + '\']}');

      clientTransportMock.emit('data',
        '{handshake:[0],ok:\'' + TEST_SESSION_ID + '\'}');

      expect(callback).to.be.called();
    });

    it('must send authenticated handshake from a client', function() {
      chai.spy.on(clientTransportMock, 'send');

      var callback = chai.spy(function(error, sessionId) {
        expect(error).to.not.exist;
        expect(sessionId).to.equal(TEST_SESSION_ID);

        expect(clientConnection.authenticated).to.be.true;
        expect(clientConnection.handshakeDone).to.be.true;

        clientTransportMock.send.reset();
      });

      clientConnection.handshake(TEST_APPLICATION,
        TEST_USERNAME, TEST_PASSWORD, callback);

      expect(clientTransportMock.send).to.be.called.with('{handshake:[0,\'' +
        TEST_APPLICATION + '\'],' + TEST_USERNAME + ':\'' +
        TEST_PASSWORD + '\'}');

      clientTransportMock.emit('data',
        '{handshake:[0],ok:\'' + TEST_SESSION_ID + '\'}');

      expect(callback).to.be.called();
    });

    it('must handle inexistent application error', function() {
      var callback = chai.spy(function(error, sessionId) {
        expect(error.code).to.equal(jstp.ERR_APP_NOT_FOUND);
        expect(sessionId).to.not.exist;

        expect(clientConnection.authenticated).to.be.false;
        expect(clientConnection.handshakeDone).to.be.false;
      });

      clientConnection.handshake('invalidApp', 'user', 'password', callback);
      clientTransportMock.emit('data', '{handshake:[0],error:[10]}');
      expect(callback).to.be.called();
    });

    it('must handle authentication error', function() {
      var callback = chai.spy(function(error, sessionId) {
        expect(error.code).to.equal(jstp.ERR_AUTH_FAILED);
        expect(sessionId).to.not.exist;

        expect(clientConnection.authenticated).to.be.false;
        expect(clientConnection.handshakeDone).to.be.false;
      });

      clientConnection.handshake(TEST_APPLICATION,
        TEST_USERNAME, TEST_PASSWORD, callback);

      clientTransportMock.emit('data', '{handshake:[0],error:[11]}');
      expect(callback).to.be.called();
    });

    it('must process anonymous handshake packets on server', function() {
      var sendSpy = chai.spy.on(serverTransportMock, 'send');
      var startSessisionSpy = chai.spy.on(serverMock, 'startAnonymousSession');

      serverTransportMock.emit('data', jstp.stringify({
        handshake: [0, TEST_APPLICATION]
      }));

      expect(sendSpy).to.have.been.called.with(jstp.stringify({
        handshake: [0],
        ok: TEST_SESSION_ID
      }));

      expect(startSessisionSpy).to.have.been.called.with(
        serverConnection, applicationMock);

      sendSpy.reset();
      startSessisionSpy.reset();
    });

    it('must process authenticated handshake packets on a server', function() {
      var sendSpy = chai.spy.on(serverTransportMock, 'send');
      var startSessisionSpy =
        chai.spy.on(serverMock, 'startAuthenticatedSession');

      var packet = {
        handshake: [0, TEST_APPLICATION],
      };

      packet[TEST_USERNAME] = TEST_PASSWORD;

      serverTransportMock.emit('data', jstp.stringify(packet));

      expect(sendSpy).to.have.been.called.with(jstp.stringify({
        handshake: [0],
        ok: TEST_SESSION_ID
      }));

      expect(startSessisionSpy).to.have.been.called.with(
        serverConnection, applicationMock, TEST_USERNAME, TEST_PASSWORD);

      sendSpy.reset();
      startSessisionSpy.reset();
    });

    it('must process handshake packets with invalid credentials', function() {
      var sendSpy = chai.spy.on(serverTransportMock, 'end');
      var startSessisionSpy =
        chai.spy.on(serverMock, 'startAuthenticatedSession');

      var packet = {
        handshake: [0, TEST_APPLICATION],
      };

      var password = 'illegal password';

      packet[TEST_USERNAME] = password;

      serverTransportMock.emit('data', jstp.stringify(packet));

      expect(sendSpy).to.have.been.called.with(jstp.stringify({
        handshake: [0],
        error: [jstp.ERR_AUTH_FAILED]
      }));

      expect(startSessisionSpy).to.have.been.called.with(
        serverConnection, applicationMock, TEST_USERNAME, password);

      sendSpy.reset();
      startSessisionSpy.reset();
    });

    it('must not process handshakes on a client', function() {
      var sendSpy = chai.spy.on(clientTransportMock, 'send');

      var packet = {
        handshake: [0, TEST_APPLICATION],
      };

      clientTransportMock.emit('data', jstp.stringify(packet));

      expect(sendSpy).to.have.been.called.with(jstp.stringify({
        handshake: [0],
        error: [jstp.ERR_NOT_A_SERVER]
      }));

      sendSpy.reset();
    });
  });

  describe('inspect', function() {
    var methods = Object.keys(applicationMock).filter(function(key) {
      return key.startsWith('method');
    });

    testPacketSending('inspect', function(connection, transport) {
      var packetId;

      var sendSpy = chai.spy(function(data) {
        var packet = jstp.parse(data);

        expect(packet).to.have.all.keys(['inspect']);
        expect(packet.inspect).to.be.an('array');

        packetId = packet.inspect[0];
        expect(packet.inspect[1]).to.equal(TEST_INTERFACE);
      });

      var callback = chai.spy(function(error, proxy) {
        expect(error).to.not.exist;
        expect(proxy).to.be.an.instanceof(jstp.RemoteProxy);
      });

      transport.on('dataSent', sendSpy);

      connection.inspect(TEST_INTERFACE, callback);
      expect(sendSpy).to.have.been.called();

      transport.emit('data', jstp.stringify({
        callback: [packetId],
        ok: methods
      }));

      expect(callback).to.have.been.called();
    });

    it('must process inspect packets', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        inspect: [1, TEST_INTERFACE]
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        ok: methods
      }));

      sendSpy.reset();
    });

    it('must return an error when interface does not exist', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        inspect: [1, 'no interface like that']
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [jstp.ERR_INTERFACE_NOT_FOUND]
      }));

      sendSpy.reset();
    });
  });

  describe('call', function() {
    testPacketSending('call', function(connection, transport) {
      var packetId;

      var sendSpy = chai.spy(function(data) {
        var packet = jstp.parse(data);

        expect(packet).to.have.all.keys(['call', 'method1']);
        expect(packet.call).to.be.an('array');

        packetId = packet.call[0];
        expect(packet.call[1]).to.equal(TEST_INTERFACE);
      });

      var callback = chai.spy(function(error, result) {
        expect(error).to.not.exist;
        expect(result).to.equal(42);
      });

      transport.on('dataSent', sendSpy);

      connection.call(TEST_INTERFACE, 'method1', [], callback);
      expect(sendSpy).to.have.been.called();

      transport.emit('data', jstp.stringify({
        callback: [packetId],
        ok: [42]
      }));

      expect(callback).to.have.been.called();
    });

    it('must process a method call with no arguments and result', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        call: [1, TEST_INTERFACE],
        method1: []
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        ok: []
      }));

      sendSpy.reset();
    });

    it('must process a method call with arguments and a result', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        call: [1, TEST_INTERFACE],
        method2: [10, 20]
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        ok: [30]
      }));

      sendSpy.reset();
    });

    it('must process a method call that returns an error', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        call: [1, TEST_INTERFACE],
        method3: []
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [0, 'Error: Example error']
      }));

      sendSpy.reset();
    });

    it('must process a method that throws an error', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      expect(function() {
        serverTransportMock.emit('data', jstp.stringify({
          call: [1, TEST_INTERFACE],
          method4: []
        }));
      }).to.throw();

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [jstp.ERR_INTERNAL_API_ERROR]
      }));

      sendSpy.reset();
    });

    it('must return an error when an interface does not exist', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        call: [1, 'dummy interface'],
        method1: []
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [jstp.ERR_INTERFACE_NOT_FOUND]
      }));

      sendSpy.reset();
    });

    it('must return an error when a method does not exist', function() {
      emulateHandshakeOnServer();

      var sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emit('data', jstp.stringify({
        call: [1, TEST_INTERFACE],
        methodThatDoesNotExist: []
      }));

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [jstp.ERR_METHOD_NOT_FOUND]
      }));

      sendSpy.reset();
    });
  });

  describe('callback', function() {
    testPacketSending('callback', function(connection, transport) {
      var sendSpy = chai.spy(function(data) {
        var packet = jstp.parse(data);

        expect(packet).to.contain.all.keys(['callback']);
        expect(packet).to.contain.any.keys(['ok', 'error']);

        if (packet.ok) {
          expect(packet.callback).to.eql([10]);
          expect(packet.ok).to.eql([42]);
        } else {
          expect(packet.callback).to.eql([11]);
          expect(packet.error).to.eql([jstp.ERR_METHOD_NOT_FOUND]);
        }
      });

      transport.on('dataSent', sendSpy);

      connection.callback(10, null, [42]);
      connection.callback(11, new jstp.RemoteError(jstp.ERR_METHOD_NOT_FOUND));

      expect(sendSpy).to.have.been.called.twice;
    });

    it('must process a callback packet with a result', function() {
      var callback = chai.spy(function(error, result) {
        expect(error).to.not.exist;
        expect(result).to.equal('result');
      });

      performHandshakeFromClient(function() {
        clientConnection.call(TEST_INTERFACE, 'method', [], callback);

        clientTransportMock.emit('data', jstp.stringify({
          callback: [1],
          ok: ['result']
        }));

        expect(callback).to.be.called();
      });
    });

    it('must process a callback packet with an error', function() {
      var callback = chai.spy(function(error) {
        expect(error).to.be.an.instanceof(jstp.RemoteError);
        expect(error.code).to.equal(jstp.ERR_INTERNAL_API_ERROR);
      });

      performHandshakeFromClient(function() {
        clientConnection.call(TEST_INTERFACE, 'method', [], callback);

        clientTransportMock.emit('data', jstp.stringify({
          callback: [1],
          error: [jstp.ERR_INTERNAL_API_ERROR]
        }));

        expect(callback).to.be.called();
      });
    });
  });

  describe('event', function() {
    testPacketSending('event', function(connection, transport) {
      var eventArgs = { arg: 'value' };

      var sendSpy = chai.spy(function(data) {
        var packet = jstp.parse(data);
        expect(packet).to.have.all.keys(['event', TEST_EVENT]);

        expect(packet.event).to.be.an('array');
        expect(packet.event[0]).to.be.a('number');
        expect(packet.event[1]).to.equal(TEST_INTERFACE);

        expect(packet[TEST_EVENT]).to.eql(eventArgs);
      });

      transport.on('dataSent', sendSpy);

      connection.event(TEST_INTERFACE, TEST_EVENT, eventArgs);
      expect(sendSpy).to.have.been.called();
    });

    it('must process event packets', function() {
      var payload = { key: 'value' };

      var event = {
        event: [-1, TEST_INTERFACE]
      };

      event[TEST_EVENT] = payload;

      var handler = chai.spy(function(eventArgs) {
        expect(eventArgs.interfaceName).to.equal(TEST_INTERFACE);
        expect(eventArgs.remoteEventName).to.equal(TEST_EVENT);
        expect(eventArgs.remoteEventArgs).to.eql(payload);
      });

      clientConnection.on('event', handler);

      performHandshakeFromClient(function() {
        clientTransportMock.emit('data', jstp.stringify(event));
        expect(handler).to.be.called();
      });
    });
  });

  describe('state', function() {
    testPacketSending('state', function(connection, transport) {
      var sendSpy = chai.spy(function(data) {
        var packet = jstp.parse(data);
        expect(packet).to.have.all.keys(['state', 'inc']);
        expect(packet.state).to.be.an('array');
      });

      transport.on('dataSent', sendSpy);

      connection.state('stats.connections', 'inc', 1);
      expect(sendSpy).to.have.been.called();
    });

    it('must process state packets', function() {
      var handler = chai.spy(function(stateChange) {
        expect(stateChange.path).to.equal('counter');
        expect(stateChange.verb).to.equal('inc');
        expect(stateChange.value).to.equal(1);
      });

      clientConnection.on('state', handler);

      performHandshakeFromClient(function() {
        clientTransportMock.emit('data', jstp.stringify({
          state: [-1, 'counter'],
          inc: 1
        }));

        expect(handler).to.be.called();
      });
    });
  });
});
