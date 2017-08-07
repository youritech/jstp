'use strict';

const benchmark = require('benchmark');
const serde = require('../../lib/serde');

const data = require('./test-cases');

const testCases = data.map(
  ({ name, value }) => [
    name,
    {
      serde: serde.stringify(value),
      json: JSON.stringify(value),
    },
  ]
);

console.log('Parrsing:');
testCases.forEach(([name, data]) => {
  const suite = new benchmark.Suite(name);

  suite
    .add('serde', () => {
      serde.parse(data.serde);
    })
    .add('JSON', () => {
      JSON.parse(data.json);
    })
    .on('start', () => {
      console.log(`\n${suite.name}:`);
    })
    .on('cycle', (event) => {
      console.log(String(event.target));
    })
    .on('complete', function() {
      const fastest = this[1].hz > this[0].hz ? 1 : 0;
      const increase =
        Math.round(100 * this[fastest].hz / this[1 - fastest].hz) - 100;

      console.log(
        `${this[fastest].name} is ${increase}% faster than ` +
        this[1 - fastest].name
      );
    })
    .run();
});

console.log('\nSerialization:');
testCases.forEach(([name, data]) => {
  const suite = new benchmark.Suite(name);

  suite
    .add('serde', () => {
      serde.stringify(data.serde);
    })
    .add('JSON', () => {
      JSON.stringify(data.json);
    })
    .on('start', () => {
      console.log(`\n${suite.name}:`);
    })
    .on('cycle', (event) => {
      console.log(String(event.target));
    })
    .on('complete', function() {
      const fastest = this[1].hz > this[0].hz ? 1 : 0;
      const increase =
        Math.round(100 * this[fastest].hz / this[1 - fastest].hz) - 100;

      console.log(
        `${this[fastest].name} is ${increase}% faster than ` +
        this[1 - fastest].name
      );
    })
    .run();
});
