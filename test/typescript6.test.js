const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { ESLint } = require('eslint');
const ts = require('typescript');

const typescriptConfig = require('../typescript');

const fixtureDir = path.join(__dirname, 'fixtures', 'ts6');

test('typescript preset lints TS 6 code with a TS 6 program', async (t) => {
  if (Number(ts.versionMajorMinor.split('.')[0]) < 6) {
    t.skip(`installed typescript is ${ts.version}`);
    return;
  }

  const eslint = new ESLint({
    cwd: fixtureDir,
    overrideConfigFile: true,
    overrideConfig: [
      ...typescriptConfig,
      {
        files: ['**/*.ts'],
        languageOptions: {
          parserOptions: {
            project: './tsconfig.json',
            tsconfigRootDir: fixtureDir,
            onUnsupportedTypeScriptVersion: 'error',
          },
        },
      },
    ],
  });

  const [result] = await eslint.lintFiles(['sample.ts']);

  assert.deepEqual(result.messages, []);
});
