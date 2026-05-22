import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district awareness — the political awakening — drifts each month. It
 * rises with local prosperity (wealth above 50) and with inflation; it falls
 * under an education monopoly and with sustained propaganda
 * (design doc §3.2, §4.4). Discrete repression spikes are applied separately
 * by `doRepression` in `levers.ts`.
 */
export function awarenessDrift(
  wealth: number,
  inflation: number,
  educationLevel: number,
  propagandaBudget: number,
): number {
  const prosperityRise = Math.max(0, wealth - 50) * CONSTANTS.awarenessFromProsperity;
  const inflationRise = inflation * CONSTANTS.awarenessFromInflation;
  const educationFall = educationLevel * CONSTANTS.awarenessEducationSuppression;
  const propagandaFall = propagandaBudget * CONSTANTS.awarenessPropagandaSuppression;
  return prosperityRise + inflationRise - educationFall - propagandaFall;
}

/** Advance every district's awareness by one month, clamped to 0..100. */
export function updateAwareness(state: GameState): void {
  for (const d of state.districts) {
    const drift = awarenessDrift(
      d.wealth,
      state.inflation,
      state.educationLevel,
      state.propagandaBudget,
    );
    d.awareness = clamp(
      d.awareness + drift,
      CONSTANTS.awarenessFloor,
      CONSTANTS.awarenessCeiling,
    );
  }
}
