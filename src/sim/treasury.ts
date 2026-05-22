import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/** This month's tax take: a fraction of the country's total taxable wealth. */
export function taxIncome(state: GameState): number {
  let taxableWealth = 0;
  for (const d of state.districts) {
    taxableWealth += d.wealth * d.population;
  }
  return taxableWealth * state.taxRate * CONSTANTS.taxYield;
}

/**
 * The bureaucracy expands on its own, every month, whether or not the player
 * builds anything — the engine of the fiscal vise (design doc §3.6).
 */
export function growBureaucracy(state: GameState): void {
  state.apparatusUpkeep *= 1 + CONSTANTS.bloatRate;
}

/** Collect tax, record the extraction, and pay the month's apparatus upkeep. */
export function updateTreasury(state: GameState): void {
  const income = taxIncome(state);
  state.treasury += income;
  state.lifetimeExtraction += income;
  state.treasury -= state.apparatusUpkeep;
}
