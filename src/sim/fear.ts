import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * National fear decays each month and must be re-manufactured to stay up
 * (design doc §3.5). Plan 2 implements only fear's decay; fatigue, exposure,
 * and real-harm-vs-perceived-harm are event-layer concerns (Plan 3).
 */
export function updateFear(state: GameState): void {
  state.fear *= CONSTANTS.fearDecay;
  if (state.fear < CONSTANTS.fearFloor) state.fear = CONSTANTS.fearFloor;
}
