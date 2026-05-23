import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { INITIAL_DISTRICTS } from '../content/districts';

/** Build a fresh GameState for a new run. `seed` makes the run reproducible. */
export function createInitialState(seed: number = 1): GameState {
  return {
    month: 0,
    rng: seed >>> 0,
    treasury: CONSTANTS.startingTreasury,
    lifetimeExtraction: 0,
    inflation: 0,
    inflationPressure: 0,
    taxRate: CONSTANTS.startingTaxRate,
    apparatusUpkeep: CONSTANTS.initialUpkeep,
    propagandaBudget: 0,
    educationLevel: 0,
    fear: 0,
    nationalUnrest: 0,
    nationalProsperity: 0,
    eventLog: [],
    pendingEvents: [],
    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    lossCause: null,
  };
}
