const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { ESLint } = require('eslint');
const globals = require('globals');

const { OUTPUTS, build, serialize } = require('../scripts/build-oxlint-config');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures', 'presets');
const OXLINT_BIN = path.join(path.dirname(require.resolve('oxlint/package.json')), 'bin', 'oxlint');
const OXLINT_CONFIG = path.join(ROOT, 'oxlint.json');

const oxlintConfig = require('../oxlint.json');

// Rule ids are compared without plugin prefixes: oxlint reports `eslint(no-shadow)` where
// ESLint reports `@typescript-eslint/no-shadow`.
const normalizeEslintRule = (ruleId) => ruleId.replace('@typescript-eslint/', '');

const normalizeOxlintRule = (code) => {
  const [, plugin, rule] = code.match(/^([\w-]+)\((.+)\)$/);

  return plugin === 'simple-import-sort' ? `${plugin}/${rule}` : rule;
};

const runOxlint = (args, cwd = ROOT) => {
  try {
    return execFileSync(OXLINT_BIN, args, { cwd, encoding: 'utf8' });
  } catch (error) {
    if (error.stdout) {
      return error.stdout;
    }
    throw error;
  }
};

const lintWithOxlint = (files) => {
  const output = runOxlint(['-c', OXLINT_CONFIG, '--format', 'json', ...files.map((f) => path.join(FIXTURES, f))]);

  return JSON.parse(output).diagnostics.map((d) => ({
    file: path.basename(d.filename),
    line: d.labels[0].span.line,
    rule: normalizeOxlintRule(d.code),
  }));
};

const lintWithEslint = async (config, files) => {
  const eslint = new ESLint({ cwd: FIXTURES, overrideConfigFile: true, overrideConfig: config });
  const results = await eslint.lintFiles(files);

  return results.flatMap((result) => result.messages.map((m) => ({
    file: path.basename(result.filePath),
    line: m.line,
    rule: m.ruleId ? normalizeEslintRule(m.ruleId) : `fatal: ${m.message}`,
  })));
};

const key = ({ file, line, rule }) => `${file}:${line} ${rule}`;
const keys = (findings) => findings.map(key).sort();
const rulesIn = (findings, file) => new Set(findings.filter((f) => f.file === file).map((f) => f.rule));

const EXPECTED = ['eqeqeq', 'curly', 'no-eval', 'prefer-template', 'no-console', 'simple-import-sort/imports'];

test('oxlint.json and oxlint-overlap.json are in sync with the ESLint presets', async () => {
  const outputs = await build();

  for (const [name, file] of Object.entries(OUTPUTS)) {
    assert.equal(fs.readFileSync(file, 'utf8'), serialize(outputs[name]), `${path.basename(file)} is stale: run npm run build:oxlint`);
  }
});

test('every rule in oxlint.json exists in the installed oxlint', () => {
  const available = new Set(JSON.parse(runOxlint(['--rules', '--format', 'json']))
    .map((rule) => `${rule.scope.replaceAll('_', '-')}/${rule.value}`));
  const jsPluginRule = (id) => id.startsWith('simple-import-sort/');
  const ids = [oxlintConfig.rules, ...oxlintConfig.overrides.map((o) => o.rules || {})].flatMap(Object.keys);

  assert.deepEqual(ids.filter((id) => !available.has(id) && !jsPluginRule(id)), []);

  // oxlint rejects unknown rules and invalid options when loading the config.
  assert.deepEqual(JSON.parse(runOxlint(['-c', OXLINT_CONFIG, '--format', 'json', path.join(FIXTURES, 'clean.js')])).diagnostics, []);
});

test('oxlint knows the same globals as the ESLint presets', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-globals-'));

  try {
    // Through `extends`, like a consumer does.
    fs.writeFileSync(path.join(dir, '.oxlintrc.json'), JSON.stringify({ extends: [OXLINT_CONFIG] }));
    const names = Object.keys({ ...globals.node, ...globals.mocha });

    fs.writeFileSync(path.join(dir, 'known.cjs'), names.map((name) => `void ${name};`).join('\n'));
    fs.writeFileSync(path.join(dir, 'unknown.mjs'), 'export const w = window;\n');

    const diagnostics = JSON.parse(runOxlint(['--format', 'json', '.'], dir)).diagnostics
      .filter((d) => d.code === 'eslint(no-undef)')
      .map((d) => `${path.basename(d.filename)}: ${d.message}`);

    assert.deepEqual(diagnostics, ['unknown.mjs: \'window\' is not defined.']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('ESLint presets report the expected rules', async () => {
  const js = await lintWithEslint(require('../index'), ['violations.js']);
  const ts = await lintWithEslint(require('../typescript'), ['violations.ts']);

  for (const rule of EXPECTED) {
    assert.ok(rulesIn(js, 'violations.js').has(rule), `JS: ${rule}`);
    assert.ok(rulesIn(ts, 'violations.ts').has(rule), `TS: ${rule}`);
  }
  assert.ok(rulesIn(ts, 'violations.ts').has('no-shadow'), 'TS: no-shadow');
  assert.ok(rulesIn(js, 'violations.js').has('quotes'), 'JS: quotes');
});

test('oxlint preset reports the expected rules', () => {
  const findings = lintWithOxlint(['violations.js', 'violations.ts']);

  for (const rule of EXPECTED) {
    assert.ok(rulesIn(findings, 'violations.js').has(rule), `JS: ${rule}`);
    assert.ok(rulesIn(findings, 'violations.ts').has(rule), `TS: ${rule}`);
  }
  assert.ok(rulesIn(findings, 'violations.ts').has('no-shadow'), 'TS: no-shadow');
});

test('clean files have no findings', async () => {
  const files = ['clean.js', 'clean.cjs', 'clean.ts'];

  assert.deepEqual(keys(await lintWithEslint(require('../typescript'), files)), []);
  assert.deepEqual(keys(await lintWithEslint(require('../index'), ['clean.js', 'clean.cjs'])), []);
  assert.deepEqual(keys(lintWithOxlint(files)), []);
});

for (const [preset, hybrid, files] of [
  ['index', 'with-oxlint', ['violations.js', 'clean.js', 'clean.cjs']],
  ['typescript', 'typescript-with-oxlint', ['violations.js', 'violations.ts', 'clean.js', 'clean.cjs', 'clean.ts']],
]) {
  test(`${hybrid}: oxlint + ESLint report everything ${preset} does, nothing twice`, async () => {
    const full = await lintWithEslint(require(`../${preset}`), files);
    const eslintPart = await lintWithEslint(require(`../${hybrid}`), files);
    const oxlintPart = lintWithOxlint(files);

    const oxlintKeys = new Set(keys(oxlintPart));

    assert.deepEqual(keys(eslintPart).filter((k) => oxlintKeys.has(k)), [], 'reported by both');
    assert.deepEqual(keys([...eslintPart, ...oxlintPart]), keys(full));
    assert.ok(!rulesIn(eslintPart, 'violations.js').has('eqeqeq'), 'eqeqeq is left to oxlint');
    assert.ok(rulesIn(eslintPart, 'violations.js').has('quotes'), 'quotes stays in ESLint');
    assert.ok(!rulesIn(oxlintPart, 'violations.js').has('quotes'), 'quotes is not in oxlint');
  });
}
