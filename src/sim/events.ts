import type { Event, EventKind, GameState } from './types';
import { nextRandom } from './rng';

/**
 * Per-event-id anti-repeat cooldown for the picker — a specific event fired
 * within the last N months is weighted to zero so the same line cannot
 * repeat back-to-back. Scheduled (pending) events bypass this and still
 * chain as authored.
 */
export const COOLDOWN_MONTHS: Record<EventKind, number> = {
  ambient: 6,
  incident: 6,
  crisis: 12,
  'self-provision': 12,
};

/**
 * Per-kind global throttle for the picker — once any event of a given kind
 * fires, *no other event of that kind* is eligible for N months. This is
 * the second cooldown layer that sits on top of the per-event-id
 * COOLDOWN_MONTHS: per-event prevents repeats of the same line, per-kind
 * caps overall frequency of the kind. The pause-causing kinds (crisis,
 * self-provision) sit higher so the player isn't dragged into a modal
 * every couple of ticks when many events qualify on common state.
 */
export const GLOBAL_KIND_COOLDOWN_MONTHS: Record<EventKind, number> = {
  ambient: 1,
  incident: 3,
  crisis: 8,
  'self-provision': 6,
};

/**
 * Probability that a weighted pick of a *pause-causing* kind (crisis or
 * self-provision) actually fires. Ambient and incident events are not
 * gated — they keep the feed alive without interrupting play. With many
 * pause-events qualifying on common late-game state, this gate is what
 * keeps the modal cadence playable.
 */
export const MODAL_FIRE_PROBABILITY = 0.3;

/**
 * Pick one event from the catalog using a state-weighted draw. Each event's
 * `weight(state)` returns a non-negative number; events with weight 0 are
 * ineligible. Two cooldown layers also zero an event's weight: per-event-id
 * (`COOLDOWN_MONTHS`) and per-kind global (`GLOBAL_KIND_COOLDOWN_MONTHS`).
 *
 * After the weighted pick, if the chosen event is a *pause-causing* kind
 * (crisis or self-provision) it is additionally gated by
 * `MODAL_FIRE_PROBABILITY`: most pause-picks are dropped so the player
 * isn't dragged into a modal every few ticks. Ambient and incident picks
 * are never gated. The picker consumes one RNG step on a non-pause result
 * and two when a pause pick is rolled (regardless of whether the gate
 * passes), and returns the resulting RNG state.
 */
export function pickEvent(
  state: GameState,
  catalog: readonly Event[],
): { event: Event | null; rngState: number } {
  // Walk recent log to find last-fired month per event id *and* per kind.
  // The longest of either cooldown bounds how far back we need to look.
  const longestCooldown = Math.max(
    ...Object.values(COOLDOWN_MONTHS),
    ...Object.values(GLOBAL_KIND_COOLDOWN_MONTHS),
  );
  const lastFiredByEvent = new Map<string, number>();
  const lastFiredByKind = new Map<EventKind, number>();
  for (let i = state.eventLog.length - 1; i >= 0; i--) {
    const entry = state.eventLog[i];
    if (entry.month < state.month - longestCooldown) break;
    if (!lastFiredByEvent.has(entry.eventId)) {
      lastFiredByEvent.set(entry.eventId, entry.month);
    }
    const ev = catalog.find((e) => e.id === entry.eventId);
    if (ev && !lastFiredByKind.has(ev.kind)) {
      lastFiredByKind.set(ev.kind, entry.month);
    }
  }

  let total = 0;
  const weights = new Array<number>(catalog.length);
  for (let i = 0; i < catalog.length; i++) {
    const event = catalog[i];
    const lastEvt = lastFiredByEvent.get(event.id);
    if (lastEvt !== undefined && state.month - lastEvt < COOLDOWN_MONTHS[event.kind]) {
      weights[i] = 0;
      continue;
    }
    const lastKind = lastFiredByKind.get(event.kind);
    if (
      lastKind !== undefined &&
      state.month - lastKind < GLOBAL_KIND_COOLDOWN_MONTHS[event.kind]
    ) {
      weights[i] = 0;
      continue;
    }
    const w = Math.max(0, event.weight(state));
    weights[i] = w;
    total += w;
  }

  const draw = nextRandom(state.rng);
  if (total <= 0) {
    return { event: null, rngState: draw.rngState };
  }

  let picked: Event | null = null;
  let mark = draw.value * total;
  for (let i = 0; i < catalog.length; i++) {
    mark -= weights[i];
    if (mark <= 0) {
      picked = catalog[i];
      break;
    }
  }
  if (!picked) {
    // Floating-point edge: return the last positive-weight event.
    for (let i = catalog.length - 1; i >= 0; i--) {
      if (weights[i] > 0) {
        picked = catalog[i];
        break;
      }
    }
  }

  // Pause-causing kinds get a second probability roll. Without it, even
  // moderate per-kind cooldowns can't stop multiple pause-events from
  // flooding a stretch where they all qualify.
  if (picked && (picked.kind === 'crisis' || picked.kind === 'self-provision')) {
    const gate = nextRandom(draw.rngState);
    if (gate.value > MODAL_FIRE_PROBABILITY) {
      return { event: null, rngState: gate.rngState };
    }
    return { event: picked, rngState: gate.rngState };
  }

  return { event: picked, rngState: draw.rngState };
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
  if (event.choices && event.choices.length > 0) {
    const requested = onCrisis ? onCrisis(state, event) : 0;
    if (requested === -1) {
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
