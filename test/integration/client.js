'use strict';

var jstp = require('../..');
var common = require('./common');

var clientAppProvider = new jstp.ClientApplicationProvider('testApp', {});

var tcpClient = jstp.tcp.createClient({
  host: 'localhost',
  port: common.TCP_PORT
}, clientAppProvider);

console.log('Connecting a client via TCP');
tcpClient.connectAndInspect('testApp', null, null,
  ['testInterface'], onConnect.bind(null, tcpClient));

tcpClient.on('error', function(error) {
  common.fatal('TCP client error: ' + error);
});

var wsClient = jstp.ws.createClient({
  url: 'ws://localhost:' + common.WS_PORT
}, clientAppProvider);

console.log('Connecting a client via WebSocket');
wsClient.connectAndInspect('testApp', null, null,
  ['testInterface'], onConnect.bind(null, wsClient));

wsClient.on('error', function(error) {
  common.fatal('WebSocket client error: ' + error);
});

function onConnect(client, error, connection, sessionId, api) {
  if (error) {
    common.fatal('Could not connect: ' + error);
  }

  console.log('Connected, session ID is', sessionId);

  connection.on('error', function(error) {
    common.fatal('Connection error: ' +  error);
  });

  var methodsCalled = 0;

  function disconnectIfComplete() {
    if (++methodsCalled === 2) {
      console.log('Disconnecting client');
      client.disconnect();
    }
  }

  api.testInterface.add(2, 3, function(error, result) {
    if (error) {
      common.fatal(error);
    }

    console.log('RPC result for add:', result);
    disconnectIfComplete();
  });

  api.testInterface.sayHi(function(error, result) {
    if (error) {
      common.fatal(error);
    }

    console.log('RPC result for sayHi:', result);
    disconnectIfComplete();
  });
}
