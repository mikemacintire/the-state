import { describe, it, expect } from 'vitest';
import { CONSTANTS } from './constants';

describe('CONSTANTS', () => {
  it('exposes positive economic and fiscal parameters', () => {
    expect(CONSTANTS.baseWealthGrowth).toBeGreaterThan(0);
    expect(CONSTANTS.taxYield).toBeGreaterThan(0);
    expect(CONSTANTS.startingTreasury).toBeGreaterThan(0);
    expect(CONSTANTS.initialUpkeep).toBeGreaterThan(0);
  });

  it('keeps rates as sensible fractions', () => {
    expect(CONSTANTS.startingTaxRate).toBeGreaterThanOrEqual(0);
    expect(CONSTANTS.startingTaxRate).toBeLessThanOrEqual(1);
    expect(CONSTANTS.bloatRate).toBeGreaterThan(0);
    expect(CONSTANTS.bloatRate).toBeLessThan(0.1);
    expect(CONSTANTS.inflationPressureDecay).toBeGreaterThan(0);
    expect(CONSTANTS.inflationPressureDecay).toBeLessThan(1);
  });
});
