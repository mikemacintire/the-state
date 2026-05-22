import { describe, it, expect } from 'vitest';
import { runHeadless } from './harness';

describe('runHeadless', () => {
  it('stops at maxMonths when the state survives that long', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 24 });
    expect(r.monthsSurvived).toBeLessThanOrEqual(24);
  });

  it('returns a RunResult with all three fields', () => {
    const r = runHeadless({ strategy: () => ({}), maxMonths: 12 });
    expect(r).toHaveProperty('monthsSurvived');
    expect(r).toHaveProperty('lifetimeExtraction');
    expect(r).toHaveProperty('lossCause');
  });

  it('is deterministic for the same seed and strategy', () => {
    const opts = { seed: 5, strategy: () => ({ taxRate: 0.25 }), maxMonths: 60 };
    expect(runHeadless(opts)).toEqual(runHeadless(opts));
  });
});
