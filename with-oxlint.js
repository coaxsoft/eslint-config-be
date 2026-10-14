const config = require('./index');
const overlap = require('./oxlint-overlap.json');

// Rules oxlint already enforces with the ./oxlint preset; turned off so findings aren't reported twice.
const turnOff = (names) => Object.fromEntries(names.map((name) => [name, 'off']));

module.exports = [
  ...config,
  {
    files: ['**/*.{js,mjs,cjs}'],
    rules: turnOff(overlap.javascript),
  },
];
