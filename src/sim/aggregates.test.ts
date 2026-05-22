import { describe, it, expect } from 'vitest';
import { updateAggregates } from './aggregates';
import { createInitialState } from './state';

describe('updateAggregates', () => {
  it('reports zero national unrest when every district is calm', () => {
    const s = createInitialState();
    for (const d of s.districts) d.unrest = 0;
    updateAggregates(s);
    expect(s.nationalUnrest).toBe(0);
  });

  it('weights district unrest by population', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.unrest = 0;
      d.population = 100;
    }
    s.districts[0].unrest = 80;
    s.districts[0].population = 1000;
    updateAggregates(s);
    // Only the first district carries any unrest; its population dominates,
    // so national unrest is between 0 and 80.
    expect(s.nationalUnrest).toBeGreaterThan(0);
    expect(s.nationalUnrest).toBeLessThan(80);
  });

  it('rises with national prosperity', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.wealth = 20;
      d.happiness = 20;
    }
    updateAggregates(s);
    const low = s.nationalProsperity;
    for (const d of s.districts) {
      d.wealth = 90;
      d.happiness = 90;
    }
    updateAggregates(s);
    expect(s.nationalProsperity).toBeGreaterThan(low);
  });

  it('handles an empty country without throwing', () => {
    const s = createInitialState();
    for (const d of s.districts) d.population = 0;
    updateAggregates(s);
    expect(s.nationalUnrest).toBe(0);
    expect(s.nationalProsperity).toBe(0);
  });
});
