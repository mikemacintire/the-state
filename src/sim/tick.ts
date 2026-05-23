import type { GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { updateHappiness } from './happiness';
import { updateAwareness } from './awareness';
import { updateUnrest } from './unrest';
import { updateFear } from './fear';
import { updateEmigration } from './emigration';
import { growBureaucracy, updateTreasury } from './treasury';
import { updateAggregates } from './aggregates';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors
 * design doc §5.1. Step 6 (events) is filled in by Plan 3.
 */
export function tick(state: GameState): void {
  if (state.lossCause !== null) return; // a finished run does not advance

  // 1. Economy
  updateEconomy(state);

  // 2. Meters
  updateInflation(state);
  updateHappiness(state);
  updateAwareness(state);
  updateUnrest(state);
  updateFear(state);

  // 3. Population (emigration)
  updateEmigration(state);

  // 4. Treasury
  growBureaucracy(state);
  updateTreasury(state);

  // 5. Aggregates (national unrest, prosperity)
  updateAggregates(state);

  // 6. Events — Plan 3.

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
