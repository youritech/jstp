/* global api */
'use strict';

var RemoteProxy;

if (typeof(require) === undefined) {
  RemoteProxy = api.jstp.RemoteProxy;
} else {
  RemoteProxy = require('..').RemoteProxy;
  var expect = require('expect.js');
  var sinon = require('sinon');
}

describe('RemoteProxy', function() {
  var proxy;

  var connectionMock = {
    call: function(interfaceName, methodName, args, callback) {
      var results = { method1: 'result1', method2: 'result2' };
      callback(results[methodName]);
    },

    event: function() { },

    processEventPacket: function() {
      proxy.emit('testInterface', 'testEvent', 'payload', true);
    }
  };

  var callSpy;
  var eventSpy;

  beforeEach(function() {
    callSpy = sinon.spy(connectionMock, 'call');
    eventSpy = sinon.spy(connectionMock, 'event');

    proxy = new RemoteProxy(connectionMock,
      'testInterface', ['method1', 'method2']);
  });

  afterEach(function() {
    callSpy.restore();
    eventSpy.restore();
  });

  it('must call remote methods', function() {
    var callback1 = sinon.spy();
    var callback2 = sinon.spy();

    proxy.method1(callback1);
    proxy.method2(1, 2, 3, callback2);

    expect(callSpy.callCount).to.be(2);

    expect(callSpy.firstCall.args).to.eql([
      'testInterface', 'method1', [], callback1
    ]);

    expect(callSpy.secondCall.args).to.eql([
      'testInterface', 'method2', [1, 2, 3], callback2
    ]);

    expect(callback1.callCount).to.be(1);
    expect(callback1.firstCall.args).to.eql(['result1']);

    expect(callback2.callCount).to.be(1);
    expect(callback2.firstCall.args).to.eql(['result2']);
  });

  it('must emit events through the network and locally', function() {
    var handler = sinon.spy();
    proxy.on('testEvent', handler);
    proxy.emit('testEvent', 'payload');

    expect(eventSpy.callCount).to.be(1);
    expect(eventSpy.firstCall.args).to.eql([
      'testInterface', 'testEvent', 'payload'
    ]);

    expect(handler.callCount).to.be(1);
    expect(handler.firstCall.args).to.eql(['payload']);
  });

  it('must not re-emit events back', function() {
    var handler = sinon.spy();
    proxy.on('testEvent', handler);

    connectionMock.processEventPacket();
    expect(handler.callCount).to.be(0);
  });
});
