import { describe, it, expect } from 'vitest';
import { INITIAL_DISTRICTS } from './districts';

describe('INITIAL_DISTRICTS', () => {
  it('defines exactly nine districts', () => {
    expect(INITIAL_DISTRICTS).toHaveLength(9);
  });

  it('gives every district a unique id', () => {
    const ids = INITIAL_DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('starts every district with a positive population and wealth in 0..100', () => {
    for (const d of INITIAL_DISTRICTS) {
      expect(d.population).toBeGreaterThan(0);
      expect(d.wealth).toBeGreaterThanOrEqual(0);
      expect(d.wealth).toBeLessThanOrEqual(100);
    }
  });
});
