import assert from 'node:assert';
import { join } from 'node:path';

interface Options {
  dir: string;
}

export function load({ dir }: Options, name: string): string {
  assert.ok(name);

  return join(dir, `a${name}`);
}
