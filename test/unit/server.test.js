'use strict';

var chai = require('chai');
var chaiSpies = require('chai-spies');

var jstp = require('../..');

var RawServerMock = require('./mock/raw-server');
var appsProvider = require('./mock/apps-provider')
  .createServerApplicationsProviderMock();

var expect = chai.expect;
chai.use(chaiSpies);

var rawServer = new RawServerMock();

var server = new jstp.Server(rawServer, appsProvider);

describe('Server', function() {
  it('must forward listen call to raw server', function() {
    var spy = chai.spy.on(rawServer, 'listen');

    server.listen();
    expect(spy).to.be.called();

    spy.reset();
  });

  it('must forward getApplication call to applications provider', function() {
    var spy = chai.spy.on(appsProvider, 'getApplication');

    server.getApplication('testApp');
    expect(spy).to.be.called();

    spy.reset();
  });

  it('must have dynamically created startSession method',
    function() {
      expect(server.startSession).to.be.a('function');
    });

  // TODO: test getClients(), broadcast(),
  //       emit('connect', connection), emit('connection', socket)
});
