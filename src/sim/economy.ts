import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * The monthly change in a district's wealth. Taxation and inflation both drag
 * growth down; past a point the drag exceeds base growth and wealth shrinks
 * (the Laffer dynamic, design doc §4.1). Tax and inflation are national, so in
 * this plan every district drifts at the same rate; Plan 2 adds per-district
 * variation.
 */
export function districtWealthDelta(taxRate: number, inflation: number): number {
  const taxDrag = taxRate * CONSTANTS.taxGrowthDrag;
  const inflationDrag = inflation * CONSTANTS.inflationGrowthDrag;
  return CONSTANTS.baseWealthGrowth - taxDrag - inflationDrag;
}

/** Advance every district's wealth by one month, clamped to 0..100. */
export function updateEconomy(state: GameState): void {
  const delta = districtWealthDelta(state.taxRate, state.inflation);
  for (const d of state.districts) {
    d.wealth = clamp(d.wealth + delta, CONSTANTS.wealthFloor, CONSTANTS.wealthCeiling);
  }
}
