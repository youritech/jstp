'use strict';

const expect = require('chai').expect;

const jstp = require('../..');
const RemoteError = jstp.RemoteError;

describe('RemoteError', () => {
  describe('instance', () => {
    it('must be a subclass of Error', () => {
      const error = new RemoteError(1);
      expect(error).to.be.an.instanceof(Error);
    });

    it('must have error name equal to \'RemoteError\'', () => {
      const error = new RemoteError(1);
      expect(error.name).to.equal('RemoteError');
    });

    it('must have the \'code\' property', () => {
      const error = new RemoteError(42);
      expect(error.code).to.equal(42);
    });

    it('must accept an optional message', () => {
      const message = 'Sample message';
      const error = new RemoteError(1, message);
      expect(error.message).to.equal(message);
    });

    it('must use a default message when the message is not specified and ' +
       'the error code is known', () => {
      const error = new RemoteError(10);
      expect(error.message).to.be.a('string');
    });

    it('must use the code as a message when the message is not specified ' +
       'and the error code is unknown', () => {
      const error = new RemoteError(42);
      expect(error.message).to.equal('42');
    });
  });

  describe('toJstpArray', () => {
    it('must return an array with the only element which is error code ' +
       'for known errors', () => {
      [ new RemoteError(10),
        new RemoteError(10, 'Application not found')
      ].forEach((error) => {
        expect(error.toJstpArray()).to.eql([10]);
      });
    });

    it('must return an array of code and message for unknown errors',
      () => {
        const error = new RemoteError(42, 'Sample message');
        expect(error.toJstpArray()).to.eql([42, 'Sample message']);
      });

    it('must return a one-element array with error code if the error message ' +
       'is missing', () => {
      const error = new RemoteError(42);
      expect(error.toJstpArray()).to.eql([42]);
    });
  });

  describe('fromJstpArray', () => {
    it('must create a standard error', () => {
      const error = RemoteError.fromJstpArray([jstp.ERR_APP_NOT_FOUND]);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(jstp.ERR_APP_NOT_FOUND);
      expect(error.message).to.equal(
        RemoteError.defaultMessages[jstp.ERR_APP_NOT_FOUND]);
    });

    it('must create an error without description', () => {
      const error = RemoteError.fromJstpArray([42]);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(42);
      expect(error.message).to.equal('42');
    });

    it('must create an error with description', () => {
      const error = RemoteError.fromJstpArray([42, 'Message']);
      expect(error).to.be.an.instanceof(RemoteError);
      expect(error.code).to.equal(42);
      expect(error.message).to.equal('Message');
    });
  });

  describe('getJstpArrayFor', () => {
    it('must return an an array for RemoteError', () => {
      const firstError = new RemoteError(10);
      const secondError = new RemoteError(42);
      const thirdError = new RemoteError(42, 'Sample message');

      expect(RemoteError.getJstpArrayFor(firstError)).to.eql([10]);
      expect(RemoteError.getJstpArrayFor(secondError)).to.eql([42]);
      expect(RemoteError.getJstpArrayFor(thirdError))
        .to.eql([42, 'Sample message']);
    });

    it('must return an array for Error', () => {
      const error = new TypeError('Invalid argument');
      const array = RemoteError.getJstpArrayFor(error);
      expect(array).to.eql([1, 'TypeError: Invalid argument']);
    });

    it('must return correctly formatted arrays untouched', () => {
      const error = [42, 'Sample message'];
      const array = RemoteError.getJstpArrayFor(error);
      expect(array).to.eql(error);
    });

    it('must return an array with error code for number', () => {
      const array = RemoteError.getJstpArrayFor(42);
      expect(array).to.eql([42]);
    });

    it('must return an array for string', () => {
      const array = RemoteError.getJstpArrayFor('Sample message');
      expect(array).to.eql([1, 'Sample message']);
    });
  });

  it('must have predefined protocol errors', () => {
    const errors = Object.keys(jstp)
      .filter(key => key.startsWith('ERR_'))
      .map(key => jstp[key].toString());
    expect(RemoteError.defaultMessages).to.contain.keys(errors);
  });
});
