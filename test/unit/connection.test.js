'use strict';

const chai = require('chai');
const chaiSpies = require('chai-spies');

const jstp = require('../..');

const constants = require('./constants');
const applicationMock = require('./mock/application');
const TransportMock = require('./mock/transport');
const ServerMock = require('./mock/server');
const ClientMock = require('./mock/client');

const expect = chai.expect;
chai.use(chaiSpies);

describe('JSTP Connection', () => {
  let serverTransportMock;
  let clientTransportMock;
  let serverMock;
  let clientMock;
  let serverConnection;
  let clientConnection;

  function performHandshakeFromClient(callback) {
    clientConnection.handshake(constants.TEST_APPLICATION,
      null, null, callback);

    clientTransportMock.emitPacket({
      handshake: [0],
      ok: constants.TEST_SESSION_ID
    });
  }

  function emulateHandshakeOnServer() {
    serverTransportMock.emitPacket({
      handshake: [0, constants.TEST_APPLICATION]
    });
  }

  function testPacketSending(packetType, test) {
    const description = 'must send ' + packetType + ' packets';

    it(description + ' (client)', () => {
      performHandshakeFromClient(() => {
        test(clientConnection, clientTransportMock);
      });
    });

    it(description + ' (server)', () => {
      emulateHandshakeOnServer();
      test(serverConnection, serverTransportMock);
    });
  }

  beforeEach(() => {
    clientTransportMock = new TransportMock();
    serverTransportMock = new TransportMock();

    serverMock = new ServerMock();
    clientMock = new ClientMock();

    serverConnection = new jstp.Connection(serverTransportMock, serverMock);
    clientConnection =
      new jstp.Connection(clientTransportMock, null, clientMock);
  });

  describe('inspect', () => {
    const methods = Object.keys(applicationMock).
      filter(key => key.startsWith('method'));

    testPacketSending('inspect', (connection, transport) => {
      let packetId;

      const sendSpy = chai.spy((data) => {
        const packet = jstp.parse(data);

        expect(packet).to.have.all.keys(['inspect']);
        expect(packet.inspect).to.be.an('array');

        packetId = packet.inspect[0];
        expect(packet.inspect[1]).to.equal(constants.TEST_INTERFACE);
      });

      const callback = chai.spy((error, proxy) => {
        expect(error).to.not.exist;
        expect(proxy).to.be.an.instanceof(jstp.RemoteProxy);
      });

      transport.on('dataSent', sendSpy);

      connection.inspectInterface(constants.TEST_INTERFACE, callback);
      expect(sendSpy).to.have.been.called();

      transport.emitPacket({
        callback: [packetId],
        ok: methods
      });

      expect(callback).to.have.been.called();
    });

    it('must process inspect packets', () => {
      emulateHandshakeOnServer();

      const sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emitPacket({
        inspect: [1, constants.TEST_INTERFACE]
      });

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        ok: methods
      }));

      sendSpy.reset();
    });

    it('must return an error when interface does not exist', () => {
      emulateHandshakeOnServer();

      const sendSpy = chai.spy.on(serverTransportMock, 'send');

      serverTransportMock.emitPacket({
        inspect: [1, 'no interface like that']
      });

      expect(sendSpy).to.be.called.with(jstp.stringify({
        callback: [1],
        error: [jstp.ERR_INTERFACE_NOT_FOUND]
      }));

      sendSpy.reset();
    });
  });

  describe('state', () => {
    testPacketSending('state', (connection, transport) => {
      const sendSpy = chai.spy((data) => {
        const packet = jstp.parse(data);
        expect(packet).to.have.all.keys(['state', 'inc']);
        expect(packet.state).to.be.an('array');
      });

      transport.on('dataSent', sendSpy);

      connection.notifyStateChange('stats.connections', 'inc', 1);
      expect(sendSpy).to.have.been.called();
    });

    it('must process state packets', () => {
      const handler = chai.spy((stateChange) => {
        expect(stateChange.path).to.equal('counter');
        expect(stateChange.verb).to.equal('inc');
        expect(stateChange.value).to.equal(1);
      });

      clientConnection.on('state', handler);

      performHandshakeFromClient(() => {
        clientTransportMock.emitPacket({
          state: [-1, 'counter'],
          inc: 1
        });

        expect(handler).to.be.called();
      });
    });
  });
});
