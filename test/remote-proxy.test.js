'use strict';

var chai = require('chai');
var chaiSpies = require('chai-spies');

var RemoteProxy = require('..').RemoteProxy;

var expect = chai.expect;
chai.use(chaiSpies);

describe('RemoteProxy', function() {
  var proxy;

  var connectionMock = {
    call: function(interfaceName, methodName, args, callback) {
      var results = { method1: 'result1', method2: 'result2' };
      callback(results[methodName]);
    },

    event: function() { },

    processEventPacket: function() {
      proxy.emit('testEvent', 'payload', true);
    }
  };

  var callSpy;
  var eventSpy;

  beforeEach(function() {
    callSpy = chai.spy.on(connectionMock, 'call');
    eventSpy = chai.spy.on(connectionMock, 'event');

    proxy = new RemoteProxy(connectionMock,
      'testInterface', ['method1', 'method2']);
  });

  afterEach(function() {
    callSpy.reset();
    eventSpy.reset();
  });

  it('must call remote methods', function() {
    var callback1 = chai.spy();
    var callback2 = chai.spy();

    proxy.method1(callback1);
    expect(callSpy).to.have.been.called.with(
      'testInterface', 'method1', [], callback1);

    proxy.method2(1, 2, 3, callback2);
    expect(callSpy).to.have.been.called.with(
      'testInterface', 'method2', [1, 2, 3], callback2);

    expect(callSpy).to.have.been.called.exactly(2);

    expect(callback1).to.have.been.called.exactly(1);
    expect(callback1).to.have.been.called.with('result1');

    expect(callback2).to.have.been.called.exactly(1);
    expect(callback2).to.have.been.called.with('result2');
  });

  it('must emit events through the network and locally', function() {
    var handler = chai.spy();
    proxy.on('testEvent', handler);
    proxy.emit('testEvent', 'payload');

    expect(eventSpy).to.have.been.called.exactly(1);
    expect(eventSpy).to.have.been.called.with(
      'testInterface', 'testEvent', 'payload');

    expect(handler).to.have.been.called.exactly(1);
    expect(handler).to.have.been.called.with('payload');
  });

  it('must not re-emit events back', function() {
    var handler = chai.spy();
    proxy.on('testEvent', handler);
    connectionMock.processEventPacket();

    expect(handler).to.have.been.called.with('payload');
    expect(eventSpy).to.not.have.been.called();
  });
});
