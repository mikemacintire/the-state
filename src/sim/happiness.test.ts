import { describe, it, expect } from 'vitest';
import { happinessTarget, updateHappiness } from './happiness';
import { createInitialState } from './state';

describe('happinessTarget', () => {
  it('equals wealth when inflation is zero (default scaling)', () => {
    expect(happinessTarget(50, 0)).toBeCloseTo(50);
  });

  it('is dragged down by inflation', () => {
    expect(happinessTarget(50, 10)).toBeLessThan(happinessTarget(50, 0));
  });

  it('never drops below zero', () => {
    expect(happinessTarget(0, 50)).toBe(0);
  });
});

describe('updateHappiness', () => {
  it('drifts each district toward its equilibrium', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.districts[0].wealth = 80;
    s.districts[0].happiness = 20;
    updateHappiness(s);
    expect(s.districts[0].happiness).toBeGreaterThan(20);
    expect(s.districts[0].happiness).toBeLessThan(80);
  });

  it('crushes happiness when inflation is severe', () => {
    const s = createInitialState();
    s.inflation = 100;
    const before = s.districts[0].happiness;
    updateHappiness(s);
    expect(s.districts[0].happiness).toBeLessThan(before);
  });

  it('keeps every district happiness within 0..100', () => {
    const s = createInitialState();
    s.inflation = 500;
    updateHappiness(s);
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThanOrEqual(0);
      expect(d.happiness).toBeLessThanOrEqual(100);
    }
  });
});
