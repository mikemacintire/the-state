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

/**
 * Fire one event: apply its base effects, resolve any choices via the optional
 * `onCrisis` callback (default choice 0), schedule any follow-up events, and
 * append a log entry. Pure mutation; does not advance the RNG.
 *
 * Any event with a non-empty `choices` array invokes `onCrisis` — that
 * includes both `crisis` kind (modal in the UI) and `self-provision` kind
 * (the ban/tax/co-opt/let-it-run response). The `kind` field is for the UI
 * to decide presentation (modal vs feed); the simulation itself just sees
 * "does this event need a choice."
 */
export function fireEvent(
  state: GameState,
  event: Event,
  onCrisis?: (state: GameState, event: Event) => number,
): void {
  event.effects(state);
  let chosenOption: string | undefined;
  if (event.choices && event.choices.length > 0) {
    const requested = onCrisis ? onCrisis(state, event) : 0;
    const idx = Math.max(0, Math.min(event.choices.length - 1, requested));
    const choice = event.choices[idx];
    choice.effects(state);
    chosenOption = choice.label;
  }
  if (event.schedule) {
    const queued = event.schedule(state);
    for (const p of queued) state.pendingEvents.push(p);
  }
  state.eventLog.push({
    month: state.month,
    eventId: event.id,
    text: event.text,
    ...(chosenOption !== undefined ? { chosenOption } : {}),
  });
}
