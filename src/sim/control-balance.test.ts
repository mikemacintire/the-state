import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { tick } from './tick';
import { runHeadless } from './harness';

describe('control-balance — structural truths', () => {
  it('a miserable, awakened country builds unrest over time', () => {
    const s = createInitialState();
    s.taxRate = 0;
    for (const d of s.districts) {
      d.happiness = 20;
      d.awareness = 80;
      d.unrest = 0;
    }
    for (let i = 0; i < 12; i++) {
      // refresh the meters to keep the pressure on (no economy/inflation
      // dynamics fighting the test setup)
      for (const d of s.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      tick(s);
    }
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThan(0);
    }
  });

  it('high fear suppresses unrest in a miserable, awakened country', () => {
    const setup = () => {
      const s = createInitialState();
      s.taxRate = 0;
      for (const d of s.districts) {
        d.happiness = 20;
        d.awareness = 80;
        d.unrest = 0;
      }
      return s;
    };

    const calm = setup();
    for (let i = 0; i < 12; i++) {
      for (const d of calm.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      tick(calm);
    }

    const afraid = setup();
    for (let i = 0; i < 12; i++) {
      for (const d of afraid.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      afraid.fear = 100; // top up to defeat decay
      tick(afraid);
    }

    expect(afraid.nationalUnrest).toBeLessThan(calm.nationalUnrest);
  });

  it('heavy propaganda holds awareness down in a prosperous country', () => {
    const setup = () => {
      const s = createInitialState();
      s.taxRate = 0;
      for (const d of s.districts) {
        d.wealth = 90;
        d.awareness = 20;
      }
      return s;
    };

    const silent = setup();
    silent.propagandaBudget = 0;
    for (let i = 0; i < 24; i++) tick(silent);

    const loud = setup();
    loud.propagandaBudget = 5000;
    for (let i = 0; i < 24; i++) tick(loud);

    const avg = (s: ReturnType<typeof setup>) =>
      s.districts.reduce((acc, d) => acc + d.awareness, 0) / s.districts.length;

    expect(avg(loud)).toBeLessThan(avg(silent));
  });

  it('emigration drains a deliberately-neglected district', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const i = 0; // outer wards already starts poor; just push it hard
    s.districts[i].awareness = 95;
    s.districts[i].happiness = 5;
    s.districts[i].population = 100_000;
    const initial = s.districts[i].population;
    for (let m = 0; m < 60; m++) {
      // hold the meters at the bad spot so emigration keeps firing
      s.districts[i].awareness = 95;
      s.districts[i].happiness = 5;
      tick(s);
    }
    expect(s.districts[i].population).toBeLessThan(initial);
  });

  it('every run ends in one of the three named loss conditions eventually', () => {
    const r = runHeadless({
      // a stubborn middle path: tax, but build no control
      strategy: () => ({ taxRate: 0.4 }),
      maxMonths: 2400,
    });
    expect(r.lossCause).not.toBeNull();
    expect(['bankruptcy', 'revolt', 'spell-breaks']).toContain(r.lossCause);
  });
});
