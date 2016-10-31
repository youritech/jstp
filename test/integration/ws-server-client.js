'use strict';

var metasync = require('metasync');

var jstp = require('../..');

console.log('WebSocket server/client integration test');

var application = new jstp.Application('testApp', {
  testInterface: {
    add: function(first, second, callback) {
      callback(null, first + second);
    },

    sayHi: function(callback) {
      callback(null, 'hi');
    }
  }
});

console.log('Starting the server');

var serverAppsProvider = new jstp.ServerApplicationsProvider();
serverAppsProvider.registerApplication(application);

var server = jstp.ws.createServer({ port: 3000 },
  serverAppsProvider, jstp.simpleAuthProvider);

server.listen();

console.log('Connecting the client');

var clientAppProvider = new jstp.ClientApplicationProvider(application);

var client = jstp.ws.createClient('ws://localhost:3000', clientAppProvider);

client.connectAndInspect('testApp', null, null, ['testInterface'], onConnect);

function onConnect(error, connection, sessionId, api) {
  if (error) {
    fatal(error);
  }

  console.log('Connected, session ID is', sessionId);

  var collector = new metasync.DataCollector(2, function() {
    console.log('Disconnecting client');
    client.disconnect();

    console.log('Stopping server');
    server.close();
  });

  api.testInterface.add(2, 3, function(error, result) {
    if (error) {
      fatal(error);
    }

    console.log('RPC result for add:', result);
    collector.collect(1);
  });

  api.testInterface.sayHi(function(error, result) {
    if (error) {
      fatal(error);
    }

    console.log('RPC result for sayHi:', result);
    collector.collect(2);
  });
}

function fatal(error) {
  console.error(error);
  process.exit(1);
}
