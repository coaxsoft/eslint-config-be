# @coaxsoft/eslint-config-be

Shareable ESLint config for Node.js projects using flat config.

## Requirements

- `eslint` `^9 || ^10`
- `typescript` `>=4.8.4 <6` only when using the TypeScript preset

## JavaScript usage

The default export targets Node.js projects and applies:

- ESM rules to `*.js` and `*.mjs`
- CommonJS rules to `*.cjs`
- `eslint:recommended`
- `simple-import-sort`

`eslint.config.mjs`

```js
import coaxsoft from '@coaxsoft/eslint-config-be';

export default [
  ...coaxsoft,
];
```

## TypeScript usage

Use the dedicated TypeScript preset for `*.ts`, `*.mts`, and `*.cts`.

`eslint.config.mjs`

```js
import coaxsoftTypeScript from '@coaxsoft/eslint-config-be/typescript';

export default [
  ...coaxsoftTypeScript,
];
```

This preset is syntax-only by default. It includes the TypeScript parser, `typescript-eslint` recommended rules, and the shared base rules from this package.

If your project wants type-aware linting, add a local override:

`eslint.config.mjs`

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

## Legacy usage

If you still need `.eslintrc` format, use the legacy subpath:

`.eslintrc.cjs`

```js
module.exports = {
  extends: ['@coaxsoft/eslint-config-be/legacy'],
};
```
