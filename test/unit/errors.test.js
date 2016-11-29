'use strict';

var expect = require('chai').expect;

var jstp = require('../..');
var RemoteError = jstp.RemoteError;

describe('RemoteError', function() {
  describe('instance', function() {
    it('must be a subclass of Error', function() {
      var error = new RemoteError(1);
      expect(error).to.be.an.instanceof(Error);
    });

    it('must have error name equal to \'RemoteError\'', function() {
      var error = new RemoteError(1);
      expect(error.name).to.equal('RemoteError');
    });

    it('must have the \'code\' property', function() {
      var error = new RemoteError(42);
      expect(error.code).to.equal(42);
    });

    it('must accept an optional message', function() {
      var message = 'Sample message';
      var error = new RemoteError(1, message);
      expect(error.message).to.equal(message);
    });

    it('must use a default message when the message is not specified and ' +
       'the error code is known', function() {
      var error = new RemoteError(10);
      expect(error.message).to.be.a('string');
    });

    it('must use the code as a message when the message is not specified ' +
       'and the error code is unknown', function() {
      var error = new RemoteError(42);
      expect(error.message).to.equal('42');
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
      var error = RemoteError.fromJstpArray([jstp.ERR_APP_NOT_FOUND]);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(jstp.ERR_APP_NOT_FOUND);
      expect(error.message).to.equal(
        RemoteError.defaultMessages[jstp.ERR_APP_NOT_FOUND]);
    });

    it('must create an error without description', function() {
      var error = RemoteError.fromJstpArray([42]);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(42);
      expect(error.message).to.equal('42');
    });

    it('must create an error with description', function() {
      var error = RemoteError.fromJstpArray([42, 'Message']);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(42);
      expect(error.message).to.equal('Message');
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
      expect(array).to.eql([1, 'TypeError: Invalid argument']);
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
      expect(array).to.eql([1, 'Sample message']);
    });
  });

  it('must have predefined protocol errors', function() {
    var errors = Object.keys(jstp).filter(function(key) {
      return key.startsWith('ERR_');
    }).map(function(key) {
      return jstp[key].toString();
    });

    expect(RemoteError.defaultMessages).to.contain.keys(errors);
  });
});
