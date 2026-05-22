import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/** Lever 1 — Taxation. Set the standing tax rate (clamped to 0..1). */
export function setTaxRate(state: GameState, rate: number): void {
  state.taxRate = clamp(rate, 0, 1);
}

/**
 * Lever 2 — Money printing. Instant cash, but it adds inflation pressure that
 * will be realised as inflation over the following months (design doc §4.2).
 */
export function printMoney(state: GameState, amount: number): void {
  if (amount <= 0) return;
  state.treasury += amount;
  state.lifetimeExtraction += amount;
  state.inflationPressure += (amount / 1000) * CONSTANTS.printInflationPerThousand;
}

/** Lever 3 — Propaganda. Set the standing monthly propaganda budget (>=0). */
export function setPropagandaBudget(state: GameState, dollars: number): void {
  state.propagandaBudget = Math.max(0, dollars);
}

/** Lever 4 — Education monopoly. Set the level (0..1). Higher = more state grip. */
export function setEducationLevel(state: GameState, level: number): void {
  state.educationLevel = clamp(level, 0, 1);
}

/**
 * Lever 5 — Repression. Direct force: cuts unrest fast across every district,
 * but spikes awareness sharply — the moment the mask slips (design doc §4.5).
 * Costs treasury. Does nothing if the state cannot afford it.
 */
export function doRepression(state: GameState): void {
  if (state.treasury < CONSTANTS.repressionCost) return;
  state.treasury -= CONSTANTS.repressionCost;
  for (const d of state.districts) {
    d.unrest = Math.max(0, d.unrest - CONSTANTS.repressionUnrestCut);
    d.awareness = Math.min(
      CONSTANTS.awarenessCeiling,
      d.awareness + CONSTANTS.awarenessRepressionSpike,
    );
  }
}
