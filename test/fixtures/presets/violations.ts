import { join } from 'node:path';
import assert from 'node:assert';

const name = 'root';

export function load(dir: string): string {
  const name = dir;

  if (name == 'index')
    return eval('null');

  console.log(dir);
  assert.ok(name);

  return join(dir, 'a' + name);
}

export const root = name;
