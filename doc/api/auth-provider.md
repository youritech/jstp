# Authentication providers

Authentication provider is an abstraction that allows you to connect your
authentication and session facilities to JSTP connections so that they will be
triggered by JSTP handshakes.

If you don't need such integration, then the default dummy
[`simpleAuthProvider`](#jstpsimpleauthprovider) can be used.

## Interface: IAuthenticationProvider

### provider.startAnonymousSession(connection, application, callback)

* `connection` {[Connection](connection.md#class-connection)}
  a connection that received a handshake packet.
* `application`
  {[IApplication](apps-provider.md#interface-iapplication)}
  application that a client wants to connect to.
* `callback` {Function}
    * `error` {null | Error | [`RemoteError`](errors.md#class-remoteerror)
      | Number | String} error to be sent as a response, if any.
    * `sessionId` {String} session ID.

Starts a new session without user credentials.

### provider.startAuthenticatedSession(connection, application, username, password, callback)

* `connection` {[Connection](connection.md#class-connection)}
  a connection that received a handshake packet.
* `application`
  {[IApplication](apps-provider.md#interface-iapplication)}
  application that a client wants to connect to.
* `username` {String} user login.
* `password` {String} user password.
* `callback` {Function}
    * `error` {null | Error | [`RemoteError`](errors.md#class-remoteerror)
      | Number | String} error to be sent as a response, if any.
    * `sessionId` {String} session ID.

Starts a new session with known user credentials.

### Implementation example

```javascript
const crypto = require('crypto');
const jstp = require('jstp');
const auth = require('./auth');  // Some module of your application

const authProvider = {};
const sessions = {};

authProvider.startAnonymousSession = (connection, application, callback) => {
  startSession(connection, callback);
};

authProvider.startAuthenticatedSession = (connection, application,
                                          username, password, callback) => {
  auth.signIn(application, username, password, (error) => {
    if (error) {
      return callback(jstp.ERR_AUTH_FAILED);
    }

    startSession(connection, callback);
  });
};

function startSession(connection, callback) {
  // For simplicity, sessions are bound to connections one-to-one in this
  // example. However, you may want to restore sessions for authenticated
  // handshakes so that when the connection is lost, you may reconnect
  // transparently as though there was no connection break.

  const sessionId = auth.generateSessionToken();
  sessions[sessionId] = sessionId;

  connection.on('close', () => {
    delete sessions[sessionId];
  });

  callback(null, sessionId);
}
```

## jstp.simpleAuthProvider

Default authentication provider singleton.

### Event: 'session'

* `sessionId` {String} session ID.
* `connection` {[Connection](connection.md#class-connection)}
  a connection that received a handshake packet.
* `application`
  {[IApplication](apps-provider.md#interface-iapplication)}
  application that has got a new client.

This event is emmitted when a new session is established using
`simpleAuthProvider`.

### simpleAuthProvider.startAnonymousSession(connection, application, callback)

* `connection` {[Connection](connection.md#class-connection)}
  a connection that received a handshake packet.
* `application`
  {[IApplication](apps-provider.md#interface-iapplication)}
  application that a client wants to connect to.
* `callback` {Function}
    * `error` {null}
    * `sessionId` {String}

### simpleAuthProvider.startAuthenticatedSession(connection, application, username, password, callback)

Always calls `callback` with [`ERR_AUTH_FAILED`](errors.md#jstperr_auth_failed).
