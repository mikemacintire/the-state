import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Detect a finished run. Three loss conditions, checked in priority order:
 *
 * 1. **Bankruptcy** — treasury at zero. (Cascades into revolt in the design's
 *    narrative since a broke state cannot pay its propagandists or enforcers,
 *    but the proximate cause is bankruptcy, so the run is named that way.)
 * 2. **Revolt** — population-weighted national unrest at or above the threshold.
 * 3. **Spell Breaks** — population-weighted national prosperity at or above the
 *    threshold (the people stop needing the state).
 */
export function checkLoss(state: GameState): void {
  if (state.lossCause !== null) return;
  if (state.treasury <= 0) {
    state.lossCause = 'bankruptcy';
    return;
  }
  if (state.nationalUnrest >= CONSTANTS.revoltThreshold) {
    state.lossCause = 'revolt';
    return;
  }
  if (state.nationalProsperity >= CONSTANTS.spellBreaksThreshold) {
    state.lossCause = 'spell-breaks';
    return;
  }
}
