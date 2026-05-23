import { describe, it, expect } from 'vitest';
import { updateFear } from './fear';
import { createInitialState } from './state';

describe('updateFear', () => {
  it('decays fear toward zero each month', () => {
    const s = createInitialState();
    s.fear = 50;
    updateFear(s);
    expect(s.fear).toBeLessThan(50);
    expect(s.fear).toBeGreaterThan(0);
  });

  it('never lets fear fall below the floor', () => {
    const s = createInitialState();
    s.fear = 0;
    updateFear(s);
    expect(s.fear).toBeGreaterThanOrEqual(0);
  });

  it('leaves a maxed-out fear high after one tick (decay is gradual, not instant)', () => {
    const s = createInitialState();
    s.fear = 100;
    updateFear(s);
    expect(s.fear).toBeGreaterThan(90);
  });

  it('decays fearFatigue toward zero each month', () => {
    const s = createInitialState();
    s.fearFatigue = 2;
    updateFear(s);
    expect(s.fearFatigue).toBeLessThan(2);
    expect(s.fearFatigue).toBeGreaterThan(0);
  });
});
