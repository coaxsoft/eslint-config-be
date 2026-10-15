import assert from 'node:assert';
import { join } from 'node:path';

export function load(dir, name) {
  if (name === 'index') {
    return null;
  }

  console.warn(dir);
  assert.ok(name);

  return join(dir, `a${name}`);
}
