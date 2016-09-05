# JSTP / JavaScript Transfer Protocol

## Concept

JSTP is a family of data formats and corresponding libraries for their
processing that are based on some simple assumptions:

* it is possible to trasfer data as plain JavaScript code easier and
  more efficient than using JSON:
  - in its simplest implementation it doesn't even require a specialized
    pareser since it is already built into transferer and receiver systems;
  - a human-readable format can be almost as minimalist as a binary one,
    losing coding efficiency very slightly yet winning from the simplicity
    of packet inspection;
  - serialization format and data modeling must be maximally univocal and
    must answer a question about why someone has done something this way;
  - there should be possibility to apply different formatting and use
    comments;
* it is redundant to send a structure along with data each time, the
  serialization format and the protocol must be optimized to exempt
  metamodel and send it only when the receiver hasn't got it yet;
* the protocol of interaction between two JavaScript applications must
  have the following features:
  - two-way asynchronous data transfer with support of plentiful parallel
    non-blocking interactions and packet indentifiers allowing, for example,
    to find the correspondence between a request and a response;
  - support of RPC and multiple APIs must be so transparent that application
    shouldn't event know whether a function call is inside the address space
    of the application or it is a remote call sent to another system for
    execution;
  - direct call and response via callback support;
  - support of translation of named events with bound data and named channels
    for event grouping;
  - support of automatic synchronization of objects in applications memory
    if they are registered for synchronization;
  - only one of sides can initiate a connection but both sides can send data
    over open channel;
  - the transport layer must guarantee reliable data transfer with connection
    establishment and guaranteed delivery (TCP is the basic transport and we
    also support WebSocket but anything can be used, even RS232 or USB);
  - all packet types (call, response, callback, event, data etc.) may be split
    into several parts if their body is too large;
  - there should be a possibility to stop data transfer if the data transmitted
    in parts is too large and the last part hasn't been received yet;
* it is required to minimize the transformation of data while tranferring them
  between different systems, storing and processing, minimize putting them from
  one structures to other, to save memory and connection channel;
* amount of data structures needed for most systems is in fact finite and the
  structures themselves must be standardized as a result of specialists
  agreement, and there should be possibility of their versioning;
* non-standard data structures can be sent between systems along with metadata
  that will allow to interprete them and provide universal processing to the
  possible extent if the remote sides trust each other and formalization of
  data doesn't make sense.

## Data Formats Structure

* [Record Serialization](#record-serialization)
`{ name: 'Marcus Aurelius', passport: 'AE127095' }`
* [Object Serialization](#object-serialization)
`{ name: ['Marcus', 'Aurelius'].join(' '), passport: 'AE' + '127095' }`
* [Record Metadata](#record-metadata)
`{ name: 'string', passport: '[string]' }`
* [Record Data](#record-data)
`[ 'Marcus Aurelius', 'AE127095' ]`
* [JavaScript Transfer Protocol](#javascript-transfer-protocol)
`{ event: [17, 'accounts'], insert: ['Marcus Aurelius', 'AE127095'] }`

## Record Serialization

It is in fact plain JavaScript that describes a data structure. Contrary
to JSON it is not required to put keys into double quotes, it is possible
to add comments, neat formatting and all you can do in JavaScript.

For example:

```javascript
{
  name: 'Marcus Aurelius',
  passport: 'AE127095',
  birth: {
    date: '1990-02-15',
    place: 'Rome'
  },
  contacts: {
    email: 'marcus@aurelius.it',
    phone: '+380505551234',
    address: {
      country: 'Ukraine',
      city: 'Kiev',
      zip: '03056',
      street: 'Pobedy',
      building: '37',
      floor: '1',
      room: '158'
    }
  }
}
```

The simplest way to parse the data in Node.js:

```javascript
api.jstp.parse = function(s) {
  var sandbox = vm.createContext({});
  var js = vm.createScript('(' + s + ')');
  return js.runInNewContext(sandbox);
};
```
And here's the example of usage:

```javascript
fs.readFile('./person.record', function(err, s) {
  var person = api.jstp.parse(s);
  console.dir(person);
});
```

**Warning:** this excerpt, as well as next examples of code, is just a
demonstration of concept; of course, it is far more complicated in real world
to do it properly, and that's what this library does.

## Object Serialization

If we complicate the parser a little bit, putting all the keys it exports into
the same sandbox, we could use expressions and functions:

```javascript
api.jstp.parse = function(s) {
  var sandbox = vm.createContext({});
  var js = vm.createScript('(' + s + ')');
  var exported = js.runInNewContext(sandbox);
  for (var key in exported) {
    sandbox[key] = exported[key];
  }
  return exported;
};
```

Example of data:

```javascript
{
  name: ['Marcus', 'Aurelius'].join(' '),
  passport: 'AE' + '127095',
  birth: {
    date: new Date('1990-02-15'),
    place: 'Rome'
  },
  age: function() {
    var difference = new Date() - birth.date;
    return Math.floor(difference / 31536000000);
  }
}
```

As you can see, it is possible to use links to structure fields, like
`birth.date`.

And here's an example of usage:

```javascript
fs.readFile('./person.record', function(err, s) {
  var person = api.jstp.parse(s);
  console.log('Age = ' + person.age());
});
```

## Record Metadata

This is metadata, i.e., data about the structure data types, that are described
in the same format of JavaScript objects. Field definitiions are described
using special syntax. For example, `number(4)` is a number that has less or
four digits and cannot be undefined, and `[number(2, 4)]` is a nullable number
that has two to four digits (**TODO**: controversial syntax, better to use `?`
for nullables and `[...]` for arrays, IMO).

Examples:

```javascript
// File: Person.metadata
{
  name: 'string',
  passport: '[string(8)]',
  birth: '[Birth]',
  address: '[Address]'
}

// File: Birth.metadata
{
  date: 'Date',
  place: '[string]'
}

// File: Address.metadata
{
  country: 'string',
  city: 'string',
  zip: 'number(5)',
  street: 'string',
  building: 'string',
  room: '[number]'
}
```

Names of built-in types begin with a lowercase letter (`string`, `number`,
`boolean`), and links to other records begin with a capital: `Birth`,
`Address`. All record definitions are stored in a special structure storage and
can be cached on servers and user devices.

## Record Data

It is pure data without names of the fields and with objects replaced with
arrays.  If a field doesn't have a value (i.e., `undefined`) then the value in
the array is just omitted. For example, `[1,,,4]` means four fields, with the
first and last having the values of `1` and `4` respectively and the second and
third equal to `undefined`.

Example of `Person` instance:

```javascript
['Marcus Aurelius','AE127095',['1990-02-15','Rome'],['Ukraine','Kiev','03056','Pobedy','37','158']]
```

If we have data data and corresponding metadata, we can restore the full
document. For example:

```javascript
var data = ['Marcus Aurelius','AE127095'];
var metadata = { name: 'string', passport: '[string(8)]' };
var person = api.jstp.decode(data, metadata);
console.dir(person);
{ name: 'Marcus Aurelius', passport: 'AE127095' }
```

## JavaScript Transfer Protocol

JSTP is a data transfer protocol that uses JavaScript objects syntax as the
encoding format and supports metadata. The protocol has 8 types of packets:

* `call` — remote API call;
* `callback` — remote API response;
* `event` — event with attached data;
* `state` — data synchronization;
* `stream` — data streaming;
* `handshake` — protocol handshake;
* `health` — system data about resource state and usage;
* `inspect` — API introspection request;
* this list is a subject to change.

```javascript
// Packet ID 17, remote call, interface auth, method newAccount
{call:[17,'auth'],newAccount:['Payload data']}

// Response to packet 17, operation is successful, record ID is 15703
{callback:[17],ok:[15703]}

// Event in packet 18, interface auth, event named insert
{event:[18,'auth'],insert:['Marcus Aurelius','AE127095']}
```

Packet structure:
* a packet is an object with several keys;
* the first one is a header, the name of this key is the packet type,
  its elements are:
  - `[0]` — unique number that identifies the packet inside the connection;
    packet with ID `0` is sent by a client (the side that initiated the
    connection) and the client increments it by `1` with each request;
    a server has a separate counter that is being decremented by `1` with
    each request or response to the client; if any of the sides sends a
    request (like `call` or `inspect`), another one responds with a
    `callback` packet with the same ID.
  - `[1]` — resource identifier:
    - in `call`, `event` and `inspect` — name of an interface;
    - in `state` — identifier of the mutating object;
- the second key is identifier:
  - in `call` — method name;
  - in `callback` - response status (`ok` or `error`);
  - in `event` — event name;
  - in `state` — method identifier (`inc`, `dec`, `delete`, `let`, `push`,
    `pop`, `shift`, `unshift`);
  - in `inspect` — no value;
  - in `stream` — no value.

### Remote Call Packet `call`

Example:

```javascript
{call:[3,'interfaceName'],methodName:['Payload data']}
```

### Remote Call Response Packet `callback`

Examples:

```javascript
{callback:[14],ok:[15703]}

{callback:[397],error:[4,'Data validation failed']}

{callback:[-23],ok:[]}
```

### Remote Event Packet `event`

Examples:

```javascript
{event:[-12,'chat'],message:['Marcus','Hello there!']}

{event:[51,'game'],vote:[5]}

{event:[-79,'db'],insert:['Marcus','Aurelius','Rome','AE127095']}
```

### Data Synchronization Packet `state`

Examples:

```javascript
{state:[-12,'object.path.prop1'],inc:5}
{state:[-13,'object.path.prop2'],dec:1}
{state:[-14,'object.path.prop3'],let:700}
{state:[-15,'object.path.prop4'],let:'Hello'}
{state:[-16,'object.path.prop5'],let:{f:55}}
{state:[-17,'object.path.prop5'],let:[1,2,7]}
{state:[-18,'object.path.prop6'],delete:0}
{state:[-19,'object.path.set1'],let:['A','D']}
{state:[-20,'object.path.set1'],push:'C'}
{state:[-20,'object.path.set2'],let:[5,6,9]}
{state:[-20,'object.path.set2'],push:12}
{state:[-20,'object.path.set2'],pop:2}
{state:[-20,'object.path.set2'],shift:3}
{state:[-20,'object.path.set2'],delete:5}
{state:[-20,'object.path.set2'],unshift:1}
```

### Data Stream Packet `stream`

Examples:

```javascript
{stream:[9],data:'Payload start...'}
{stream:[9],data:'...continue...'}
{stream:[9],data:'...end'}
```

### Handshake Packet `handshake`

Handshake packets always have ID equal to `0`. The response contains either
the key `ok` with a value that is the session identifier or `error` that is
an array with error code and optional error message.

Successful handshake:

```javascript
C: {handshake:[0,'example'],marcus:'7b458e1a9dda....67cb7a3e'}
S: {handshake:[0],ok:'9b71d224bd62...bcdec043'}
```

In this excerpt `'example'` is the name of an application, `marcus`
is the user name and `9b71d224bd62...bcdec043` is the session id.

Successful anonymous handshake:

```javascript
C: {handshake:[0,'example']}
S: {handshake:[0],ok:'f3785d96d46a...def46f73'}
```

It may be necessary for registration or public service. Server responds
with a session ID.

Successfull handshake of [Impress](https://github.com/metarhia/Impress) worker
connecting to a private cloud controller:

```javascript
C: {handshake:[0,'impress'],S1N5:'d3ea3d73319b...5c2e5c3a'}
S: {handshake:[0],ok:'PrivateCloud'}
```

`PrivateCloud` is the name of a cloud and `d3ea3d73319b...5c2e5c3a` is the
cloud access key.

Application not found:

```javascript
C: {handshake:[0,'example'],marcus:'fbc2890caada...0c466347'}
S: {handshake:[0],error:[10,'Application not found']}
```

In this example `marcus` is username and `fbc2890caada...0c466347` is salted `sha512` hash of a password.

Authentication error:

```javascript
C: {handshake:[0,'example'],marcus:'e2dff7251967...14b8c5da'}
S: {handshake:[0],error:[11,'Authentication failed']}
```

### Introspection Request Packet `inspect`

This packet is being sent for remote API introspection request and can be
initiated by either side.

Just like the `call` packet, the other side responds with a `callback` packet.

Example of a successful introspection retrieval:

```javascript
C: {inspect:[42,'interfaceName']}
S: {callback:[42],ok:['method1','method2']}
```

Error getting the introspection:

```javascript
C: {inspect:[15,'unknownInterface']}
S: {callback:[15],error:[12,'Interface not found']}
```

### Data Transmission and Packet Aggregation

#### TCP

TCP protocol transfers a stream of data, so fragments sent sequentially are
glued and cut in any positions by the protocol. In order to split the stream
into separate messages we must either specify the length of each packet or
include message terminators. JSTP uses terminator that allows to accumulate
and split the buffer quite efficiently.

Each JSTP packet must end with a null character. When a TCP packet arrives,
each null character is replaced with a comma and the result is put into
the buffer (while the empty buffer always has the `[` character). As soon
as the received packet ends with a terminator, after character replacement
and putting the data into the buffer, the `]` character is placed into the
buffer and its whole content is parsed.

The previous version of JSTP used `,{\f},` (where `\f` is `0x0C` character)
sequence as the packet delimiter.

This plays nice with the Nagle algorithm reducing the number of sandbox
instantiations significantly.

#### WebSocket

Since the WebSocket API used in browsers doesn't expose the vanilla frame-based
or streaming API (though supported by WebSocket protocol) but only
message-based one which splits messages into frames and aggregates them back
together automatically, and all the major WebSocket implementations are capable
of that too, there's no need to build the same mechanism again on top of
WebSocket and induce unnecessary overhead because of situation that will never
happen.

On the other hand, when WebSocket is used as the transport protocol, each
JSTP packet will be parsed independently.

### Other Implementations

| Platform or Language | Repository | Parser | TCP Client | TCP Server | WebSocket Client | WebSocket Server | Status |
| --- | --- | :---: | :---: | :---: | :---: | :---: | --- |
| Node.js and Impress Application Server | [metarhia/Impress/lib/api.jstp.js](https://github.com/metarhia/Impress/blob/master/lib/api.jstp.js) | ✓ | ✓ | ✓ | ✗ | ✓ | proof of concept, will be replaced with this library soon |
| JavaScript for web browsers | [metarhia/Impress/applications/example/static/js/impress.js](https://github.com/metarhia/Impress/blob/master/applications/example/static/js/impress.js) | ✓ | ✗ | ✗ | ✓ | ✗ | proof of concept, will be replaced with this library soon |
| C++ | [NechaiDO/JSTP-cpp](https://github.com/NechaiDO/JSTP-cpp) | ✓ | ✗ | ✗ | ✗ | ✗ | stable |
| Qt C++ | [NechaiDO/QJSTP](https://github.com/NechaiDO/QJSTP) | ✓ | ✗ | ✗ | ✗ | ✗ | stable |
| iOS (Swift) | [JSTPMobile/iOS](https://github.com/JSTPMobile/iOS) | ✓ | ✗ | ✗ | ✗ | ✗ | in development |
| Java | [JSTPMobile/Java](https://github.com/JSTPMobile/Java) | ✓ | ✓ | ✗ | ✗ | ✗ | stable |
| C# | [JSTPKPI/JSTP-CS](https://github.com/JSTPKPI/JSTP-CS) | ✓ | ✗ | ✗ | ✗ | ✗ | stable |
| Python | [mitchsvik/JSTP-Python](https://github.com/mitchsvik/JSTP-Python) | partially | ✗ | ✗ | ✗ | ✗ | proof of concept |
| Haskell | [DzyubSpirit/JSTPHaskellParser](https://github.com/DzyubSpirit/JSTPHaskellParser) | ✓ | ✓ | ✓ | ✗ | ✗ | stable |
| PHP | [Romm17/JSTPParserInPHP](https://github.com/Romm17/JSTPParserInPHP) | ✓ | ✗ | ✗ | ✗ | ✗ | stable |
| GoLang | [belochub/jstp-go](https://github.com/belochub/jstp-go) | ✗ | ✗ | ✗ | ✗ | ✗ | in development |
