const rules = require('./rules');

module.exports = {
  env: {
    node: true,
    mocha: true,
    es2021: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  extends: [
    'eslint:recommended',
  ],
  plugins: [
    'simple-import-sort',
  ],
  rules,
  overrides: [
    {
      files: ['**/*.cjs'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],
};
