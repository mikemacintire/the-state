import type { Event, GameState } from './types';
import { nextRandom } from './rng';

/**
 * Pick one event from the catalog using a state-weighted draw. Each event's
 * `weight(state)` returns a non-negative number; events with weight 0 are
 * ineligible. The draw consumes one RNG step and returns the next RNG state so
 * the caller can advance `state.rng`.
 */
export function pickEvent(
  state: GameState,
  catalog: readonly Event[],
): { event: Event | null; rngState: number } {
  let total = 0;
  const weights = new Array<number>(catalog.length);
  for (let i = 0; i < catalog.length; i++) {
    const w = Math.max(0, catalog[i].weight(state));
    weights[i] = w;
    total += w;
  }
  const draw = nextRandom(state.rng);
  if (total <= 0) {
    return { event: null, rngState: draw.rngState };
  }
  let mark = draw.value * total;
  for (let i = 0; i < catalog.length; i++) {
    mark -= weights[i];
    if (mark <= 0) {
      return { event: catalog[i], rngState: draw.rngState };
    }
  }
  // Floating-point edge: return the last positive-weight event.
  for (let i = catalog.length - 1; i >= 0; i--) {
    if (weights[i] > 0) return { event: catalog[i], rngState: draw.rngState };
  }
  return { event: null, rngState: draw.rngState };
}
