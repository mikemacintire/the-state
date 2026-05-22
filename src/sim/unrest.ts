import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district unrest accumulates from the product of misery (1 -
 * happiness/100) and awareness (awareness/100), and is suppressed by national
 * fear and the propaganda budget (design doc §3.2, §3.7). It also decays slowly
 * on its own — anger fades when nothing keeps it lit.
 */
export function unrestPressure(
  happiness: number,
  awareness: number,
  fear: number,
  propagandaBudget: number,
): number {
  const misery = (CONSTANTS.unrestCeiling - happiness) / CONSTANTS.unrestCeiling;
  const aware = awareness / CONSTANTS.awarenessCeiling;
  const raw = misery * aware * CONSTANTS.unrestCeiling * CONSTANTS.unrestMiseryFactor;
  const suppression =
    fear * CONSTANTS.unrestFearSuppression +
    propagandaBudget * CONSTANTS.unrestPropagandaSuppression;
  return Math.max(0, raw - suppression);
}

/** Advance every district's unrest by one month, clamped to 0..100. */
export function updateUnrest(state: GameState): void {
  for (const d of state.districts) {
    const pressure = unrestPressure(d.happiness, d.awareness, state.fear, state.propagandaBudget);
    d.unrest = clamp(
      (d.unrest + pressure) * CONSTANTS.unrestDecay,
      CONSTANTS.unrestFloor,
      CONSTANTS.unrestCeiling,
    );
  }
}
