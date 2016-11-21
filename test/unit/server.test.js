'use strict';

var chai = require('chai');
var chaiSpies = require('chai-spies');

var jstp = require('../..');

var RawServerMock = require('./mock/raw-server');
var applicationMock = require('./mock/application');

var expect = chai.expect;
chai.use(chaiSpies);

var rawServer = new RawServerMock();

var server = new jstp.Server(rawServer, [applicationMock]);

describe('Server', function() {
  it('must forward listen call to raw server', function() {
    var spy = chai.spy.on(rawServer, 'listen');

    server.listen();
    expect(spy).to.be.called();

    spy.reset();
  });

  it('must contain applications index', function() {
    expect(server.applications).to.be.an('object');
    expect(server.applications[applicationMock.name])
      .to.equal(applicationMock);
  });

  it('must have dynamically created startSession method',
    function() {
      expect(server.startSession).to.be.a('function');
    });

  // TODO: test getClients(), broadcast(),
  //       emit('connect', connection), emit('connection', socket)
});
