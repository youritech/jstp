# Connection

## Class: `Connection`

### `new Connection(transport, server, client)`

* `transport` [`<Transport>`][Transport]
* `server` [`<Server>`][Server]
* `client` [`<Client>`][Client]

Both `server` and `client` are optional but one of them is required.
`server` is required for server side connection, whereas `client` is required
for client side connection.

You **should not** call this constructor manually,
unless you implement a custom JSTP transport.

Recommended approach is to call `connect()` or `connectAndInspect()` functions
provided by these modules:

* [net](./net.md)
* [tls](./tls.md)
* [ws](./ws.md)
* [ws-browser](./ws-browser.md)
* [wss](./wss.md)

### handshake(app, \[login\], \[password\], callback)

* `app` [`<string>`][string] | [`<Object>`][Object]
    * `name` [`<string>`][string]
    * `version` [`<string>`][string]
* `login` [`<string>`][string]
* `password` [`<string>`][string]
* `callback` [`<Function>`][Function]
    * `error` [`<RemoteError>`][RemoteError]
    * `sessionId` [`<string>`][string]

`app` may be `'name'`, `'name@version'` or `{ name, version }`,
where version must be a valid semver range.

Send a handshake message over the connection.

### inspectInterface(interfaceName, callback)

* `interfaceName` [`<string>`][string]
* `callback` [`<Function>`][Function]
    * `error` [`<RemoteError>`][RemoteError]
    * `proxy` [`<RemoteProxy>`][RemoteProxy]

Send an inspect message over the connection.

### callMethod(interfaceName, methodName, args, callback)

* `interfaceName` [`<string>`][string]
* `methodName` [`<string>`][string]
* `args` [`<Object[]>`][Object]
* `callback` [`<Function>`][Function]
    * `error` [`<RemoteError>`][RemoteError]
    * `...args` [`<Object[]>`][Object]

Send a call message over the connection.

### emitRemoteEvent(interfaceName, eventName, args)

* `interfaceName` [`<string>`][string]
* `eventName` [`<string>`][string]
* `args` [`<Object[]>`][Object]

Send an event message over the connection.

### ping(callback)

* `callback` [`<Function>`][Function]

Send a ping message.

### startHeartbeat(interval)

* `interval` [`<number>`][number]

Start periodically sending ping messages every `interval` milliseconds.

### stopHeartbeat()

Start periodically sending ping messages.

### close()

Close the connection.

### getTransport()

* Returns: [`<Transport>`][Transport]

Returns underlying transport.

### server

* [`<Server>`][Server]

### client

* [`<Client>`][Client]

### id

* [`<number>`][number]

### remoteAddress

* [`<Object>`][Object]

### handshakeDone

* [`<boolean>`][boolean]

### username

* [`<string>`][string]

### session

* [`<Session>`][Session]

### application

* [`<Application>`][Application]

### remoteProxies

* [`<Object>`][Object]
    * `[interface]` [`<RemoteProxy>`][RemoteProxy]

[Application]: ./application.md
[Transport]: ./transport.md
[Server]: ./server.md
[Client]: ./client.md
[Session]: ./session.md
[RemoteError]: ./remote-error.md
[RemoteProxy]: ./remote-proxy.md
[string]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String
[number]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
[boolean]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean
[Object]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object
[Function]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function
