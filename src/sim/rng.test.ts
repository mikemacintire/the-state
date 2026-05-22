import { describe, it, expect } from 'vitest';
import { nextRandom } from './rng';

describe('nextRandom', () => {
  it('returns a value in [0, 1)', () => {
    const { value } = nextRandom(12345);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('is deterministic for the same input state', () => {
    expect(nextRandom(999)).toEqual(nextRandom(999));
  });

  it('produces a varied sequence when chained through its returned state', () => {
    let state = 42;
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const r = nextRandom(state);
      seen.add(r.value);
      state = r.rngState;
    }
    expect(seen.size).toBeGreaterThan(15);
  });
});
