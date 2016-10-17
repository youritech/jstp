/* global api */
'use strict';

var RemoteError;

if (typeof(require) === 'undefined') {
  RemoteError = api.jstp.RemoteError;
} else {
  RemoteError = require('..').RemoteError;
  var expect = require('expect.js');
}

describe('RemoteError', function() {
  describe('instance', function() {
    it('must be a subclass of Error', function() {
      var error = new RemoteError(0);
      expect(error).to.be.an(Error);
    });

    it('must have error name equal to \'RemoteError\'', function() {
      var error = new RemoteError(0);
      expect(error.name).to.be('RemoteError');
    });

    it('must have the \'code\' property', function() {
      var error = new RemoteError(42);
      expect(error.code).to.be(42);
    });

    it('must accept an optional message', function() {
      var message = 'Sample message';
      var error = new RemoteError(0, message);
      expect(error.message).to.be(message);
    });

    it('must use a default message when the message is not specified and ' +
       'the error code is known', function() {
      var error = new RemoteError(10);
      expect(error.message).to.be.a('string');
    });

    it('must use the code as a message when the message is not specified ' +
       'and the error code is unknown', function() {
      var error = new RemoteError(42);
      expect(error.message).to.be('42');
    });
  });

  describe('toJstpArray', function() {
    it('must return an array with the only element which is error code ' +
       'for known errors', function() {
      [ new RemoteError(10),
        new RemoteError(10, 'Application not found')
      ].forEach(function(error) {
        expect(error.toJstpArray()).to.eql([10]);
      });
    });

    it('must return an array of code and message for unknown errors',
      function() {
        var error = new RemoteError(42, 'Sample message');
        expect(error.toJstpArray()).to.eql([42, 'Sample message']);
      });

    it('must return a one-element array with error code if the error message ' +
       'is missing', function() {
      var error = new RemoteError(42);
      expect(error.toJstpArray()).to.eql([42]);
    });
  });

  describe('fromJstpArray', function() {
    it('must create a standard error', function() {
      var error = RemoteError.fromJstpArray([10]);
      expect(error).to.be.a(RemoteError);
      expect(error.code).to.be(10);
      expect(error.message).to.be(RemoteError.APP_NOT_FOUND.message);
    });

    it('must create an error without description', function() {
      var error = RemoteError.fromJstpArray([42]);
      expect(error).to.be.a(RemoteError);
      expect(error.code).to.be(42);
      expect(error.message).to.eql('42');
    });

    it('must create an error with description', function() {
      var error = RemoteError.fromJstpArray([42, 'Message']);
      expect(error).to.be.a(RemoteError);
      expect(error.code).to.be(42);
      expect(error.message).to.eql('Message');
    });
  });

  describe('getJstpArrayFor', function() {
    it('must return an an array for RemoteError', function() {
      var firstError = new RemoteError(10);
      var secondError = new RemoteError(42);
      var thirdError = new RemoteError(42, 'Sample message');

      expect(RemoteError.getJstpArrayFor(firstError)).to.eql([10]);
      expect(RemoteError.getJstpArrayFor(secondError)).to.eql([42]);
      expect(RemoteError.getJstpArrayFor(thirdError))
        .to.eql([42, 'Sample message']);
    });

    it('must return an array for Error', function() {
      var error = new TypeError('Invalid argument');
      var array = RemoteError.getJstpArrayFor(error);
      expect(array).to.eql([0, 'TypeError: Invalid argument']);
    });

    it('must return correctly formatted arrays untouched', function() {
      var error = [42, 'Sample message'];
      var array = RemoteError.getJstpArrayFor(error);
      expect(array).to.eql(error);
    });

    it('must return an array with error code for number', function() {
      var array = RemoteError.getJstpArrayFor(42);
      expect(array).to.eql([42]);
    });

    it('must return an array for string', function() {
      var array = RemoteError.getJstpArrayFor('Sample message');
      expect(array).to.eql([0, 'Sample message']);
    });
  });

  it('must have predefined protocol errors', function() {
    expect(RemoteError).to.have.keys([
      'APP_NOT_FOUND',
      'AUTH_FAILED',
      'INTERFACE_NOT_FOUND',
      'INTERFACE_INCOMPATIBLE',
      'METHOD_NOT_FOUND',
      'NOT_A_SERVER'
    ]);
  });
});
