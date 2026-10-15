import { join } from 'node:path';
import assert from 'node:assert';

export function load(dir, name) {
  if (name == 'index')
    return eval("null");

  console.log(dir);
  assert.ok(name);

  return join(dir, 'a' + name);
}
