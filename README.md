### COAX Software ESLint flat config for Node.js/NestJS (ESLint v9)

This package provides a company-wide, shareable ESLint configuration for back-end Node.js and NestJS projects, using ESLint v9 flat config format and preserving the original ruleset as closely as possible.

Required peer dependency in your project:
- ESLint v9 (only)

Install:
- npm: `npm i -D eslint @coaxsoft/eslint-config-be`
- yarn: `yarn add -D eslint @coaxsoft/eslint-config-be`
- pnpm: `pnpm add -D eslint @coaxsoft/eslint-config-be`

Usage (flat config) — Node.js project:
1) Create `eslint.config.js` or `eslint.config.mjs` in your project root:

```
// eslint.config.js in your project
import coax from '@coaxsoft/eslint-config-be'

export default [
  ...coax, // inherits the company rules
]
```

Usage (flat config) — NestJS project:
1) Create `eslint.config.js` in the Nest project root (same as package.json):

```
// eslint.config.js for NestJS
import coax from '@coaxsoft/eslint-config-be'

export default [
  ...coax,
  // Optionally, you may add Nest-specific file globs or overrides
  // for test files, e2e, or scripts:
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      // Example: relax max-len in tests
      'max-len': 'off',
    },
  },
]
```

Extending/overriding rules in your project:
You can add config objects after the spread to tweak any rule.

```
import coax from '@coaxsoft/eslint-config-be'

export default [
  ...coax,
  // Example: turn off no-console completely
  {
    rules: {
      'no-console': 'off',
    },
  },
  // Example: tune indentation and max-len
  {
    rules: {
      indent: ['error', 2, { SwitchCase: 1 }],
      'max-len': ['error', { code: 140 }],
    },
  },
]
```

Running ESLint:
- npx: `npx eslint .`
- npm script: add to package.json — `"lint": "eslint ."`

Notes on migration from legacy ESLint (<9):
- This package now exports a flat config (ESM) and supports ESLint v9 only.
- Removed/renamed rules due to ESLint core changes:
  - id-blacklist -> id-denylist
  - no-native-reassign -> no-global-assign
  - Removed: no-catch-shadow, no-spaced-func, valid-jsdoc, lines-around-directive
- The config targets JavaScript files by default (js/mjs/cjs). For TypeScript projects, pair this with your chosen TypeScript ESLint setup, or add additional overrides.
- You can safely remove the following packages if used in your project:
  - @typescript-eslint/eslint-plugin
  - @typescript-eslint/parser
  - @eslint/eslintrc
  - eslint-plugin-prettier
- Possibly removable, depending on hidden usage
  - @eslint/js
  - globals

Adding TypeScript support (including NestJS)
This package targets JavaScript files by default (js/mjs/cjs). To lint TypeScript in your project, add TypeScript ESLint on top of this base.

If your project is CommonJS (or Node treats `.js` as CommonJS), rename your config file to `eslint.config.mjs` so Node loads it as ESM. If your project is already ESM (for example via `"type": "module"` or using `.mjs`), you can keep using `eslint.config.js`.

Install in your project:
- npm: `npm i -D typescript typescript-eslint`
- yarn: `yarn add -D typescript typescript-eslint`
- pnpm: `pnpm add -D typescript typescript-eslint`

Option A — Fast setup (no type-aware rules)
Good baseline, no need to configure parserOptions.project. Works well for most NestJS repos.

```
// eslint.config.js in your project (TypeScript enabled)
import coax from '@coaxsoft/eslint-config-be'
import tseslint from 'typescript-eslint'

export default [
  ...coax, // company JS rules
  ...tseslint.configs.recommended, // TypeScript rules (non type-aware)
  // Optional: NestJS test overrides
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
]
```

Option B — Type-aware rules (stricter)
Enables rules that require type information (e.g., no-unsafe-*). Slightly slower. Point ESLint to your tsconfig.

```
// eslint.config.js with type-aware TS rules
import coax from '@coaxsoft/eslint-config-be'
import tseslint from 'typescript-eslint'

export default [
  ...coax,
  ...tseslint.configs.recommendedTypeChecked, // enable type-aware rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        // For ESM config files; ensures the project path is resolved correctly
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
      },
    },
  },
]
```

Prettier (optional)
If you use Prettier, add its flat config at the end so it can turn off conflicting style rules:

```
import prettier from 'eslint-config-prettier'

export default [
  // ... your other entries
  prettier,
]
```

Notes
- You do NOT need to disable JS-only rules for TS files here because this shared config limits its files to JS (js/mjs/cjs). The TS configs above apply to .ts/.tsx only.
- For monorepos or custom tsconfig paths, adjust `project` accordingly (e.g., `['./tsconfig.eslint.json']`).
- For Windows portability of `tsconfigRootDir`, prefer:
  ```js
  import { fileURLToPath } from 'node:url'
  import { dirname } from 'node:path'
  const __dirname = dirname(fileURLToPath(import.meta.url))
  // then use: tsconfigRootDir: __dirname
  ```

