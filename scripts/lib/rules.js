const { execFileSync } = require('node:child_process');
const path = require('node:path');

const { ESLint } = require('eslint');
const tseslint = require('typescript-eslint');

const javascriptConfig = require('../../index');
const typescriptConfig = require('../../typescript');

const SEVERITIES = ['off', 'warn', 'error'];

const PRESETS = {
  javascript: {
    config: javascriptConfig,
    files: ['example.js', 'example.mjs', 'example.cjs'],
  },
  typescript: {
    config: typescriptConfig,
    files: ['example.ts', 'example.mts', 'example.cts'],
  },
};

const normalizeSeverity = (value) => (typeof value === 'number' ? SEVERITIES[value] : value);

const appliesTo = (entry, file) => !entry.files || entry.files.some((glob) => path.matchesGlob(file, glob));

// Merges the raw rule entries the way flat config does, without the default options
// ESLint injects in calculateConfigForFile (oxlint has its own defaults).
const mergeRules = (config, file) => {
  const merged = {};

  for (const entry of config) {
    if (!entry.rules || !appliesTo(entry, file)) {
      continue;
    }

    for (const [name, value] of Object.entries(entry.rules)) {
      const [severity, ...options] = Array.isArray(value) ? value : [value];

      merged[name] = {
        severity: normalizeSeverity(severity),
        options: Array.isArray(value) ? options : merged[name]?.options ?? [],
      };
    }
  }

  return merged;
};

const assertSameRules = (left, right, label) => {
  const a = JSON.stringify(left);
  const b = JSON.stringify(right);

  if (a !== b) {
    throw new Error(`${label}: effective rules differ between files of the same preset`);
  }
};

// Effective rules per preset, cross-checked against ESLint's own resolution.
const getEffectiveRules = async () => {
  const result = {};

  for (const [preset, { config, files }] of Object.entries(PRESETS)) {
    const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: config });
    const perFile = files.map((file) => mergeRules(config, file));

    perFile.slice(1).forEach((rules) => assertSameRules(perFile[0], rules, preset));

    const calculated = await eslint.calculateConfigForFile(files[0]);

    for (const [name, { severity }] of Object.entries(perFile[0])) {
      const [expected] = [].concat(calculated.rules[name]);

      if (normalizeSeverity(expected) !== severity) {
        throw new Error(`${preset}: ${name} resolves to ${expected} in ESLint but ${severity} here`);
      }
    }

    result[preset] = perFile[0];
  }

  return result;
};

const OXLINT_BIN = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin', 'oxlint');

const getOxlintRules = () => {
  const output = execFileSync(OXLINT_BIN, ['--rules', '--format', 'json'], { encoding: 'utf8' });

  return JSON.parse(output).map((rule) => ({
    ...rule,
    plugin: rule.scope.replaceAll('_', '-'),
  }));
};

const TS_PREFIX = '@typescript-eslint/';

const isTypeScriptExtensionRule = (eslintName) => {
  const rule = tseslint.plugin.rules[eslintName.slice(TS_PREFIX.length)];

  return Boolean(eslintName.startsWith(TS_PREFIX) && rule?.meta.docs?.extendsBaseRule);
};

const lookup = (oxlintRules, plugin, name, via) => {
  const rule = oxlintRules.find((r) => r.plugin === plugin && r.value === name && !r.type_aware);

  return rule ? { ...rule, id: `${plugin}/${name}`, via } : null;
};

// Finds the oxlint rule that implements an ESLint rule name. Type-aware oxlint rules are skipped:
// the presets don't configure type information.
//  - core rules live under the `eslint` plugin, some deprecated Node rules only under `node`;
//  - typescript-eslint extension rules (no-shadow, no-unused-vars, …) map to oxlint's TS-aware `eslint/` rule.
const findOxlintRule = (eslintName, oxlintRules) => {
  if (eslintName.startsWith(TS_PREFIX)) {
    const name = eslintName.slice(TS_PREFIX.length);

    return lookup(oxlintRules, 'typescript', name, 'typescript')
      ?? (isTypeScriptExtensionRule(eslintName) ? lookup(oxlintRules, 'eslint', name, 'extension') : null);
  }

  if (eslintName.includes('/')) {
    return null;
  }

  return lookup(oxlintRules, 'eslint', eslintName, 'eslint')
    ?? lookup(oxlintRules, 'node', eslintName, 'node');
};

module.exports = {
  OXLINT_BIN,
  TS_PREFIX,
  findOxlintRule,
  getEffectiveRules,
  getOxlintRules,
};
