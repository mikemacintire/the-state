import type { Event, GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { updateHappiness } from './happiness';
import { updateAwareness } from './awareness';
import { updateUnrest } from './unrest';
import { updateFear } from './fear';
import { updateEmigration } from './emigration';
import { growBureaucracy, updateTreasury } from './treasury';
import { updateAggregates } from './aggregates';
import { processEvents } from './events';
import { EVENT_CATALOG } from '../content/event-catalog';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors
 * design doc §5.1. An optional `onCrisis` handler is forwarded to the event
 * processor; if omitted, crises take their first choice. The catalog defaults
 * to the real `EVENT_CATALOG` but can be overridden in tests to isolate the
 * tick from event firing.
 */
export function tick(
  state: GameState,
  onCrisis?: (state: GameState, event: Event) => number,
  catalog: readonly Event[] = EVENT_CATALOG,
): void {
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

  // 6. Events
  processEvents(state, catalog, onCrisis);

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
