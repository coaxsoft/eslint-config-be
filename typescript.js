const simpleImportSort = require('eslint-plugin-simple-import-sort');
const globals = require('globals');
const tseslint = require('typescript-eslint');

const baseConfig = require('./index');
const baseRules = require('./rules');

const sharedGlobals = {
  ...globals.node,
  ...globals.mocha,
};

const recommendedTypeScriptRules = tseslint.configs.recommended.reduce((rules, entry) => {
  if (entry.rules) {
    Object.assign(rules, entry.rules);
  }

  return rules;
}, {});

const typeScriptRules = {
  ...baseRules,
  ...recommendedTypeScriptRules,
  indent: [
    'error',
    2,
    {
      SwitchCase: 1,
      ignoredNodes: [
        'TemplateLiteral',
        'ClassDeclaration[implements.length>0]',
        'PropertyDefinition[decorators.length>0]',
      ],
    },
  ],
  'no-shadow': 'off',
  'no-use-before-define': 'off',
  '@typescript-eslint/no-shadow': 'warn',
  '@typescript-eslint/no-use-before-define': ['warn', { functions: false }],
  '@typescript-eslint/explicit-function-return-type': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
  '@typescript-eslint/no-explicit-any': 'off',
};

module.exports = [
  ...baseConfig,
  {
    files: ['**/*.{ts,mts}'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: sharedGlobals,
    },
    rules: typeScriptRules,
  },
  {
    files: ['**/*.cts'],
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      'simple-import-sort': simpleImportSort,
    },
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: sharedGlobals,
    },
    rules: typeScriptRules,
  },
];
