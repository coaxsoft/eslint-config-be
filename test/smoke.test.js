const test = require('node:test');
const assert = require('node:assert/strict');

const { builtinRules } = require('eslint/use-at-your-own-risk');
const { ESLint } = require('eslint');

const config = require('../index');
const legacyConfig = require('../legacy');
const typescriptConfig = require('../typescript');

test('exports a flat config array', () => {
  assert.ok(Array.isArray(config));
  assert.ok(config.length >= 2);
});

test('legacy export keeps eslintrc shape', () => {
  assert.equal(typeof legacyConfig, 'object');
  assert.ok(Array.isArray(legacyConfig.extends));
});

test('typescript export is a flat config array', () => {
  assert.ok(Array.isArray(typescriptConfig));
  assert.ok(typescriptConfig.length > config.length);
});

test('shared rules only reference available core rules', () => {
  const allowedPluginRules = new Set([
    'simple-import-sort/imports',
    'simple-import-sort/exports',
  ]);
  const missingRules = [];
  const unexpectedPluginRules = [];

  for (const entry of config) {
    if (!entry.rules) {
      continue;
    }

    for (const ruleName of Object.keys(entry.rules)) {
      if (ruleName.includes('/')) {
        if (!allowedPluginRules.has(ruleName)) {
          unexpectedPluginRules.push(ruleName);
        }
        continue;
      }

      if (!builtinRules.has(ruleName)) {
        missingRules.push(ruleName);
      }
    }
  }

  assert.deepEqual(unexpectedPluginRules, []);
  assert.deepEqual(missingRules, []);
});

test('flat config can be loaded by ESLint', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: config,
  });

  const results = await eslint.lintText('export const answer = 42;\n', {
    filePath: 'example.mjs',
  });

  assert.equal(results.length, 1);
});

test('typescript config can be loaded by ESLint', async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: typescriptConfig,
  });

  const results = await eslint.lintText('export interface User { name: string }\n', {
    filePath: 'example.ts',
  });

  assert.equal(results.length, 1);
});
