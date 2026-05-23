import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Apply a "crush" choice's awareness penalty across every district, escalating
 * with how many times this same eventId has been suppressed before. Tracks
 * usage in `state.suppressionUses`. First use is the base; each subsequent
 * use multiplies the spike by `1 + (uses-1) × suppressionEscalationPerUse`.
 *
 * This is the mechanic behind "you can't just keep clicking Ban it" — every
 * repeated crackdown costs more awareness, scaling roughly linearly with
 * abuse. Design doc §3.8.
 */
export function applyViolentSuppression(
  state: GameState,
  eventId: string,
  baseAwarenessSpike: number,
): void {
  const uses = (state.suppressionUses[eventId] ?? 0) + 1;
  state.suppressionUses[eventId] = uses;
  const escalated =
    baseAwarenessSpike * (1 + (uses - 1) * CONSTANTS.suppressionEscalationPerUse);
  for (const d of state.districts) {
    d.awareness = Math.min(CONSTANTS.awarenessCeiling, d.awareness + escalated);
  }
}

/**
 * Inject fear with diminishing returns from `fearFatigue`. Raw fear injection
 * lands as `amount / (1 + fearFatigue)`; fatigue itself rises with each
 * injection and decays slowly in `updateFear`. Design doc §3.5 fatigue catch:
 * "repeated scares lose potency; fresher, bigger threats are needed."
 */
export function injectFearWithFatigue(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const effective = amount / (1 + state.fearFatigue);
  state.fear = Math.min(CONSTANTS.fearCeiling, state.fear + effective);
  state.fearFatigue += amount * CONSTANTS.fearFatigueGainPerUnit;
}
