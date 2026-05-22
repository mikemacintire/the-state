import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Population-weighted national meters (design doc §3.4). National unrest drives
 * the Revolt loss; national prosperity drives the Spell Breaks loss. Prosperity
 * is a weighted blend of district wealth and happiness.
 */
export function updateAggregates(state: GameState): void {
  let totalPop = 0;
  let weightedUnrest = 0;
  let weightedProsperity = 0;
  for (const d of state.districts) {
    totalPop += d.population;
    weightedUnrest += d.unrest * d.population;
    const localProsperity =
      d.wealth * CONSTANTS.prosperityWealthWeight +
      d.happiness * CONSTANTS.prosperityHappinessWeight;
    weightedProsperity += localProsperity * d.population;
  }
  state.nationalUnrest = totalPop > 0 ? weightedUnrest / totalPop : 0;
  state.nationalProsperity = totalPop > 0 ? weightedProsperity / totalPop : 0;
}
