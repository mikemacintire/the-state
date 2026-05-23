import { describe, it, expect } from 'vitest';
import { tick } from './tick';
import { createInitialState } from './state';

describe('tick', () => {
  it('advances the calendar by one month', () => {
    const s = createInitialState();
    tick(s);
    expect(s.month).toBe(1);
  });

  it('runs the economy — district wealth moves', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.districts[0].wealth;
    tick(s);
    expect(s.districts[0].wealth).not.toBe(before);
  });

  it('settles the treasury — upkeep is paid', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.treasury;
    tick(s);
    expect(s.treasury).toBeLessThan(before);
  });

  it('grows the bureaucracy each tick', () => {
    const s = createInitialState();
    const before = s.apparatusUpkeep;
    tick(s);
    expect(s.apparatusUpkeep).toBeGreaterThan(before);
  });

  it('does not advance a run that is already over', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    tick(s);
    expect(s.month).toBe(0);
  });

  it('drifts district happiness toward its equilibrium each tick', () => {
    const s = createInitialState();
    s.taxRate = 0;
    for (const d of s.districts) {
      d.wealth = 80;
      d.happiness = 30;
    }
    tick(s);
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThan(30);
    }
  });

  it('decays national fear each tick', () => {
    const s = createInitialState();
    s.fear = 50;
    tick(s);
    expect(s.fear).toBeLessThan(50);
  });

  it('computes national aggregates each tick', () => {
    const s = createInitialState();
    for (const d of s.districts) d.unrest = 30;
    tick(s);
    expect(s.nationalUnrest).toBeGreaterThan(0);
  });

  it('runs the emigration step (a deliberately-neglected district shrinks)', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.districts[0].awareness = 95;
    s.districts[0].happiness = 5;
    s.districts[0].population = 100_000;
    tick(s);
    expect(s.districts[0].population).toBeLessThan(100_000);
  });
});
