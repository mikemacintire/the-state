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
