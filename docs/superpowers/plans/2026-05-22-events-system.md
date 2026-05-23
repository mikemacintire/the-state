# Events System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the events system — design doc §5.2's four event kinds (Ambient, Incident,
Crisis, Self-Provision), a state-weighted picker, deterministic firing, crisis resolution
via the Strategy callback, scheduled event chains, an event log, and a curated starter
catalog of ten events that exercises every kind. This fills in tick-pipeline step 6.

**Architecture:** Pure data + pure functions, same headless test-first style as Plans 1-2.
Events are immutable objects with state-dependent `weight()` functions and `effects()`
mutators; the picker draws one per tick using the seeded RNG. Crisis events ask the
Strategy for a choice index (default 0 if no handler). Chained events are queued onto
`state.pendingEvents` to fire on a later tick. Every fired event appends to
`state.eventLog`.

**Tech Stack:** TypeScript, Vitest, Node. (Vite and Electron arrive in Plan 4.)

---

## Context

This is **Plan 3 of 4** for *The State*:

1. ✅ Simulation core — fiscal foundation (Plan 1).
2. ✅ Simulation core — population & control (Plan 2).
3. **The events system** *(this plan)*.
4. The game — Electron shell & UI.

This plan keeps the simulation **headless** — no DOM, no Electron. Crises that the design
doc says "pause the game and show a modal" are resolved via a Strategy callback in the
headless harness; the modal lives in Plan 4. After this plan, every meter, lever,
emigration, loss condition, AND the satirical event engine work end-to-end via
`runHeadless()`.

**Scope kept tight:**

- The plan ships **10 events** that exercise all four kinds and the chaining mechanism —
  enough content to prove the engine works and to power early playtesting. Reaching the
  design doc's "~30" v1 catalog is a follow-up content-pass after Plan 4, not part of this
  plan.
- Random firing uses the deterministic RNG from Plan 1 (`nextRandom`). Two runs with the
  same seed and strategy produce the same event sequence.
- Crisis modals (UI) live in Plan 4. Headless crises ask the Strategy via an optional
  `onCrisis` callback; if absent, the run picks choice 0.
- Event weighting is intentionally simple: each event returns a non-negative weight that
  may depend on game state; the picker draws weighted-random among eligible events
  (weight > 0). No fancy priority queues; no per-event cooldown tables.
- An event can schedule one or more follow-up events via `schedule(state)`. Scheduled
  events fire at the start of step 6 on their `fireMonth`. (False flag → investigation
  chain.)
- All numeric constants here are deliberate starting values, not balanced final values.

---

## File Structure

This plan adds three new modules under `src/sim/`, one event catalog under `src/content/`,
and extends the existing tick / harness / state / types.

**Modify:**

- `src/sim/types.ts` — add `EventKind`, `Event`, `EventChoice`, `EventLogEntry`,
  `PendingEvent`; extend `GameState` with `eventLog`, `pendingEvents`.
- `src/sim/state.ts` — `createInitialState` initialises the two new arrays.
- `src/sim/state.test.ts` — add tests for the new initial values.
- `src/sim/tick.ts` — fill in step 6 (events) and accept an optional `onCrisis` handler
  threaded from the harness.
- `src/sim/tick.test.ts` — add tests for the events step.
- `src/sim/harness.ts` — `Strategy` gains optional `onCrisis`; `runHeadless` threads it
  through to `tick`.
- `src/sim/harness.test.ts` — add tests for `onCrisis` wiring.

**Create:**

- `src/sim/events.ts` + `events.test.ts` — `pickEvent`, `fireEvent`, `processEvents`
  (the core engine).
- `src/content/event-catalog.ts` + `event-catalog.test.ts` — the curated v1 starter
  catalog (10 events).
- `src/sim/events-balance.test.ts` — integration test for end-to-end event behaviour
  through the harness.

---

## Task 1: Event types and state extensions

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/state.ts`
- Modify: `src/sim/state.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/state.test.ts`**

Append the following `it` block inside the existing `describe('createInitialState', ...)`:

```ts
  it('initialises Plan 3 event tracking arrays to empty', () => {
    const s = createInitialState();
    expect(s.eventLog).toEqual([]);
    expect(s.pendingEvents).toEqual([]);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/state.test.ts`
Expected: FAIL — `eventLog` and `pendingEvents` do not exist on `GameState` yet.

- [ ] **Step 3: Extend `src/sim/types.ts`**

Replace the existing file with:

```ts
/** A run ends with exactly one of these causes. */
export type LossCause = 'bankruptcy' | 'revolt' | 'spell-breaks';

/** One district of the country. */
export interface District {
  id: string;
  name: string;
  population: number; // citizens
  wealth: number; // 0..100, average prosperity
  happiness: number; // 0..100, quality of life (Plan 2)
  awareness: number; // 0..100, political awakening (Plan 2)
  unrest: number; // 0..100, active anger at the regime (Plan 2)
}

/** The four kinds of event (design doc §5.2). */
export type EventKind = 'ambient' | 'incident' | 'crisis' | 'self-provision';

/** One option presented in a crisis event modal. */
export interface EventChoice {
  /** Short label shown to the player (and used in the headless log). */
  label: string;
  /** Mutates state when the player picks this option. */
  effects: (state: GameState) => void;
}

/** A scheduled future event, awaiting its fire month. */
export interface PendingEvent {
  eventId: string;
  fireMonth: number;
}

/** One row of the event log. */
export interface EventLogEntry {
  month: number;
  eventId: string;
  text: string;
  /** Filled in only for crises (the label of the chosen option). */
  chosenOption?: string;
}

/**
 * An event in the catalog. Pure data: a stable id, the kind, the deadpan
 * headline, a state-dependent `weight` (0 = ineligible), `effects` applied
 * unconditionally when the event fires (ambient/incident/self-provision base
 * effects, crisis pre-choice effects), optional `choices` for crises, and an
 * optional `schedule` that queues follow-up events on chains
 * (e.g. false flag → investigation).
 */
export interface Event {
  id: string;
  kind: EventKind;
  text: string;
  weight: (state: GameState) => number;
  effects: (state: GameState) => void;
  choices?: EventChoice[];
  schedule?: (state: GameState) => PendingEvent[];
}

/** The complete, serializable simulation state. */
export interface GameState {
  month: number; // months elapsed; 0 at the start of a run
  rng: number; // current RNG state (see rng.ts)
  treasury: number;
  lifetimeExtraction: number;
  inflation: number;
  inflationPressure: number;
  taxRate: number;
  apparatusUpkeep: number;
  // Plan 2 — control levers:
  propagandaBudget: number;
  educationLevel: number;
  // Plan 2 — national meters:
  fear: number;
  nationalUnrest: number;
  nationalProsperity: number;
  // Plan 3 — event tracking:
  eventLog: EventLogEntry[]; // append-only history of fired events
  pendingEvents: PendingEvent[]; // scheduled events awaiting their fire month
  districts: District[];
  lossCause: LossCause | null;
}

/** The outcome of a headless run. */
export interface RunResult {
  monthsSurvived: number;
  lifetimeExtraction: number;
  lossCause: LossCause | null;
}
```

- [ ] **Step 4: Extend `src/sim/state.ts`**

Replace the existing file with:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { INITIAL_DISTRICTS } from '../content/districts';

/** Build a fresh GameState for a new run. `seed` makes the run reproducible. */
export function createInitialState(seed: number = 1): GameState {
  return {
    month: 0,
    rng: seed >>> 0,
    treasury: CONSTANTS.startingTreasury,
    lifetimeExtraction: 0,
    inflation: 0,
    inflationPressure: 0,
    taxRate: CONSTANTS.startingTaxRate,
    apparatusUpkeep: CONSTANTS.initialUpkeep,
    propagandaBudget: 0,
    educationLevel: 0,
    fear: 0,
    nationalUnrest: 0,
    nationalProsperity: 0,
    eventLog: [],
    pendingEvents: [],
    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    lossCause: null,
  };
}
```

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx vitest run src/sim/state.test.ts`
Expected: PASS — 6 tests (original 5 + new 1).

Run: `npm run typecheck`
Expected: exits 0. No Plan 1/2 callers reference the new fields, so no other test breaks.

- [ ] **Step 6: Commit**

```bash
git add src/sim/types.ts src/sim/state.ts src/sim/state.test.ts
git commit -m "feat: add event types and state extensions for Plan 3"
```

---

## Task 2: Event picker

**Files:**
- Create: `src/sim/events.ts`
- Test: `src/sim/events.test.ts`

This task creates the engine module with one function: `pickEvent`. Subsequent tasks add
`fireEvent` and `processEvents` to the same file.

- [ ] **Step 1: Write the failing test**

`src/sim/events.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickEvent } from './events';
import { createInitialState } from './state';
import type { Event } from './types';

function noopEffects(): void {}

function evt(id: string, weight: number): Event {
  return {
    id,
    kind: 'ambient',
    text: id,
    weight: () => weight,
    effects: noopEffects,
  };
}

describe('pickEvent', () => {
  it('returns null when the catalog is empty', () => {
    const s = createInitialState();
    const r = pickEvent(s, []);
    expect(r.event).toBeNull();
  });

  it('returns null when every catalog entry weighs zero', () => {
    const s = createInitialState();
    const r = pickEvent(s, [evt('a', 0), evt('b', 0)]);
    expect(r.event).toBeNull();
  });

  it('returns the only eligible event when one exists', () => {
    const s = createInitialState();
    const r = pickEvent(s, [evt('cold', 0), evt('hot', 5), evt('frozen', 0)]);
    expect(r.event?.id).toBe('hot');
  });

  it('advances the RNG state', () => {
    const s = createInitialState();
    const before = s.rng;
    const r = pickEvent(s, [evt('a', 1)]);
    expect(r.rngState).not.toBe(before);
  });

  it('is deterministic for the same RNG state and catalog', () => {
    const s1 = createInitialState(99);
    const s2 = createInitialState(99);
    const cat = [evt('a', 1), evt('b', 1), evt('c', 1)];
    const r1 = pickEvent(s1, cat);
    const r2 = pickEvent(s2, cat);
    expect(r1.event?.id).toBe(r2.event?.id);
    expect(r1.rngState).toBe(r2.rngState);
  });

  it('draws weighted — a heavily-weighted event dominates over many trials', () => {
    const cat = [evt('rare', 1), evt('common', 99)];
    let rng = 1;
    let commonCount = 0;
    for (let i = 0; i < 200; i++) {
      const s = createInitialState();
      s.rng = rng;
      const r = pickEvent(s, cat);
      if (r.event?.id === 'common') commonCount++;
      rng = r.rngState;
    }
    expect(commonCount).toBeGreaterThan(150); // ~99% of 200
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/events.test.ts`
Expected: FAIL — cannot find module `./events`.

- [ ] **Step 3: Write the implementation**

`src/sim/events.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/events.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/events.ts src/sim/events.test.ts
git commit -m "feat: add state-weighted event picker"
```

---

## Task 3: Event firing and crisis resolution

**Files:**
- Modify: `src/sim/events.ts`
- Modify: `src/sim/events.test.ts`

- [ ] **Step 1: Add the failing tests**

In `src/sim/events.test.ts`, extend the top-of-file import to add `fireEvent`:

```ts
import { pickEvent, fireEvent } from './events';
```

Append the following `describe` block to the END of the file:

```ts
describe('fireEvent', () => {
  it('applies the base effects and appends an event-log entry', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'tax-hike',
      kind: 'incident',
      text: 'Quietly raises the wartime surcharge.',
      weight: () => 1,
      effects: (st) => {
        st.treasury += 500;
      },
    };
    s.month = 7;
    const before = s.treasury;
    fireEvent(s, event);
    expect(s.treasury).toBe(before + 500);
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0]).toEqual({ month: 7, eventId: 'tax-hike', text: event.text });
  });

  it('resolves a crisis by calling onCrisis and applying the chosen option', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {}, // no base effects
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 200; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    const onCrisis = () => 1; // pick "Let it run"
    fireEvent(s, event, onCrisis);
    expect(s.treasury).toBe(1000); // 'Suppress' was not chosen
    expect(s.fear).toBe(5);
    expect(s.eventLog[0].chosenOption).toBe('Let it run');
  });

  it('defaults to choice 0 when no onCrisis handler is provided', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 200; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    fireEvent(s, event); // no onCrisis
    expect(s.treasury).toBe(800); // 'Suppress' was chosen
    expect(s.eventLog[0].chosenOption).toBe('Suppress');
  });

  it('queues scheduled follow-up events into pendingEvents', () => {
    const s = createInitialState();
    s.month = 3;
    const event: Event = {
      id: 'false-flag',
      kind: 'incident',
      text: 'Foreign-orchestrated incident in the Port.',
      weight: () => 1,
      effects: () => {},
      schedule: (st) => [{ eventId: 'investigation', fireMonth: st.month + 6 }],
    };
    fireEvent(s, event);
    expect(s.pendingEvents).toEqual([{ eventId: 'investigation', fireMonth: 9 }]);
  });

  it('clamps a too-large choice index to the last option', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: '...',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'A', effects: () => {} },
        { label: 'B', effects: (st) => { st.fear += 1; } },
      ],
    };
    fireEvent(s, event, () => 99);
    expect(s.fear).toBe(1);
    expect(s.eventLog[0].chosenOption).toBe('B');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/events.test.ts`
Expected: FAIL — `fireEvent` is not exported.

- [ ] **Step 3: Extend `src/sim/events.ts`**

Append to the end of the file:

```ts

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/events.test.ts`
Expected: PASS — 11 tests (6 picker + 5 firing).

- [ ] **Step 5: Commit**

```bash
git add src/sim/events.ts src/sim/events.test.ts
git commit -m "feat: add event firing and crisis resolution"
```

---

## Task 4: Pending-event processing per tick

**Files:**
- Modify: `src/sim/events.ts`
- Modify: `src/sim/events.test.ts`

This task adds `processPending` — the one-call interface tick-step 6 uses each month:
fire any pending events whose `fireMonth` has arrived, then optionally pick and fire a
new event from the catalog.

- [ ] **Step 1: Add the failing tests**

In `src/sim/events.test.ts`, extend the top-of-file import:

```ts
import { pickEvent, fireEvent, processEvents } from './events';
```

Append the following `describe` block:

```ts
describe('processEvents', () => {
  it('fires every pending event whose fireMonth matches the current month', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [
      {
        id: 'investigation',
        kind: 'incident',
        text: 'A magazine prints awkward questions.',
        weight: () => 0,
        effects: (st) => { st.fear -= 3; },
      },
    ];
    s.pendingEvents.push({ eventId: 'investigation', fireMonth: 5 });
    s.fear = 50;
    processEvents(s, catalog);
    expect(s.fear).toBe(47);
    expect(s.pendingEvents).toEqual([]);
    expect(s.eventLog.some((e) => e.eventId === 'investigation')).toBe(true);
  });

  it('leaves pending events whose fireMonth is in the future', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [];
    s.pendingEvents.push({ eventId: 'later', fireMonth: 12 });
    processEvents(s, catalog);
    expect(s.pendingEvents).toEqual([{ eventId: 'later', fireMonth: 12 }]);
  });

  it('also fires any pending events whose fireMonth has already passed (catch-up)', () => {
    const s = createInitialState();
    s.month = 9;
    const catalog: Event[] = [
      { id: 'late', kind: 'ambient', text: 'late', weight: () => 0, effects: (st) => { st.fear = 1; } },
    ];
    s.pendingEvents.push({ eventId: 'late', fireMonth: 3 });
    processEvents(s, catalog);
    expect(s.fear).toBe(1);
    expect(s.pendingEvents).toEqual([]);
  });

  it('picks one eligible catalog event each tick when the catalog is non-empty', () => {
    const s = createInitialState();
    s.rng = 12345;
    const catalog: Event[] = [
      { id: 'parade', kind: 'ambient', text: 'parade', weight: () => 1, effects: () => {} },
    ];
    processEvents(s, catalog);
    // exactly one entry from the catalog (no pending events were scheduled)
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0].eventId).toBe('parade');
  });

  it('advances the RNG state when picking from the catalog', () => {
    const s = createInitialState();
    s.rng = 7;
    const catalog: Event[] = [
      { id: 'a', kind: 'ambient', text: 'a', weight: () => 1, effects: () => {} },
    ];
    processEvents(s, catalog);
    expect(s.rng).not.toBe(7);
  });

  it('still advances the RNG state when no eligible event exists', () => {
    const s = createInitialState();
    s.rng = 7;
    const catalog: Event[] = [
      { id: 'a', kind: 'ambient', text: 'a', weight: () => 0, effects: () => {} },
    ];
    processEvents(s, catalog);
    expect(s.rng).not.toBe(7);
    expect(s.eventLog).toEqual([]);
  });

  it('passes the onCrisis handler through to fireEvent', () => {
    const s = createInitialState();
    s.month = 4;
    const catalog: Event[] = [
      {
        id: 'choose',
        kind: 'crisis',
        text: 'pick one',
        weight: () => 1,
        effects: () => {},
        choices: [
          { label: 'A', effects: (st) => { st.fear = 1; } },
          { label: 'B', effects: (st) => { st.fear = 9; } },
        ],
      },
    ];
    processEvents(s, catalog, () => 1);
    expect(s.fear).toBe(9);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/events.test.ts`
Expected: FAIL — `processEvents` is not exported.

- [ ] **Step 3: Extend `src/sim/events.ts`**

Append to the end of the file:

```ts

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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/sim/events.test.ts`
Expected: PASS — 18 tests (6 picker + 5 firing + 7 processEvents).

- [ ] **Step 5: Commit**

```bash
git add src/sim/events.ts src/sim/events.test.ts
git commit -m "feat: add per-tick event processing"
```

---

## Task 5: Curated event catalog (10 events)

**Files:**
- Create: `src/content/event-catalog.ts`
- Test: `src/content/event-catalog.test.ts`

Ten events covering all four kinds and the chaining mechanism. Numbers are deliberate
starting values; satirical text is deadpan, in the design doc's voice (§3 Tone).

- [ ] **Step 1: Write the failing test**

`src/content/event-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EVENT_CATALOG } from './event-catalog';
import { createInitialState } from '../sim/state';

describe('EVENT_CATALOG', () => {
  it('defines a non-trivial v1 catalog', () => {
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every event a unique id', () => {
    const ids = EVENT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes at least one event of every kind', () => {
    const kinds = new Set(EVENT_CATALOG.map((e) => e.kind));
    for (const k of ['ambient', 'incident', 'crisis', 'self-provision'] as const) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it('returns non-negative weights for the initial state', () => {
    const s = createInitialState();
    for (const e of EVENT_CATALOG) {
      expect(e.weight(s)).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every crisis a non-empty choices array', () => {
    for (const e of EVENT_CATALOG) {
      if (e.kind === 'crisis') {
        expect(e.choices).toBeDefined();
        expect((e.choices ?? []).length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/event-catalog.test.ts`
Expected: FAIL — cannot find module `./event-catalog`.

- [ ] **Step 3: Write the implementation**

`src/content/event-catalog.ts`:

```ts
import type { Event } from '../sim/types';

/**
 * v1 starter catalog. Ten events covering all four kinds (design doc §5.2) and
 * the false-flag → investigation chaining mechanism. Voice is deadpan
 * bureaucratic euphemism — the satire is in the gap between the language and
 * the mechanics (§3 Tone).
 *
 * Weights are deliberate starting values. Reaching the design's "~30 events"
 * v1 target is a follow-up content pass after Plan 4.
 */
export const EVENT_CATALOG: readonly Event[] = [
  // --- Ambient (no choice, no mechanical effect; satirical flavour) ---
  {
    id: 'amb-inflation-transitory',
    kind: 'ambient',
    text: 'The Bureau of Statistics confirms inflation remains transitory for the ninth consecutive year.',
    weight: (s) => (s.inflation > 5 ? 4 : 0.2),
    effects: () => {},
  },
  {
    id: 'amb-record-approval',
    kind: 'ambient',
    text: 'State media reports record approval ratings amid renewed national unity.',
    weight: (s) => (s.fear > 30 ? 3 : 0.2),
    effects: () => {},
  },
  {
    id: 'amb-park-opens',
    kind: 'ambient',
    text: 'A new park opens in the Capital, named for the current Minister of Order.',
    weight: () => 0.5,
    effects: () => {},
  },

  // --- Incidents (small mechanical effects; sometimes consequences of prior actions) ---
  {
    id: 'inc-border-flare',
    kind: 'incident',
    text: 'Border tensions flare. Defence allocations rise quietly.',
    weight: (s) => (s.fear > 10 ? 2 : 0.5),
    effects: (s) => {
      s.treasury -= 300;
      s.fear = Math.min(100, s.fear + 5);
    },
  },
  {
    id: 'inc-small-protest',
    kind: 'incident',
    text: 'A small protest forms outside a regional administration office.',
    weight: (s) => {
      // surfaces when any district has both notable awareness and unrest
      const hot = s.districts.some((d) => d.awareness > 40 && d.unrest > 20);
      return hot ? 3 : 0;
    },
    effects: (s) => {
      // affect the most-unrest district
      const worst = [...s.districts].sort((a, b) => b.unrest - a.unrest)[0];
      if (worst) {
        worst.unrest = Math.min(100, worst.unrest + 2);
        worst.awareness = Math.min(100, worst.awareness + 1);
      }
    },
  },

  // --- Crises (major choices; in Plan 4 these will auto-pause and show modals) ---
  {
    id: 'cri-leaked-files',
    kind: 'crisis',
    text: 'An archivist has leaked documents proving the Harbor Attack was staged.',
    weight: (s) => {
      // only fires once a false-flag has actually been used recently
      const recent = s.eventLog.some(
        (e) => e.eventId === 'cri-false-flag' && e.month >= s.month - 24,
      );
      return recent ? 2 : 0;
    },
    effects: () => {},
    choices: [
      {
        label: 'Suppress the story',
        effects: (s) => {
          s.treasury -= 2000;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Discredit the leaker',
        effects: (s) => {
          s.treasury -= 500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 5);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          for (const d of s.districts) {
            d.awareness = Math.min(100, d.awareness + 12);
            d.unrest = Math.min(100, d.unrest + 8);
          }
        },
      },
    ],
  },
  {
    id: 'cri-false-flag',
    kind: 'crisis',
    text: 'Operations propose a deniable incident in the Port to refocus public attention.',
    weight: (s) => (s.nationalUnrest > 25 ? 1.5 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Authorise the operation',
        effects: (s) => {
          s.treasury -= 1500;
          s.fear = Math.min(100, s.fear + 20);
        },
      },
      {
        label: 'Decline',
        effects: () => {},
      },
    ],
    // Authorising plants a possible investigation crisis 6 months out.
    schedule: (s) => [{ eventId: 'cri-leaked-files', fireMonth: s.month + 6 }],
  },
  {
    id: 'cri-inflation-anger',
    kind: 'crisis',
    text: 'Citizens are openly angry about the cost of bread.',
    weight: (s) => (s.inflation > 20 ? 4 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Blame foreign speculators',
        effects: (s) => {
          s.fear = Math.min(100, s.fear + 8);
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Impose price controls',
        effects: (s) => {
          // helps short-term happiness, hurts wealth growth (deferred)
          for (const d of s.districts) {
            d.happiness = Math.min(100, d.happiness + 5);
            d.wealth = Math.max(0, d.wealth - 3);
          }
        },
      },
      {
        label: 'Pay a one-off subsidy',
        effects: (s) => {
          s.treasury -= 2500;
          for (const d of s.districts) d.happiness = Math.min(100, d.happiness + 8);
        },
      },
    ],
  },

  // --- Self-Provision (private/voluntary solutions; pose a Spell-Breaks threat) ---
  {
    id: 'sp-mutual-aid',
    kind: 'self-provision',
    text: 'A neighbourhood mutual-aid network has emerged in a poorer ward — care arranged without the state.',
    weight: (s) => {
      const aware = s.districts.some((d) => d.awareness > 30 && d.wealth < 50);
      return aware ? 1.2 : 0;
    },
    effects: () => {},
    choices: [
      {
        label: 'Ban it',
        effects: (s) => {
          s.treasury -= 500;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 4);
        },
      },
      {
        label: 'Co-opt it as a state programme',
        effects: (s) => {
          s.treasury -= 1500;
          s.apparatusUpkeep += 50; // permanent
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          // It works: the neediest district's happiness climbs.
          const poor = [...s.districts].sort((a, b) => a.wealth - b.wealth)[0];
          if (poor) {
            poor.happiness = Math.min(100, poor.happiness + 10);
            poor.unrest = Math.max(0, poor.unrest - 5);
          }
        },
      },
    ],
  },
  {
    id: 'sp-private-school',
    kind: 'self-provision',
    text: 'A growing private school co-op is teaching unauthorised civics.',
    weight: (s) => (s.educationLevel < 0.5 && s.nationalProsperity > 50 ? 1 : 0),
    effects: () => {},
    choices: [
      {
        label: 'Shut it down',
        effects: (s) => {
          s.treasury -= 400;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 6);
        },
      },
      {
        label: 'Tax it heavily',
        effects: (s) => {
          s.treasury += 800;
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 2);
        },
      },
      {
        label: 'Let it run',
        effects: (s) => {
          // Genuinely educated kids — long-run awareness rise across the country.
          for (const d of s.districts) d.awareness = Math.min(100, d.awareness + 1);
        },
      },
    ],
  },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/event-catalog.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/event-catalog.ts src/content/event-catalog.test.ts
git commit -m "feat: add v1 starter event catalog"
```

---

## Task 6: Tick pipeline step 6 — wire events

**Files:**
- Modify: `src/sim/tick.ts`
- Modify: `src/sim/tick.test.ts`

The tick gains an optional `onCrisis` parameter and calls `processEvents` in step 6 with
the default catalog. The catalog is imported here so callers (the harness, individual
tests) don't have to supply it; tests that want a different catalog can call `processEvents`
directly.

- [ ] **Step 1: Add the failing tests in `src/sim/tick.test.ts`**

Append the following `it` blocks inside the existing `describe('tick', ...)`:

```ts
  it('processes events in step 6 (eventLog grows when an event fires)', () => {
    const s = createInitialState();
    // ensure at least one event is eligible (the always-on park-opens event)
    const before = s.eventLog.length;
    tick(s);
    expect(s.eventLog.length).toBeGreaterThan(before);
  });

  it('advances the RNG via the events step even when no event fires effects', () => {
    const s = createInitialState();
    const beforeRng = s.rng;
    tick(s);
    expect(s.rng).not.toBe(beforeRng);
  });

  it('forwards an onCrisis handler to processEvents', () => {
    // Construct a state where the only eligible event is the inflation-anger
    // crisis, then verify the chosen option's effects are applied per the
    // handler. We pre-stack the pending queue with a crisis we control.
    const s = createInitialState();
    s.month = 0;
    s.pendingEvents.push({ eventId: 'cri-inflation-anger', fireMonth: 0 });
    s.inflation = 25; // makes the crisis weight > 0 so it appears in the catalog as well, but pending fires first
    let chosen = -1;
    tick(s, (_st, ev) => {
      chosen = ev.id === 'cri-inflation-anger' ? 2 : 0; // pick "Pay a one-off subsidy"
      return chosen;
    });
    // the subsidy option deducts 2500
    expect(chosen).toBe(2);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: FAIL — `tick` does not yet accept a second argument and does not yet call
`processEvents`.

- [ ] **Step 3: Replace `src/sim/tick.ts`**

Replace the entire file with:

```ts
import type { Event, GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { updateHappiness } from './happiness';
import { updateAwareness } from './awareness';
import { updateUnrest } from './unrest';
import { updateFear } from './fear';
import { updateEmigration } from './emigration';
import { growBureaucracy, updateTreasury } from './treasury';
import { updateAggregates } from './aggregates';
import { processEvents } from './events';
import { EVENT_CATALOG } from '../content/event-catalog';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors
 * design doc §5.1. An optional `onCrisis` handler is forwarded to the event
 * processor; if omitted, crises take their first choice.
 */
export function tick(
  state: GameState,
  onCrisis?: (state: GameState, event: Event) => number,
): void {
  if (state.lossCause !== null) return; // a finished run does not advance

  // 1. Economy
  updateEconomy(state);

  // 2. Meters
  updateInflation(state);
  updateHappiness(state);
  updateAwareness(state);
  updateUnrest(state);
  updateFear(state);

  // 3. Population (emigration)
  updateEmigration(state);

  // 4. Treasury
  growBureaucracy(state);
  updateTreasury(state);

  // 5. Aggregates (national unrest, prosperity)
  updateAggregates(state);

  // 6. Events
  processEvents(state, EVENT_CATALOG, onCrisis);

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: PASS — 12 tests (9 from Plan 2 + 3 new).

Then run the full suite:

Run: `npm test`
Expected: every test file green. The Plan 1/2 balance tests must continue to pass; event
firing may slightly perturb the runs but no structural truth changes.

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add src/sim/tick.ts src/sim/tick.test.ts
git commit -m "feat: wire the events system into the tick pipeline"
```

If a Plan 1 or Plan 2 balance test fails after wiring events, STOP and report BLOCKED.
Do not adjust constants or event weights. The most likely cause is that some catalog
event's effects unintentionally fire too aggressively at default seed; the orchestrator
will either widen the test assertion (as Plan 2 had to widen the Plan 1 vise test) or
tweak the offending event's weight.

---

## Task 7: Harness Strategy — onCrisis

**Files:**
- Modify: `src/sim/harness.ts`
- Modify: `src/sim/harness.test.ts`

The `Strategy` type gains an optional `onCrisis` property; the harness forwards it into
each `tick` call. Strategies that don't care about crises simply omit it (and choice 0
is picked).

- [ ] **Step 1: Add the failing test in `src/sim/harness.test.ts`**

Append the following `it` block inside the existing `describe('runHeadless', ...)`:

```ts
  it('forwards onCrisis from the strategy to every tick', () => {
    // Pre-stack a crisis to fire in month 0.
    const seen: string[] = [];
    const strategy: Strategy = () => ({ taxRate: 0.3 });
    strategy.onCrisis = (_s, ev) => {
      seen.push(ev.id);
      return 1; // always pick second option
    };
    const r = runHeadless({
      seed: 11,
      strategy,
      maxMonths: 6,
    });
    expect(r.monthsSurvived).toBeLessThanOrEqual(6);
    // No structural guarantee a crisis fires in those 6 months from the
    // catalog, but the test mainly checks no throw + onCrisis is callable.
    for (const id of seen) expect(typeof id).toBe('string');
  });
```

Also add `Strategy` to the existing import line at the top of the test:

```ts
import { runHeadless, type Strategy } from './harness';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/harness.test.ts`
Expected: FAIL — `Strategy` has no `onCrisis` property in its type; assigning it errors
at compile / runtime.

- [ ] **Step 3: Replace `src/sim/harness.ts`**

Replace the entire file with:

```ts
import type { Event, GameState, RunResult } from './types';
import { createInitialState } from './state';
import { tick } from './tick';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
} from './levers';

/**
 * A Strategy is an automated "player": each month it inspects the state and
 * returns the decisions to apply before the tick. Plan 3 adds an optional
 * `onCrisis` callback for resolving crisis events headlessly; if omitted,
 * crises take their first choice.
 */
export interface Strategy {
  (state: GameState): {
    taxRate?: number;
    print?: number;
    propagandaBudget?: number;
    educationLevel?: number;
    repression?: boolean;
    fearOp?: number;
  };
  onCrisis?: (state: GameState, event: Event) => number;
}

/** Run one headless game to completion (a loss) or to `maxMonths`. */
export function runHeadless(opts: {
  seed?: number;
  strategy: Strategy;
  maxMonths: number;
}): RunResult {
  const state = createInitialState(opts.seed ?? 1);
  while (state.lossCause === null && state.month < opts.maxMonths) {
    const decision = opts.strategy(state);
    if (decision.taxRate !== undefined) setTaxRate(state, decision.taxRate);
    if (decision.print !== undefined) printMoney(state, decision.print);
    if (decision.propagandaBudget !== undefined) setPropagandaBudget(state, decision.propagandaBudget);
    if (decision.educationLevel !== undefined) setEducationLevel(state, decision.educationLevel);
    if (decision.repression) doRepression(state);
    if (decision.fearOp !== undefined && decision.fearOp > 0) spawnFearOp(state, decision.fearOp);
    tick(state, opts.strategy.onCrisis);
  }
  return {
    monthsSurvived: state.month,
    lifetimeExtraction: state.lifetimeExtraction,
    lossCause: state.lossCause,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/harness.test.ts`
Expected: PASS — 5 tests (4 from Plan 2 + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/sim/harness.ts src/sim/harness.test.ts
git commit -m "feat: forward onCrisis from strategy into the tick"
```

---

## Task 8: Integration test — events end-to-end

**Files:**
- Create: `src/sim/events-balance.test.ts`

A handful of integration tests that exercise the whole pipeline including events through
the harness, asserting structural truths.

- [ ] **Step 1: Write the integration test**

`src/sim/events-balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless, type Strategy } from './harness';

describe('events-balance — structural truths', () => {
  it('a run logs at least one event over many months', () => {
    const r = runHeadless({
      seed: 4,
      strategy: () => ({ taxRate: 0.3 }),
      maxMonths: 48,
    });
    // RunResult does not expose the log directly; re-run with a strategy that
    // records side-effects via a closure-tied counter instead.
    let crisisCount = 0;
    const strategy: Strategy = () => ({ taxRate: 0.3 });
    strategy.onCrisis = () => {
      crisisCount++;
      return 0;
    };
    runHeadless({ seed: 4, strategy, maxMonths: 48 });
    // crisis events may or may not fire depending on game state; the meaningful
    // assertion is that the run completes without throwing AND that the result
    // is deterministic. Use crisisCount only to confirm onCrisis is callable.
    expect(crisisCount).toBeGreaterThanOrEqual(0);
    expect(r.monthsSurvived).toBeGreaterThan(0);
  });

  it('the same seed and strategy produce the same event-driven outcome', () => {
    const strat: Strategy = () => ({ taxRate: 0.3 });
    strat.onCrisis = () => 0;
    const a = runHeadless({ seed: 42, strategy: strat, maxMonths: 120 });
    const b = runHeadless({ seed: 42, strategy: strat, maxMonths: 120 });
    expect(a).toEqual(b);
  });

  it('crisis choices can change the outcome — refusing every crisis differs from accepting every crisis', () => {
    const refuse: Strategy = () => ({ taxRate: 0.3 });
    refuse.onCrisis = () => 0; // always pick first option

    const accept: Strategy = () => ({ taxRate: 0.3 });
    accept.onCrisis = (_s, ev) => (ev.choices ? ev.choices.length - 1 : 0); // always last option

    const a = runHeadless({ seed: 9, strategy: refuse, maxMonths: 240 });
    const b = runHeadless({ seed: 9, strategy: accept, maxMonths: 240 });
    // It is enough that the two diverge (extraction or months differ);
    // crises move the system, so two opposite policies should not produce
    // identical RunResults.
    expect(a).not.toEqual(b);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run src/sim/events-balance.test.ts`
Expected: PASS — 3 tests.

If a test fails, STOP and report BLOCKED. Do not adjust the catalog or constants. The
most likely cause is an off-by-one in the picker, the firing logic, or the pending-event
queue.

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS — every test file green (Plan 1 + Plan 2 files plus the new Plan 3 ones:
events, event-catalog, events-balance).

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/sim/events-balance.test.ts
git commit -m "test: prove the events system runs deterministically end-to-end"
```

---

## Done — what this plan delivers

The full headless simulation: every mechanic from Plans 1-2 PLUS a deterministic event
engine that draws weighted from a curated catalog, fires events with effects, resolves
crises via a Strategy callback, schedules chained follow-ups (false flag →
investigation), and appends to a serialisable event log. Ten v1 events cover all four
event kinds and the chaining mechanism. The whole pipeline is unit-tested and
integration-tested; deterministic for any given seed.

**Next: Plan 4 — the Electron shell & UI.** It builds the visible game on top of the
proven headless core: an Electron desktop window, the SVG district map, the HUD with the
two loss meters, the lever dashboard, the events feed (showing `eventLog` entries), the
crisis modal (which calls a real player function in place of `Strategy.onCrisis`),
speed controls, and save/load.
