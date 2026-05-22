import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district happiness chases an equilibrium of wealth minus an inflation
 * drag, closing only a fraction of the gap each month (design doc §3.2). Tax
 * does not appear here directly; tax bites happiness indirectly by shrinking
 * wealth via the economy.
 */
export function happinessTarget(wealth: number, inflation: number): number {
  return clamp(
    wealth * CONSTANTS.happinessFromWealth - inflation * CONSTANTS.happinessInflationDrag,
    CONSTANTS.happinessFloor,
    CONSTANTS.happinessCeiling,
  );
}

/** Advance every district's happiness by one month, clamped to 0..100. */
export function updateHappiness(state: GameState): void {
  for (const d of state.districts) {
    const target = happinessTarget(d.wealth, state.inflation);
    d.happiness = clamp(
      d.happiness + (target - d.happiness) * CONSTANTS.happinessCatchUp,
      CONSTANTS.happinessFloor,
      CONSTANTS.happinessCeiling,
    );
  }
}
