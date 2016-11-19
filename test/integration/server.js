'use strict';

var jstp = require('../..');
var common = require('./common');

var servers = {};
module.exports = servers;

var application = new jstp.Application('testApp', {
  testInterface: {
    add: function(connection, first, second, callback) {
      callback(null, first + second);
    },

    sayHi: function(connection, callback) {
      callback(null, 'hi');
    }
  }
});

var serverAppsProvider = new jstp.ServerApplicationsProvider();
serverAppsProvider.registerApplication(application);

var tcpServer = jstp.tcp.createServer({ port: common.TCP_PORT },
  serverAppsProvider, jstp.simpleAuthProvider);

tcpServer.on('error', function(error) {
  common.fatal('TCP server error: ' + error);
});

var wsServer = jstp.ws.createServer({ port: common.WS_PORT },
  serverAppsProvider, jstp.simpleAuthProvider);

wsServer.on('error', function(error) {
  common.fatal('WebSocket server error: ' + error);
});

servers.start = function(callback) {
  var tcpStarted = false;
  var wsStarted = false;

  tcpServer.listen(function() {
    console.log('TCP server listening on port', common.TCP_PORT);
    tcpStarted = true;
    checkCompletion();
  });

  wsServer.listen(function() {
    console.log('WebSocket server listening on port', common.WS_PORT);
    wsStarted = true;
    checkCompletion();
  });

  function checkCompletion() {
    if (tcpStarted && wsStarted) {
      callback();
    }
  }
};

servers.stop = function() {
  console.log('Stopping TCP sever');
  tcpServer.close();

  console.log('Stopping WebSocket sever');
  wsServer.close();
};
