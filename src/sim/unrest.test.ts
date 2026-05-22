import { describe, it, expect } from 'vitest';
import { unrestPressure, updateUnrest } from './unrest';
import { createInitialState } from './state';

describe('unrestPressure', () => {
  it('is zero when people are happy', () => {
    expect(unrestPressure(100, 80, 0, 0)).toBe(0);
  });

  it('is zero when people are unaware, even if miserable', () => {
    expect(unrestPressure(0, 0, 0, 0)).toBe(0);
  });

  it('rises when both misery and awareness are high', () => {
    expect(unrestPressure(20, 80, 0, 0)).toBeGreaterThan(0);
  });

  it('is reduced by fear', () => {
    expect(unrestPressure(20, 80, 50, 0)).toBeLessThan(unrestPressure(20, 80, 0, 0));
  });

  it('is reduced by propaganda', () => {
    expect(unrestPressure(20, 80, 0, 5000)).toBeLessThan(unrestPressure(20, 80, 0, 0));
  });

  it('never goes negative under overwhelming suppression', () => {
    expect(unrestPressure(50, 100, 100, 100_000)).toBeGreaterThanOrEqual(0);
  });
});

describe('updateUnrest', () => {
  it('grows unrest in a miserable, awakened, unsuppressed district', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.happiness = 20;
      d.awareness = 80;
      d.unrest = 0;
    }
    s.fear = 0;
    s.propagandaBudget = 0;
    updateUnrest(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThan(0);
    }
  });

  it('keeps unrest within 0..100', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.happiness = 0;
      d.awareness = 100;
      d.unrest = 100;
    }
    updateUnrest(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThanOrEqual(0);
      expect(d.unrest).toBeLessThanOrEqual(100);
    }
  });
});
