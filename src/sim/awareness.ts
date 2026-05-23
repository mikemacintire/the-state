import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district awareness — the political awakening — drifts each month. It
 * rises with local prosperity (wealth above 50) and with inflation; it falls
 * under an education monopoly and with sustained propaganda
 * (design doc §3.2, §4.4). Discrete repression spikes are applied separately
 * by `doRepression` in `levers.ts`.
 *
 * Education suppression is now Laffer-shaped (`level × (1 - level × 0.8)`):
 * a moderate monopoly is most effective; a total monopoly breeds a brittle
 * population (the `educationBrittleness` term adds awareness pressure that
 * scales with `level²`), so cranking education to 1.0 helps less than to 0.6.
 *
 * Propaganda suppression is sqrt-shaped in dollars and additionally scaled
 * by `(1 - awareness/100) × (1 - prosperity/100)` — it works cheaply on an
 * ignorant, struggling population and tunes out otherwise.
 */
export function awarenessDrift(
  wealth: number,
  awareness: number,
  inflation: number,
  educationLevel: number,
  propagandaBudget: number,
  nationalProsperity: number,
): number {
  const prosperityRise = Math.max(0, wealth - 50) * CONSTANTS.awarenessFromProsperity;
  const inflationRise = inflation * CONSTANTS.awarenessFromInflation;
  const educationFall =
    educationLevel * (1 - educationLevel * 0.8) * CONSTANTS.awarenessEducationSuppression;
  const brittleness = educationLevel * educationLevel * CONSTANTS.educationBrittleness;
  const effectiveness =
    Math.max(0, 1 - awareness / 100) * Math.max(0, 1 - nationalProsperity / 100);
  const propagandaSqrt = Math.sqrt(Math.max(0, propagandaBudget));
  const propagandaFall = propagandaSqrt * CONSTANTS.awarenessPropagandaSuppression * effectiveness;
  return prosperityRise + inflationRise + brittleness - educationFall - propagandaFall;
}

/** Advance every district's awareness by one month, clamped to 0..100.
 *
 * Bankrupt state cannot pay its bureaucrats or its propagandists; while
 * `bankruptSince !== null`, education and propaganda effectiveness fall to
 * zero (the player's settings remain, but the apparatus can't enforce them).
 * Design doc §3.6 cascade. */
export function updateAwareness(state: GameState): void {
  const bankrupt = state.bankruptSince !== null;
  const effectiveEducation = bankrupt ? 0 : state.educationLevel;
  const effectivePropaganda = bankrupt ? 0 : state.propagandaBudget;
  for (const d of state.districts) {
    const drift = awarenessDrift(
      d.wealth,
      d.awareness,
      state.inflation,
      effectiveEducation,
      effectivePropaganda,
      state.nationalProsperity,
    );
    d.awareness = clamp(
      d.awareness + drift,
      CONSTANTS.awarenessFloor,
      CONSTANTS.awarenessCeiling,
    );
  }
}
