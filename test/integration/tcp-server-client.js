'use strict';

var jstp = require('../..');

console.log('TCP server/client integration test');

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

var server = jstp.tcp.createServer({ port: 3000 },
  serverAppsProvider, jstp.simpleAuthProvider);

server.listen();

console.log('Connecting the client');

var clientAppProvider = new jstp.ClientApplicationProvider(application);

var client = jstp.tcp.createClient({
  host: 'localhost',
  port: 3000
}, clientAppProvider);

client.connect(function(error, connection) {
  if (error) {
    fatal(error);
  }

  connection.handshake('testApp', null, null, function(error, sessionId) {
    if (error) {
      fatal(error);
    }

    console.log('Handshake done, session ID is', sessionId);
    console.log('Inspecting interface');

    connection.inspect('testInterface', function(error, proxy) {
      if (error) {
        fatal(error);
      }

      console.log('Calling methods');
      runMethods(proxy);
    });
  });
});

function runMethods(testInterface) {
  var firstMethod = false;
  var secondMethod = false;

  testInterface.add(2, 3, function(error, result) {
    if (error) {
      fatal(error);
    }

    console.log('RPC result for add:', result);

    firstMethod = true;
    exitIfReady();
  });

  testInterface.sayHi(function(error, result) {
    if (error) {
      fatal(error);
    }

    console.log('RPC result for sayHi:', result);

    secondMethod = true;
    exitIfReady();
  });

  function exitIfReady() {
    if (firstMethod && secondMethod) {
      console.log('Disconnecting client');
      client.disconnect();

      console.log('Stopping server');
      server.close();
    }
  }
}

function fatal(error) {
  console.error(error);
  process.exit(1);
}
