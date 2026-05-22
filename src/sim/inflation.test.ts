import { describe, it, expect } from 'vitest';
import { updateInflation } from './inflation';
import { createInitialState } from './state';

describe('updateInflation', () => {
  it('lets inflation keep climbing while pressure sits above it (momentum)', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.inflationPressure = 10;
    updateInflation(s);
    expect(s.inflation).toBeGreaterThan(0);
    expect(s.inflation).toBeLessThan(10);
  });

  it('decays pending pressure over time', () => {
    const s = createInitialState();
    s.inflationPressure = 10;
    updateInflation(s);
    expect(s.inflationPressure).toBeLessThan(10);
  });

  it('never lets inflation fall below zero', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.inflationPressure = 0;
    updateInflation(s);
    expect(s.inflation).toBeGreaterThanOrEqual(0);
  });
});
