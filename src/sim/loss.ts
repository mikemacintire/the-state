import type { GameState } from './types';

/**
 * Detect a finished run. In this plan, the only loss is bankruptcy — an empty
 * treasury. Plan 2 extends this with 'revolt' and 'spell-breaks', and refines
 * bankruptcy into the unrest cascade of design doc §3.6.
 */
export function checkLoss(state: GameState): void {
  if (state.lossCause !== null) return;
  if (state.treasury <= 0) {
    state.lossCause = 'bankruptcy';
  }
}
