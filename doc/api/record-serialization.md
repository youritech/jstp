# Record Serialization

This module provides parser and serializer for the [JSTP Record Serialization
format](../data-formats.md#record-serialization) which is very similar to
[JSON5](http://json5.org).

In order to speed up the parser, a native addon will be used for the supported
platforms.  The platforms that will use a pure JavaScript implementation istead
include web browsers, Windows, and Node.js older than version 4.0.  There's
also an experimental version of native JSRS serializer included, however it
isn't currently faster than the JavaScript one. If you want to try it for some
reason, change `USE_NATIVE_SERIALIZER` in `lib/record-serialization.js` to
true.

### jstp.stringify(value)

* `value` {any} any JavaScript value.
* Return: {String} JSRS representation of this value.

This function serializes a JavaScript value using the JSTP Record Serialization
format and returns a string representing it.

Example:

```javascript
const jstp = require('metarhia-jstp');

const event = {
  type: 'notification',
  text: 'Hello!'
};

const serializedEvent = jstp.stringify(event);
// '{type:\'notification\',text:\'Hello!\'}'
```

### jstp.parse(string)

* string {String} a string to parse.
* Return: {any} parsed value.

This function deserializes a string in the JSTP Record Serialization format into
a JavaScript value and returns it.

Example:

```javascript
const jstp = require('metarhia-jstp');

const data = '{type:\'notification\',text:\'Hello!\'}';
const object = jstp.parse(data);
// {
//   type: 'notification',
//   text: 'Hello!'
// }
```
