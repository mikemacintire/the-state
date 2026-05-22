import { describe, it, expect } from 'vitest';
import { districtWealthDelta, updateEconomy } from './economy';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';

describe('districtWealthDelta', () => {
  it('grows wealth at the base rate when tax and inflation are zero', () => {
    expect(districtWealthDelta(0, 0)).toBeCloseTo(CONSTANTS.baseWealthGrowth);
  });

  it('goes negative when taxation is punishing', () => {
    expect(districtWealthDelta(1, 0)).toBeLessThan(0);
  });

  it('is dragged further down by inflation', () => {
    expect(districtWealthDelta(0, 20)).toBeLessThan(districtWealthDelta(0, 0));
  });

  it('is dragged further down by an education monopoly', () => {
    expect(districtWealthDelta(0, 0, 1)).toBeLessThan(districtWealthDelta(0, 0, 0));
  });

  it('defaults educationLevel to 0 so Plan 1 callers are unaffected', () => {
    expect(districtWealthDelta(0.2, 5)).toBe(districtWealthDelta(0.2, 5, 0));
  });
});

describe('updateEconomy', () => {
  it('raises district wealth under a light tax', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.districts[0].wealth;
    updateEconomy(s);
    expect(s.districts[0].wealth).toBeGreaterThan(before);
  });

  it('never pushes wealth outside 0..100', () => {
    const s = createInitialState();
    s.taxRate = 1;
    for (const d of s.districts) d.wealth = 0.1;
    updateEconomy(s);
    for (const d of s.districts) {
      expect(d.wealth).toBeGreaterThanOrEqual(0);
      expect(d.wealth).toBeLessThanOrEqual(100);
    }
  });
});
