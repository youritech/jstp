'use strict';

const jstp = require('../..');
const common = require('./common');

const servers = {};
module.exports = servers;

const application = new jstp.Application('testApp', {
  testInterface: {
    add(connection, first, second, callback) {
      callback(null, first + second);
    },

    sayHi(connection, callback) {
      callback(null, 'hi');
    }
  }
});

const tcpServer = jstp.tcp.createServer(common.TCP_PORT, [application]);

tcpServer.on('error', (error) => {
  common.fatal('TCP server error: ' + error);
});

const ipcServer = jstp.ipc.createServer(common.UNIX_SOCKET, [application]);

ipcServer.on('error', (error) => {
  common.fatal('IPC server error: ' + error);
});

const wsServer = jstp.ws.createServer(common.WS_PORT, [application]);

wsServer.on('error', (error) => {
  common.fatal('WebSocket server error: ' + error);
});

servers.start = function(callback) {
  let tcpStarted = false;
  let ipcStarted = false;
  let wsStarted = false;

  tcpServer.listen(() => {
    console.log('TCP server listening on port', common.TCP_PORT);
    tcpStarted = true;
    checkCompletion();
  });

  ipcServer.listen(() => {
    console.log('IPC server listening on socket', common.UNIX_SOCKET);
    ipcStarted = true;
    checkCompletion();
  });

  wsServer.listen(() => {
    console.log('WebSocket server listening on port', common.WS_PORT);
    wsStarted = true;
    checkCompletion();
  });

  function checkCompletion() {
    if (tcpStarted && ipcStarted && wsStarted) {
      callback();
    }
  }
};

servers.stop = function() {
  console.log('Stopping TCP server');
  tcpServer.close();

  console.log('Stopping IPC server');
  ipcServer.close();

  console.log('Stopping WebSocket server');
  wsServer.close();
};
