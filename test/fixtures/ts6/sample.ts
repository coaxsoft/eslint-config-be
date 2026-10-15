const cache = new Map<string, number[]>();

export function track(key: string, value: number): number[] {
  const bucket = cache.getOrInsert(key, []);
  bucket.push(value);

  return bucket;
}

export function today(): string {
  return Temporal.Now.plainDateISO().toString();
}

export function escapePattern(input: string): RegExp {
  const value = RegExp.escape(input);

  return new RegExp(value);
}
