import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * The monthly change in a district's wealth. Taxation, inflation, and an
 * education monopoly all drag growth down; past a point the drag exceeds base
 * growth and wealth shrinks (the Laffer dynamic, design doc §4.1; education's
 * docility-for-productivity tradeoff, §4.4). Tax/inflation/education are
 * national, so in this plan every district drifts at the same rate.
 */
export function districtWealthDelta(
  taxRate: number,
  inflation: number,
  educationLevel: number = 0,
): number {
  const taxDrag = taxRate * CONSTANTS.taxGrowthDrag;
  const inflationDrag = inflation * CONSTANTS.inflationGrowthDrag;
  const educationDrag = educationLevel * CONSTANTS.educationWealthDrag;
  return CONSTANTS.baseWealthGrowth - taxDrag - inflationDrag - educationDrag;
}

/** Advance every district's wealth by one month, clamped to 0..100. */
export function updateEconomy(state: GameState): void {
  const delta = districtWealthDelta(state.taxRate, state.inflation, state.educationLevel);
  for (const d of state.districts) {
    d.wealth = clamp(d.wealth + delta, CONSTANTS.wealthFloor, CONSTANTS.wealthCeiling);
  }
}
