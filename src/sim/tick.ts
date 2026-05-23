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
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors
 * design doc §5.1. An optional `onCrisis` handler is forwarded to the event
 * processor; if omitted, crises take their first choice. The catalog defaults
 * to the real `EVENT_CATALOG` but can be overridden in tests to isolate the
 * tick from event firing.
 *
 * When `lossCause === 'spell-breaks'`, the regime is dissolved and a stripped
 * "epilogue" pipeline runs instead: wealth/happiness climb on their own (no
 * tax drag, no inflation, no extraction, no fear) and aggregates recompute —
 * the design doc §5.3 thesis-made-literal, the freed country flourishing on
 * its own. All other loss causes still freeze the run.
 */
export function tick(
  state: GameState,
  onCrisis?: (state: GameState, event: Event) => number,
  catalog: readonly Event[] = EVENT_CATALOG,
): void {
  if (state.lossCause !== null && state.lossCause !== 'spell-breaks') return;

  if (state.lossCause === 'spell-breaks') {
    runEpilogue(state);
    state.month += 1;
    return;
  }

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

/**
 * The spell-breaks epilogue (design doc §5.3): the state has dissolved.
 * Levers, fear, inflation, taxation, the bureaucracy — all zeroed. The
 * simulation keeps running so the player can watch the freed country
 * flourish on its own; they cannot intervene.
 */
function runEpilogue(state: GameState): void {
  // First month after loss: zero out the apparatus. (Idempotent; cheap.)
  state.taxRate = 0;
  state.propagandaBudget = 0;
  state.educationLevel = 0;
  state.fear = 0;
  state.fearFatigue = 0;
  state.inflation = 0;
  state.inflationPressure = 0;
  state.apparatusUpkeep = 0;
  state.treasury = 0;

  // Free-economy growth; misery + watching the state both fade.
  for (const d of state.districts) {
    d.wealth = clamp(d.wealth + CONSTANTS.epilogueWealthGrowth, 0, CONSTANTS.wealthCeiling);
    const happinessTarget = d.wealth;
    d.happiness = clamp(
      d.happiness + (happinessTarget - d.happiness) * CONSTANTS.happinessCatchUp,
      CONSTANTS.happinessFloor,
      CONSTANTS.happinessCeiling,
    );
    d.awareness *= 0.95; // no state to be aware of
    d.unrest *= 0.9; // anger fades fast in a free country
  }

  updateAggregates(state);
}
