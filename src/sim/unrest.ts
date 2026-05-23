import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district unrest pressure each month. Two drivers:
 *
 * 1. **Misery × awareness** — people are unhappy AND see the state as the
 *    cause (design doc §3.7).
 * 2. **Felt taxation × awareness × inverse-fear** — taxes raise unrest, more
 *    sharply when the public is aware, less when they are frightened. Fear
 *    "licenses extraction" per §3.5 ("for your protection").
 *
 * Two suppressors:
 *
 * - **Fear** — linear in the keystone meter.
 * - **Propaganda** — sqrt-shaped in dollars and scaled by
 *   `(1 - awareness/100) × (1 - prosperity/100)`. An aware or prosperous
 *   district tunes it out; an ignorant struggling one swallows it cheap
 *   (design doc §4.3).
 */
export function unrestPressure(
  happiness: number,
  awareness: number,
  fear: number,
  propagandaBudget: number,
  taxRate: number,
  nationalProsperity: number,
): number {
  const misery = (CONSTANTS.unrestCeiling - happiness) / CONSTANTS.unrestCeiling;
  const aware = awareness / CONSTANTS.awarenessCeiling;
  const miseryPressure =
    misery * aware * CONSTANTS.unrestCeiling * CONSTANTS.unrestMiseryFactor;

  const fearLicensing =
    1 - Math.min(1, (fear / CONSTANTS.fearCeiling) * CONSTANTS.unrestFearLicensing);
  const taxPressure = taxRate * aware * CONSTANTS.unrestTaxFactor * fearLicensing;

  const effectiveness =
    Math.max(0, 1 - awareness / 100) * Math.max(0, 1 - nationalProsperity / 100);
  const propagandaSqrt = Math.sqrt(Math.max(0, propagandaBudget));
  const propagandaSuppression =
    propagandaSqrt * CONSTANTS.unrestPropagandaSuppression * effectiveness;
  const fearSuppression = fear * CONSTANTS.unrestFearSuppression;

  return Math.max(0, miseryPressure + taxPressure - fearSuppression - propagandaSuppression);
}

/** Advance every district's unrest by one month, clamped to 0..100. */
export function updateUnrest(state: GameState): void {
  for (const d of state.districts) {
    const pressure = unrestPressure(
      d.happiness,
      d.awareness,
      state.fear,
      state.propagandaBudget,
      state.taxRate,
      state.nationalProsperity,
    );
    d.unrest = clamp(
      (d.unrest + pressure) * CONSTANTS.unrestDecay,
      CONSTANTS.unrestFloor,
      CONSTANTS.unrestCeiling,
    );
  }
}
