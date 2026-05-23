import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';
import { injectFearWithFatigue } from './escalation';

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
 * The awareness spike escalates with `state.repressionUses` so the second
 * crackdown stings more than the first and the tenth is a self-inflicted
 * crisis. Costs treasury. Does nothing if the state cannot afford it.
 */
export function doRepression(state: GameState): void {
  if (state.treasury < CONSTANTS.repressionCost) return;
  state.treasury -= CONSTANTS.repressionCost;
  state.repressionUses += 1;
  const escalation = 1 + (state.repressionUses - 1) * CONSTANTS.repressionEscalationPerUse;
  const spike = CONSTANTS.awarenessRepressionSpike * escalation;
  for (const d of state.districts) {
    d.unrest = Math.max(0, d.unrest - CONSTANTS.repressionUnrestCut);
    d.awareness = Math.min(CONSTANTS.awarenessCeiling, d.awareness + spike);
  }
}

/**
 * Lever 6 — Manufactured threats. Inject fear at a per-unit cost — the
 * keystone tool that suppresses unrest, awareness, and prosperity all at once
 * (design doc §3.5, §4.6). Fear lands through `injectFearWithFatigue`, so
 * repeated ops have diminishing potency (the §3.5 fatigue catch). Plan 3's
 * events differentiate this into false flags, foreign campaigns, provocations,
 * and wars.
 */
export function spawnFearOp(state: GameState, fearAmount: number): void {
  if (fearAmount <= 0) return;
  const cost = fearAmount * CONSTANTS.fearOpCostPerUnit;
  if (state.treasury < cost) return;
  state.treasury -= cost;
  injectFearWithFatigue(state, fearAmount);
}
