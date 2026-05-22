import type { GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { growBureaucracy, updateTreasury } from './treasury';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors design
 * doc §5.1; steps not yet built are marked for the plan that adds them.
 */
export function tick(state: GameState): void {
  if (state.lossCause !== null) return; // a finished run does not advance

  // 1. Economy
  updateEconomy(state);

  // 2. Meters — Plan 1: inflation only. Plan 2 adds happiness/awareness/unrest/fear.
  updateInflation(state);

  // 3. Population (emigration) — Plan 2.

  // 4. Treasury
  growBureaucracy(state);
  updateTreasury(state);

  // 5. Aggregates (national unrest, prosperity) — Plan 2.
  // 6. Events — Plan 3.

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
