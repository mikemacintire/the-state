import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * National fear decays each month and must be re-manufactured to stay up
 * (design doc §3.5). `fearFatigue` decays here too, more slowly than fear
 * itself — so the population eventually accepts new threats again, but only
 * after a few quiet months.
 */
export function updateFear(state: GameState): void {
  state.fear *= CONSTANTS.fearDecay;
  if (state.fear < CONSTANTS.fearFloor) state.fear = CONSTANTS.fearFloor;
  state.fearFatigue *= CONSTANTS.fearFatigueDecay;
  if (state.fearFatigue < 0) state.fearFatigue = 0;
}
