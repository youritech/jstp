# Object Serialization

This module provides parser and serializer for the [JSTP Object Serialization
format](../data-formats.md#object-serialization).

The format is especially useful for different kinds of configuration files and
will also be used to store and transmit metadata (essentially, classes) when
[JSTP Record Metadata](../data-formats.md#record-metadata) and [JSTP Record
Data](../data-formats.md#record-data) are implemented.

## jstp.dump(value)

* `value` {any} any JavaScript value.
* Return: {String} JSOS representation of this value.

This function serializes a JavaScript value using the JSTP Object Serialization
format and returns a string representing it.

Examples:

```javascript
const jstp = require('metarhia-jstp');

const event = {
  type: 'notification',
  text: 'Hello!'
};

const serializedEvent = jstp.stringify(event);
// '{type:\'notification\',text:\'Hello!\'}'
```

```javascript
const jstp = require('metarhia-jstp');

const person = {
  name: 'Marcus Aurelius',
  passport: 'AE127095',
  birth: {
    date: new Date('1990-02-15'),
    place: 'Rome'
  },
  age: function() {
    var difference = new Date() - birth.date;
    return Math.floor(difference / 31536000000);
  }
};

const data = jstp.dump(person);
// '{name:\'Marcus Aurelius\',passport:\'AE127095\',\
// birth:{date:new Date(\'1990-02-15T00:00:00.000Z\'),\
// place:\'Rome\'},age:function () {\nvar difference = \
// new Date() - birth.date;\nreturn Math.floor(difference \
// / 31536000000);\n}}'
```

## jstp.interprete(string)

* string {String} a string to parse.
* Return: {any} parsed value.

This function deserializes a string in the JSTP Object Serialization format into
a JavaScript value and returns it.

Examples:

```javascript
const jstp = require('metarhia-jstp');

const data = '{type:\'notification\',text:\'Hello!\'}';
const object = jstp.parse(data);
// {
//   type: 'notification',
//   text: 'Hello!'
// }
```

```javascript
const jstp = require('metarhia-jstp');

const data = `{
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
}`;

const person = jstp.interprete(data);
// { name: 'Marcus Aurelius',
//   passport: 'AE127095',
//   birth: { date: 1990-02-15T00:00:00.000Z, place: 'Rome' },
//   age: [Function: age] }
```
