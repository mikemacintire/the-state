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
 * If `onCrisis` returns `-1`, the choice is **deferred**: no choice effect is
 * applied, the crisis is pushed onto `state.pendingCrises` for later
 * resolution via `resolveCrisis(state, idx)`, and the log entry is added
 * without a `chosenOption` (it will be filled in when `resolveCrisis` runs).
 *
 * Any event with a non-empty `choices` array invokes `onCrisis` — that
 * includes both `crisis` and `self-provision` kinds.
 */
export function fireEvent(
  state: GameState,
  event: Event,
  onCrisis?: (state: GameState, event: Event) => number,
): void {
  event.effects(state);
  let chosenOption: string | undefined;
  let deferred = false;
  if (event.choices && event.choices.length > 0) {
    const requested = onCrisis ? onCrisis(state, event) : 0;
    if (requested === -1) {
      deferred = true;
      state.pendingCrises.push({
        eventId: event.id,
        text: event.text,
        choices: event.choices,
      });
    } else {
      const idx = Math.max(0, Math.min(event.choices.length - 1, requested));
      const choice = event.choices[idx];
      choice.effects(state);
      chosenOption = choice.label;
    }
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
  void deferred; // local marker; the pendingCrises push above is the observable effect
}

/**
 * One tick of the event system (design doc §5.1 step 6):
 *
 * 1. Fire any pending events whose `fireMonth <= state.month`, in arrival order,
 *    looking them up in the supplied catalog by id. Pending events whose target
 *    event is not in the catalog are silently dropped.
 * 2. Pick one event from the catalog via `pickEvent` and fire it (if eligible).
 *
 * Both steps share the catalog lookup. The RNG advances exactly once per call
 * (in step 2) regardless of how many pending events fired in step 1.
 */
export function processEvents(
  state: GameState,
  catalog: readonly Event[],
  onCrisis?: (state: GameState, event: Event) => number,
): void {
  // 1. Pending events
  const remaining: typeof state.pendingEvents = [];
  const due = state.pendingEvents;
  state.pendingEvents = remaining; // swap so fireEvent's own schedule() pushes land cleanly
  for (const p of due) {
    if (p.fireMonth <= state.month) {
      const ev = catalog.find((e) => e.id === p.eventId);
      if (ev) fireEvent(state, ev, onCrisis);
    } else {
      remaining.push(p);
    }
  }

  // 2. Picked event from the catalog
  const { event, rngState } = pickEvent(state, catalog);
  state.rng = rngState;
  if (event) fireEvent(state, event, onCrisis);
}

/**
 * Resolve the head of `state.pendingCrises` by applying the chosen option's
 * effects and removing it from the queue. Also updates the matching event-log
 * entry's `chosenOption`. A no-op if the queue is empty.
 */
export function resolveCrisis(state: GameState, choiceIdx: number): void {
  const head = state.pendingCrises.shift();
  if (!head) return;
  const idx = Math.max(0, Math.min(head.choices.length - 1, choiceIdx));
  const choice = head.choices[idx];
  choice.effects(state);
  // Backfill chosenOption on the most recent matching log entry that lacks one.
  for (let i = state.eventLog.length - 1; i >= 0; i--) {
    const entry = state.eventLog[i];
    if (entry.eventId === head.eventId && entry.chosenOption === undefined) {
      entry.chosenOption = choice.label;
      break;
    }
  }
}
