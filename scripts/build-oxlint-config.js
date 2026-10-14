#!/usr/bin/env node
// Generates oxlint.json from the effective rules of the ESLint presets, so both stay in sync.
// Run `npm run build:oxlint` after changing rules.js, typescript.js or upgrading a dependency.

const fs = require('node:fs');
const path = require('node:path');

const {
  ALL_CATEGORIES_OFF,
  findJsPlugin,
  findOxlintRule,
  getCategory,
  getEffectiveRules,
  getOxlintRules,
} = require('./lib/rules');

const OUTPUT = path.join(__dirname, '..', 'oxlint.json');

// Same files as the TypeScript entries in typescript.js.
const TS_FILES = ['**/*.ts', '**/*.mts', '**/*.cts'];

// Formatting is Prettier's job; these stylistic rules are kept because they aren't formatting.
const KEPT_STYLISTIC = new Set([
  'unicode-bom',
  'simple-import-sort/imports',
  'simple-import-sort/exports',
]);

const toOxlintSetting = ({ severity, options }) => (options.length ? [severity, ...options] : severity);

const isOff = (setting) => [].concat(setting)[0] === 'off';

const sortKeys = (object) => Object.fromEntries(Object.entries(object).sort(([a], [b]) => a.localeCompare(b)));

// Maps one preset's ESLint rules to oxlint rule ids. Several ESLint rules can map to one oxlint rule
// (`no-shadow` and `@typescript-eslint/no-shadow`): the enabled one wins.
const mapPreset = (rules, oxlintRules, jsPlugins, plugins) => {
  const mapped = {};

  for (const [name, setting] of Object.entries(rules)) {
    if (getCategory(name) === 'stylistic' && !KEPT_STYLISTIC.has(name)) {
      continue;
    }

    const jsPlugin = findJsPlugin(name);
    const native = jsPlugin ? null : findOxlintRule(name, oxlintRules);

    if (!jsPlugin && !native) {
      continue;
    }

    const id = jsPlugin ? name : native.id;
    const value = toOxlintSetting(setting);

    if (jsPlugin) {
      jsPlugins.add(jsPlugin.specifier);
    } else {
      plugins.add(native.plugin);
    }

    if (id in mapped && !isOff(mapped[id])) {
      if (!isOff(value) && JSON.stringify(mapped[id]) !== JSON.stringify(value)) {
        throw new Error(`${name} and another enabled rule both map to ${id} with different settings`);
      }
      continue;
    }

    mapped[id] = value;
  }

  return mapped;
};

const buildOxlintConfig = async () => {
  const effective = await getEffectiveRules();
  const oxlintRules = getOxlintRules();
  const jsPlugins = new Set();
  const plugins = new Set();

  const javascript = mapPreset(effective.javascript, oxlintRules, jsPlugins, plugins);
  const typescript = mapPreset(effective.typescript, oxlintRules, jsPlugins, plugins);

  const rules = Object.fromEntries(Object.entries(javascript).filter(([, value]) => !isOff(value)));
  const typescriptRules = {};

  for (const id of new Set([...Object.keys(rules), ...Object.keys(typescript)])) {
    const value = typescript[id] ?? 'off';

    if (JSON.stringify(value) !== JSON.stringify(rules[id] ?? 'off')) {
      typescriptRules[id] = value;
    }
  }

  return {
    $schema: `https://unpkg.com/oxlint@${require('oxlint/package.json').version}/configuration_schema.json`,
    categories: ALL_CATEGORIES_OFF,
    plugins: [...plugins].sort(),
    jsPlugins: [...jsPlugins].sort(),
    rules: sortKeys(rules),
    overrides: [
      // Same globals as globals.node + globals.mocha in the ESLint presets. Kept in an override because
      // oxlint doesn't inherit a top-level `env` (or `globals`) through `extends`, but does inherit overrides.
      {
        files: ['**/*'],
        env: {
          node: true,
          mocha: true,
        },
      },
      {
        files: TS_FILES,
        rules: sortKeys(typescriptRules),
      },
    ],
  };
};

const serialize = (config) => `${JSON.stringify(config, null, 2)}\n`;

if (require.main === module) {
  buildOxlintConfig()
    .then((config) => {
      fs.writeFileSync(OUTPUT, serialize(config));
      console.log(`Wrote ${path.relative(process.cwd(), OUTPUT)}: ${Object.keys(config.rules).length} rules, `
        + `${Object.keys(config.overrides[1].rules).length} TypeScript overrides`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}

module.exports = { OUTPUT, buildOxlintConfig, serialize };
