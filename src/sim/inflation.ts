import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Advance inflation one month. Inflation chases its pending `inflationPressure`,
 * closing only a fraction of the gap each month — so it keeps climbing for a
 * while after money is printed, and is slow to come back down (design doc §4.2).
 * The pressure itself decays as it is realised.
 */
export function updateInflation(state: GameState): void {
  const gap = state.inflationPressure - state.inflation;
  state.inflation += gap * CONSTANTS.inflationCatchUp;
  if (state.inflation < 0) state.inflation = 0;
  state.inflationPressure *= CONSTANTS.inflationPressureDecay;
}
