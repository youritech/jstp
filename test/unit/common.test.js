'use strict';

const events = require('events');

const chai = require('chai');
const chaiSpies = require('chai-spies');

const common = require('../../lib/common');

chai.use(chaiSpies);
const expect = chai.expect;

describe('Common functions library', () => {
  describe('forwardEvent', () => {
    it('must forward a single event', () => {
      const sourceEventEmitter = new events.EventEmitter();
      const targetEventEmitter = new events.EventEmitter();

      const spy = chai.spy();

      common.forwardEvent(sourceEventEmitter, targetEventEmitter, 'testEvent');
      targetEventEmitter.on('testEvent', spy);

      sourceEventEmitter.emit('testEvent');
      expect(spy).to.be.called();
    });

    it('must forward a single event under a new name', () => {
      const sourceEventEmitter = new events.EventEmitter();
      const targetEventEmitter = new events.EventEmitter();

      const spy = chai.spy();

      common.forwardEvent(sourceEventEmitter, targetEventEmitter,
        'testEvent', 'renamedEvent');
      targetEventEmitter.on('renamedEvent', spy);

      sourceEventEmitter.emit('testEvent');
      expect(spy).to.be.called();
    });
  });

  describe('forwardMultipleEvents', () => {
    it('must forward multiple events', () => {
      const sourceEventEmitter = new events.EventEmitter();
      const targetEventEmitter = new events.EventEmitter();

      const firstSpy = chai.spy();
      const secondSpy = chai.spy();

      common.forwardMultipleEvents(sourceEventEmitter, targetEventEmitter, [
        'event1',
        'event2'
      ]);

      targetEventEmitter.on('event1', firstSpy);
      targetEventEmitter.on('event2', secondSpy);

      sourceEventEmitter.emit('event1');
      sourceEventEmitter.emit('event2');

      expect(firstSpy).to.be.called();
      expect(secondSpy).to.be.called();
    });
  });
});
