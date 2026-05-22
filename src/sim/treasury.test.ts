import { describe, it, expect } from 'vitest';
import { taxIncome, growBureaucracy, updateTreasury } from './treasury';
import { createInitialState } from './state';

describe('taxIncome', () => {
  it('is zero when the tax rate is zero', () => {
    const s = createInitialState();
    s.taxRate = 0;
    expect(taxIncome(s)).toBe(0);
  });

  it('is positive when the state taxes a populated, wealthy country', () => {
    const s = createInitialState();
    s.taxRate = 0.3;
    expect(taxIncome(s)).toBeGreaterThan(0);
  });
});

describe('growBureaucracy', () => {
  it('expands apparatus upkeep on its own, every month', () => {
    const s = createInitialState();
    const before = s.apparatusUpkeep;
    growBureaucracy(s);
    expect(s.apparatusUpkeep).toBeGreaterThan(before);
  });
});

describe('updateTreasury', () => {
  it('adds tax income and records it as lifetime extraction', () => {
    const s = createInitialState();
    s.taxRate = 0.3;
    s.apparatusUpkeep = 0;
    updateTreasury(s);
    expect(s.lifetimeExtraction).toBeGreaterThan(0);
  });

  it('deducts apparatus upkeep from the treasury', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.apparatusUpkeep = 1000;
    const before = s.treasury;
    updateTreasury(s);
    expect(s.treasury).toBe(before - 1000);
  });
});
