# Changelog

## 3.0.0

### Breaking

- `eslint-plugin-simple-import-sort` 12 → 14. If a file imports the same module more than once in different styles (e.g. `import * as a` plus `import { b }`), or uses string literals as export names, the plugin can report it again. `eslint --fix` / `oxlint --fix` sort these files again.

### Added

- TypeScript 6 support: the `typescript` peer range is now `>=4.8.4 <6.1.0`.
- `./oxlint`: an oxlint preset (`oxlint.json`) generated from the ESLint presets. Use it with `"extends"` in `.oxlintrc.json`.
- `./with-oxlint` and `./typescript-with-oxlint`: ESLint presets that turn off the rules the oxlint preset already enforces, for running oxlint and ESLint together.
- `docs/oxlint-rule-mapping.md`: which rules oxlint enforces, which it doesn't, and why.

### Changed

- `eslint` and the new `oxlint` (`^1.76.0`) are optional peer dependencies.
- Dependencies upgraded: `typescript-eslint` 8.71, `@eslint/js` 9.39, `globals` 17. The new `globals` adds Node.js globals such as `fetch` and `AbortController`.
- The published package contains only the presets and docs (`files` allowlist).

## 2.0.0

- ESLint 10 support.
