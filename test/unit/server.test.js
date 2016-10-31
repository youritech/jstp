'use strict';

var chai = require('chai');
var chaiSpies = require('chai-spies');

var jstp = require('../..');

var RawServerMock = require('./mock/raw-server');
var appsProvider = require('./mock/apps-provider')
  .createServerApplicationsProviderMock();
var authProvider = require('./mock/auth-provider');

var expect = chai.expect;
chai.use(chaiSpies);

var rawServer = new RawServerMock();

var server = new jstp.Server(rawServer, appsProvider, authProvider);

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

  it('must forward startAnonymousSession call to authentication provider',
    function() {
      var spy = chai.spy.on(authProvider, 'startAnonymousSession');

      server.startAnonymousSession(null, null, function() {});
      expect(spy).to.be.called();

      spy.reset();
    });

  it('must forward startAuthenticatedSession call to authentication provider',
    function() {
      var spy = chai.spy.on(authProvider, 'startAuthenticatedSession');

      server.startAuthenticatedSession(null, null, null, null, function() {});
      expect(spy).to.be.called();

      spy.reset();
    });

  // TODO: test getClients(), broadcast(),
  //       emit('connect', connection), emit('connection', socket)
});
