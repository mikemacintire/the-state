import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Detect a finished run. Three loss causes (design doc §3.4, §3.6):
 *
 * - **Bankruptcy** — treasury at zero is no longer an instant loss. Per §3.6
 *   it "pries the player's hands off the controls": once `bankruptSince`
 *   is set, propaganda and education become ineffective (handled in their
 *   update functions), so unrest builds; the run ends `bankruptcy` once
 *   unrest crosses revoltThreshold OR `bankruptcyGraceMonths` elapse,
 *   whichever comes first. The defeat screen names the true cause.
 * - **Revolt** — unrest hits threshold without going bankrupt first.
 * - **Spell Breaks** — prosperity hits threshold. The simulation keeps
 *   running afterward in a stripped epilogue mode (see tick.ts).
 */
export function checkLoss(state: GameState): void {
  if (state.lossCause !== null) return;

  // Latch bankruptcy the first month treasury goes non-positive.
  if (state.treasury <= 0 && state.bankruptSince === null) {
    state.bankruptSince = state.month;
  }

  if (state.bankruptSince !== null) {
    // The cascade: closes either via unrest or by the grace timer.
    if (state.nationalUnrest >= CONSTANTS.revoltThreshold) {
      state.lossCause = 'bankruptcy';
      return;
    }
    if (state.month - state.bankruptSince >= CONSTANTS.bankruptcyGraceMonths) {
      state.lossCause = 'bankruptcy';
      return;
    }
    // Bankrupt but neither condition hit yet — keep playing the slow death.
  } else if (state.nationalUnrest >= CONSTANTS.revoltThreshold) {
    state.lossCause = 'revolt';
    return;
  }

  if (state.nationalProsperity >= CONSTANTS.spellBreaksThreshold) {
    state.lossCause = 'spell-breaks';
    return;
  }
}
