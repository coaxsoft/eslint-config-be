# @coaxsoft/eslint-config-be

Shareable lint config for Node.js projects. Works with ESLint (flat config), with [oxlint](https://oxc.rs/docs/guide/usage/linter), or with both.

## Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| `eslint` | `^10` | ESLint and hybrid presets |
| `oxlint` | `^1.76.0` | oxlint and hybrid presets |
| `typescript` | `>=4.8.4 <6.1.0` | TypeScript presets (TypeScript 7 isn't supported by `typescript-eslint` yet) |

All three are optional peer dependencies: install the ones your project uses.

## Presets

| Import path | Tool | Files |
| --- | --- | --- |
| `@coaxsoft/eslint-config-be` | ESLint | `*.js`, `*.mjs` (ESM), `*.cjs` (CommonJS) |
| `@coaxsoft/eslint-config-be/typescript` | ESLint | the above + `*.ts`, `*.mts`, `*.cts` |
| `@coaxsoft/eslint-config-be/oxlint` | oxlint | JS and TS |
| `@coaxsoft/eslint-config-be/with-oxlint` | ESLint, next to oxlint | JS |
| `@coaxsoft/eslint-config-be/typescript-with-oxlint` | ESLint, next to oxlint | JS and TS |

The ESLint presets include `eslint:recommended`, the shared rules in `rules.js`, `simple-import-sort` and, for TypeScript, `typescript-eslint` recommended. Globals: Node.js and Mocha.

## ESLint only

`eslint.config.mjs`

```js
import coaxsoft from '@coaxsoft/eslint-config-be';

export default [
  ...coaxsoft,
];
```

For TypeScript, import `@coaxsoft/eslint-config-be/typescript` instead.

The TypeScript preset is syntax-only. For type-aware linting, add a local override:

```js
import coaxsoftTypeScript from '@coaxsoft/eslint-config-be/typescript';

export default [
  ...coaxsoftTypeScript,
  {
    files: ['**/*.{ts,mts,cts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
];
```

Use `parserOptions.project` instead of `projectService` if your project prefers explicit `tsconfig` wiring.

## oxlint only

`.oxlintrc.json`

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "extends": ["./node_modules/@coaxsoft/eslint-config-be/oxlint.json"]
}
```

```sh
npx oxlint
```

Rules you add to `.oxlintrc.json` override the preset's rules. This also works for projects created by the Nest CLI, so you can keep its `--type-aware` rules such as `typescript/no-floating-promises`.

Notes:

- The preset covers the logic rules of the ESLint presets. Formatting rules are left out; use Prettier for formatting.
- Import sorting runs `eslint-plugin-simple-import-sort` through oxlint's [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html), so `oxlint --fix` sorts imports. JS plugins are still alpha in oxlint.
- oxlint doesn't inherit `ignorePatterns` through `extends`. It reads `.gitignore`, so keep `node_modules` and build output there, or add `ignorePatterns` to your own `.oxlintrc.json`.

## oxlint + ESLint (hybrid)

Run oxlint first and ESLint second. The hybrid ESLint presets turn off every rule the oxlint preset already enforces, so each problem is reported once: oxlint reports logic errors and ESLint reports what oxlint can't check, mostly formatting.

`.oxlintrc.json`: same as in [oxlint only](#oxlint-only).

`eslint.config.mjs`

```js
import coaxsoft from '@coaxsoft/eslint-config-be/typescript-with-oxlint';

export default [
  ...coaxsoft,
];
```

Use `@coaxsoft/eslint-config-be/with-oxlint` for JavaScript-only projects.

`package.json`

```json
{
  "scripts": {
    "lint": "oxlint && eslint ."
  }
}
```

## Rules not enforced by oxlint

oxlint enforces 136 of the 183 enabled rules natively, and the 2 `simple-import-sort` rules through a JS plugin. The full table is in [docs/oxlint-rule-mapping.md](docs/oxlint-rule-mapping.md).

Logic rules that only ESLint enforces:

- `consistent-this`, `no-undef-init`: not implemented in oxlint.
- `dot-notation`: oxlint has it only as a type-aware TypeScript rule.
- `no-return-await`: deprecated in ESLint.
- `no-dupe-args`, `no-octal`: oxlint's parser reports these as syntax errors in ESM and TypeScript files, but not in `.cjs` files.
- `no-restricted-modules`, `no-restricted-syntax`: enabled without options, so they do nothing.

All formatting rules (`indent`, `quotes`, `max-len`, `newline-before-return`, …) are ESLint-only. ESLint has deprecated them all.

## ESLint 9 and `.eslintrc`

Version 3 requires ESLint 10, which no longer supports `.eslintrc`. For ESLint 9 or the `.eslintrc` format (`@coaxsoft/eslint-config-be/legacy`), use version 2:

```sh
npm install --save-dev @coaxsoft/eslint-config-be@^2
```

## Development

- `npm test` runs the tests: preset smoke tests, TypeScript 6, oxlint config in sync, and fixtures linted by ESLint, oxlint and the hybrid presets.
- `npm run build:oxlint` regenerates `oxlint.json` and `oxlint-overlap.json` from the ESLint presets. Run it after changing `rules.js` or `typescript.js`, or after upgrading a dependency. The tests fail while these files are stale.
- `npm run audit:oxlint` regenerates `docs/oxlint-rule-mapping.md`.
