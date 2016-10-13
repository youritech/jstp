# JSTP Data Formats Family

## Data Formats Structure

* [Record Serialization](#record-serialization)
  `{ name: 'Marcus Aurelius', passport: 'AE127095' }`

* [Object Serialization](#object-serialization)
  `{ name: ['Marcus', 'Aurelius'].join(' '), passport: 'AE' + '127095' }`

* [Record Metadata](#record-metadata)
  `{ name: 'string', passport: '[string]' }`

* [Record Data](#record-data)
  `[ 'Marcus Aurelius', 'AE127095' ]`

* [JavaScript Transfer Protocol](protocol.md)
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
