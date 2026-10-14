#!/usr/bin/env node
// Audits the effective rules of the ESLint presets against the installed oxlint
// and writes docs/oxlint-rule-mapping.md.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ALL_CATEGORIES_OFF,
  OXLINT_BIN,
  TS_PREFIX,
  findJsPlugin,
  findOxlintRule,
  getCategory,
  getEffectiveRules,
  getMeta,
  getOxlintRules,
} = require('./lib/rules');

const OUTPUT = path.join(__dirname, '..', 'docs', 'oxlint-rule-mapping.md');

const oxlintVersion = require('oxlint/package.json').version;

const formatSetting = (setting) => {
  if (!setting) {
    return '—';
  }

  const options = setting.options.length ? ` \`${JSON.stringify(setting.options)}\`` : '';

  return `${setting.severity}${options}`;
};

const describeDeprecation = (deprecated) => {
  if (!deprecated) {
    return '';
  }

  if (deprecated === true) {
    return 'deprecated';
  }

  const since = deprecated.deprecatedSince ? ` since v${deprecated.deprecatedSince}` : '';
  const replacements = (deprecated.replacedBy || [])
    .map(({ plugin, rule }) => [plugin?.name, rule?.name].filter(Boolean).join(' → '))
    .filter(Boolean);
  const replacedBy = replacements.length ? `; replaced by ${replacements.join(', ')}` : '';

  return `deprecated${since}${replacedBy}`;
};

const withTempDir = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oxlint-audit-'));

  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const runOxlint = (dir, config, source = '', file = 'probe.ts') => {
  fs.writeFileSync(path.join(dir, 'config.json'), JSON.stringify(config));
  fs.writeFileSync(path.join(dir, file), source);

  return spawnSync(OXLINT_BIN, ['-c', 'config.json', '--format', 'json', file], {
    cwd: dir,
    encoding: 'utf8',
  });
};

// oxlint refuses to start when a rule's options don't match its schema, so loading a config
// with exactly our options tells us whether they are accepted.
const checkOptions = (dir, id, setting) => {
  const result = runOxlint(dir, {
    categories: ALL_CATEGORIES_OFF,
    plugins: ['eslint', 'typescript', 'node'],
    rules: { [id]: [setting.severity === 'off' ? 'warn' : setting.severity, ...setting.options] },
  });

  if (result.status === 0) {
    return null;
  }

  return (result.stdout + result.stderr).split('\n').map((line) => line.trim()).filter(Boolean).slice(1).join(' ');
};

// JS plugins are alpha in oxlint: check that the ESLint plugin loads and actually reports.
const probeJsPlugin = (dir, rule, specifier) => {
  const result = runOxlint(
    dir,
    {
      categories: ALL_CATEGORIES_OFF,
      jsPlugins: [require.resolve(specifier)],
      rules: { [rule]: 'error' },
    },
    "import z from 'zeta';\nimport a from 'alpha';\nexport { z, a };\n",
  );

  try {
    return JSON.parse(result.stdout).diagnostics.some((d) => d.code === rule.replace('/', '(').concat(')'));
  } catch {
    return false;
  }
};

// Rules oxlint doesn't implement because its parser already rejects the code in strict mode.
// ESM/TS sources export so they are parsed as modules; the CommonJS one stays sloppy.
const PARSER_PROBES = {
  'no-dupe-args': 'function f(a, a) { return a; }',
  'no-octal': 'const n = 071;',
};

const probeParser = (dir, source) => ['probe.mjs', 'probe.ts', 'probe.cjs'].filter((file) => {
  const code = file.endsWith('.cjs') ? `${source}\n` : `export ${source}\n`;
  const result = runOxlint(dir, { categories: ALL_CATEGORIES_OFF }, code, file);

  try {
    return JSON.parse(result.stdout).diagnostics.length > 0;
  } catch {
    return false;
  }
});

const isNoop = (name, setting) => (
  /^(id-denylist|no-restricted-[a-z]+)$/.test(name) && setting.options.length === 0
);

const main = async () => {
  const effective = await getEffectiveRules();
  const oxlintRules = getOxlintRules();
  const names = [...new Set([...Object.keys(effective.javascript), ...Object.keys(effective.typescript)])].sort();

  const rows = withTempDir((dir) => names.map((name) => {
    const js = effective.javascript[name];
    const ts = effective.typescript[name];
    const meta = getMeta(name);
    const enabled = [js, ts].some((setting) => setting && setting.severity !== 'off');
    const category = getCategory(name);
    const deprecation = describeDeprecation(meta.deprecated);
    const notes = [];
    let support;
    let oxlintId = '—';

    const jsPlugin = findJsPlugin(name);
    const match = findOxlintRule(name, oxlintRules);

    if (jsPlugin) {
      const { specifier } = jsPlugin;

      support = probeJsPlugin(dir, name, specifier) ? 'via JS plugin' : 'unsupported';
      oxlintId = name;
      notes.push(`\`jsPlugins: ["${specifier}"]\` (alpha in oxlint)`);
    } else if (match) {
      support = 'native';
      oxlintId = match.id;

      if (match.via === 'extension') {
        notes.push('typescript-eslint extension rule; oxlint\'s `eslint/` rule is TS-aware');
      }

      if (match.via === 'node') {
        notes.push('only in oxlint\'s `node` plugin');
      }

      for (const setting of [js, ts]) {
        if (setting && setting.options.length) {
          const error = checkOptions(dir, match.id, setting);

          if (error) {
            support = 'native, options rejected';
            notes.push(`options rejected: ${error}`);
            break;
          }
        }
      }
    } else {
      support = 'unsupported';

      const typeAware = oxlintRules.find((r) => r.value === name.replace(TS_PREFIX, '') && r.type_aware);

      if (typeAware) {
        notes.push(`only as type-aware \`${typeAware.plugin}/${typeAware.value}\``);
      }

      if (PARSER_PROBES[name]) {
        const reported = probeParser(dir, PARSER_PROBES[name]);

        notes.push(reported.length
          ? `oxlint's parser reports it as a syntax error in ${reported.map((f) => path.extname(f)).join(', ')}`
          : 'not reported by oxlint\'s parser either');
      }
    }

    if (!enabled) {
      notes.push('off in every preset');
    } else if (isNoop(name, js || ts)) {
      notes.push('enabled without options: a no-op in ESLint');
    }

    if (deprecation) {
      notes.push(`ESLint: ${deprecation}`);
    }

    return { name, js, ts, oxlintId, support, category, deprecated: Boolean(meta.deprecated), enabled, notes };
  }));

  const enabledRows = rows.filter((row) => row.enabled);
  const count = (predicate) => enabledRows.filter(predicate).length;
  const supported = (row) => row.support === 'native' || row.support === 'via JS plugin';

  const summary = [
    '| | logic | stylistic | total |',
    '| --- | ---: | ---: | ---: |',
    ...[
      ['native', (r) => r.support === 'native'],
      ['via JS plugin', (r) => r.support === 'via JS plugin'],
      ['native, options rejected', (r) => r.support === 'native, options rejected'],
      ['unsupported', (r) => r.support === 'unsupported'],
      ['**total enabled**', () => true],
    ].map(([label, predicate]) => {
      const logic = count((r) => r.category === 'logic' && predicate(r));
      const stylistic = count((r) => r.category === 'stylistic' && predicate(r));

      return `| ${label} | ${logic} | ${stylistic} | ${logic + stylistic} |`;
    }),
    '',
    `Deprecated in ESLint (enabled): ${count((r) => r.deprecated)} — of which stylistic: ${count((r) => r.deprecated && r.category === 'stylistic')}.`,
  ];

  const unsupportedLogic = enabledRows.filter((r) => r.category === 'logic' && !supported(r));

  const table = [
    '| rule | JS preset | TS preset | oxlint rule | oxlint support | category | note |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map((r) => [
      `\`${r.name}\``,
      formatSetting(r.js),
      formatSetting(r.ts),
      r.oxlintId === '—' ? '—' : `\`${r.oxlintId}\``,
      r.support,
      r.deprecated ? `${r.category} (deprecated)` : r.category,
      r.notes.join('; ').replaceAll('|', '\\|'),
    ].join(' | ')).map((line) => `| ${line} |`),
  ];

  const markdown = [
    '# ESLint → oxlint rule mapping',
    '',
    '<!-- Generated by `npm run audit:oxlint`. Do not edit by hand. -->',
    '',
    `Effective rules of the \`.\` (JS) and \`./typescript\` presets — \`@eslint/js\` recommended,`,
    '`rules.js`, typescript-eslint recommended and the TS overrides — checked against',
    `oxlint ${oxlintVersion}. Options are checked by loading them into oxlint, which rejects`,
    'options that don\'t match the rule\'s schema.',
    '',
    '## Summary (enabled rules)',
    '',
    ...summary,
    '',
    '## Unsupported logic rules',
    '',
    ...(unsupportedLogic.length
      ? unsupportedLogic.map((r) => `- \`${r.name}\`${r.notes.length ? ` — ${r.notes.join('; ')}` : ''}`)
      : ['None.']),
    '',
    '## All rules',
    '',
    ...table,
    '',
  ].join('\n');

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, markdown);

  console.log(summary.join('\n'));
  console.log(`\nUnsupported logic rules (${unsupportedLogic.length}):`);
  unsupportedLogic.forEach((r) => console.log(`  ${r.name}${r.notes.length ? ` — ${r.notes.join('; ')}` : ''}`));
  console.log(`\nWrote ${path.relative(process.cwd(), OUTPUT)}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
