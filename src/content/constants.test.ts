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

  it('exposes positive Plan 2 meter and lever parameters', () => {
    expect(CONSTANTS.happinessFromWealth).toBeGreaterThan(0);
    expect(CONSTANTS.awarenessFromInflation).toBeGreaterThan(0);
    expect(CONSTANTS.unrestMiseryFactor).toBeGreaterThan(0);
    expect(CONSTANTS.repressionCost).toBeGreaterThan(0);
    expect(CONSTANTS.repressionUnrestCut).toBeGreaterThan(0);
    expect(CONSTANTS.fearOpCostPerUnit).toBeGreaterThan(0);
    expect(CONSTANTS.educationUpkeepPerLevel).toBeGreaterThan(0);
  });

  it('keeps Plan 2 fractions and thresholds in sensible ranges', () => {
    expect(CONSTANTS.fearDecay).toBeGreaterThan(0);
    expect(CONSTANTS.fearDecay).toBeLessThan(1);
    expect(CONSTANTS.unrestDecay).toBeGreaterThan(0);
    expect(CONSTANTS.unrestDecay).toBeLessThan(1);
    expect(CONSTANTS.happinessCatchUp).toBeGreaterThan(0);
    expect(CONSTANTS.happinessCatchUp).toBeLessThan(1);
    expect(CONSTANTS.revoltThreshold).toBeGreaterThan(0);
    expect(CONSTANTS.revoltThreshold).toBeLessThan(100);
    expect(CONSTANTS.spellBreaksThreshold).toBeGreaterThan(0);
    expect(CONSTANTS.spellBreaksThreshold).toBeLessThanOrEqual(100);
    expect(CONSTANTS.emigrationRate).toBeGreaterThan(0);
    expect(CONSTANTS.emigrationRate).toBeLessThan(1);
    expect(CONSTANTS.prosperityWealthWeight + CONSTANTS.prosperityHappinessWeight).toBeCloseTo(1);
  });
});
