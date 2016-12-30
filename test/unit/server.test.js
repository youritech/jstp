'use strict';

const chai = require('chai');
const chaiSpies = require('chai-spies');

const jstp = require('../..');

const RawServerMock = require('./mock/raw-server');
const applicationMock = require('./mock/application');

const expect = chai.expect;
chai.use(chaiSpies);

const rawServer = new RawServerMock();

const server = new jstp.Server(rawServer, [applicationMock]);

describe('Server', () => {
  it('must forward listen call to raw server', () => {
    const spy = chai.spy.on(rawServer, 'listen');

    server.listen();
    expect(spy).to.be.called();

    spy.reset();
  });

  it('must contain applications index', () => {
    expect(server.applications).to.be.an('object');
    expect(server.applications[applicationMock.name])
      .to.equal(applicationMock);
  });

  it('must have dynamically created startSession method',
    () => {
      expect(server.startSession).to.be.a('function');
    }
  );

  // TODO: test getClients(), broadcast(),
  //       emit('connect', connection), emit('connection', socket)
});
