const js = require('@eslint/js');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const globals = require('globals');

const rules = require('./rules');

const sharedLanguageOptions = {
  ecmaVersion: 'latest',
};

const sharedGlobals = {
  ...globals.node,
  ...globals.mocha,
};

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ...sharedLanguageOptions,
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules,
  },
  {
    files: ['**/*.cjs'],
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      ...sharedLanguageOptions,
      sourceType: 'commonjs',
      globals: sharedGlobals,
    },
    rules,
  },
];
