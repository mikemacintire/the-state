# Population & Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Plan 1's fiscal core with the population side of the simulation —
the three new per-district meters (Happiness, Awareness, Unrest), the national Fear meter,
the four control levers (Propaganda, Education monopoly, Repression, Manufactured threats),
emigration, and two new loss conditions (Revolt and Spell Breaks).

**Architecture:** Same headless, deterministic, test-first simulation. New per-district
meters and a national Fear/Prosperity meter slot into the existing tick pipeline, filling
in Plan 1's stubbed steps 2 (meters), 3 (emigration), and 5 (aggregates). Four new lever
functions write into the same `GameState`. `checkLoss` grows to detect three loss
conditions in priority order: bankruptcy, revolt, then spell-breaks. The harness's
`Strategy` decision type widens to accept all six levers.

**Tech Stack:** TypeScript, Vitest, Node. (Vite and Electron arrive in Plan 4.)

---

## Context

This is **Plan 2 of 4** for *The State* (see the design doc at
`docs/superpowers/specs/2026-05-22-the-state-game-design.md`):

1. ✅ Simulation core — fiscal foundation (Plan 1, complete).
2. **Simulation core — population & control** *(this plan)*.
3. The events system.
4. The game — Electron shell & UI.

This plan keeps the simulation **headless** — no DOM, no Electron, no UI. It builds the
population side: how the people feel, how aware they are, how angry, how afraid, and when
they revolt, emigrate, or simply tune the state out. After this plan, the headless
simulation models the whole core game loop and can be exercised end-to-end via the
existing `runHeadless()` harness.

**All numeric constants in this plan are deliberate STARTING values, not balanced final
values** — design doc §8 specifies balance is found later by simulation. Tests assert
structural truths (signs, ordering, that the right thing eventually happens), not exact
numbers.

**Scope kept tight:**

- *Manufactured threats & war* is modelled as a single generic `spawnFearOp(amount)`.
  The design doc's sub-flavours (false flag, foreign campaign, provoke, war) are driven
  by events in Plan 3; the simulation core only needs the fear-injection mechanic.
- Fear *fatigue*, *exposure risk*, and *real-harm-vs-perceived-harm* are event-layer
  concerns (Plan 3). Plan 2 implements only fear's **decay** and **cost** catches.
- Apologists and Self-Provision events are Plan 3.
- The bankruptcy → cascade narrative (design doc §3.6) is satisfied implicitly: when the
  treasury is exhausted, propaganda and education stop being paid for and so stop
  suppressing unrest. The named `lossCause` is still `'bankruptcy'` when bankruptcy is the
  proximate cause — `checkLoss` checks `treasury <= 0` first.

---

## File Structure

This plan extends Plan 1's modules and adds six new ones under `src/sim/`. Each new
mechanic gets its own focused module, mirroring Plan 1's organisation.

**Modify (Plan 1 modules that gain new responsibilities):**

- `src/content/constants.ts` — add the new tuning constants.
- `src/content/constants.test.ts` — add tests for the new constants.
- `src/content/districts.ts` — add starting `happiness`/`awareness`/`unrest` values.
- `src/sim/types.ts` — extend `District`, `GameState`, `LossCause`.
- `src/sim/state.ts` — `createInitialState` initialises the new fields.
- `src/sim/state.test.ts` — add tests for the new initial values.
- `src/sim/economy.ts` — `districtWealthDelta` gains an optional `educationLevel`.
- `src/sim/economy.test.ts` — add tests for the education drag.
- `src/sim/levers.ts` — add `setPropagandaBudget`, `setEducationLevel`, `doRepression`, `spawnFearOp`.
- `src/sim/levers.test.ts` — add tests for the four new levers.
- `src/sim/treasury.ts` — `updateTreasury` deducts propaganda + education costs.
- `src/sim/treasury.test.ts` — add tests for the new deductions.
- `src/sim/loss.ts` — `checkLoss` detects revolt and spell-breaks.
- `src/sim/loss.test.ts` — add tests for the new losses + priority.
- `src/sim/tick.ts` — fill in stubbed steps 2 (meters), 3 (emigration), 5 (aggregates).
- `src/sim/tick.test.ts` — add tests covering the new tick steps.
- `src/sim/harness.ts` — widen `Strategy` to accept all six lever decisions.
- `src/sim/harness.test.ts` — add a test for the new lever wiring.

**Create (new modules):**

- `src/sim/happiness.ts` + `happiness.test.ts` — `updateHappiness(state)`.
- `src/sim/awareness.ts` + `awareness.test.ts` — `updateAwareness(state)`.
- `src/sim/unrest.ts` + `unrest.test.ts` — `updateUnrest(state)`.
- `src/sim/fear.ts` + `fear.test.ts` — `updateFear(state)`.
- `src/sim/emigration.ts` + `emigration.test.ts` — `updateEmigration(state)`.
- `src/sim/aggregates.ts` + `aggregates.test.ts` — `updateAggregates(state)`.
- `src/sim/control-balance.test.ts` — integration tests for the structural truths.

---

## Task 1: Add Plan 2 constants

**Files:**
- Modify: `src/content/constants.ts`
- Modify: `src/content/constants.test.ts`

- [ ] **Step 1: Add the new tests in `src/content/constants.test.ts`**

Append the following two `it` blocks inside the existing `describe('CONSTANTS', ...)`:

```ts
  it('exposes positive Plan 2 meter and lever parameters', () => {
    expect(CONSTANTS.happinessFromWealth).toBeGreaterThan(0);
    expect(CONSTANTS.awarenessFromInflation).toBeGreaterThan(0);
    expect(CONSTANTS.unrestMiseryFactor).toBeGreaterThan(0);
    expect(CONSTANTS.repressionCost).toBeGreaterThan(0);
    expect(CONSTANTS.repressionUnrestCut).toBeGreaterThan(0);
    expect(CONSTANTS.fearOpCostPerUnit).toBeGreaterThan(0);
    expect(CONSTANTS.educationUpkeepPerLevel).toBeGreaterThan(0);
  });

  it('keeps Plan 2 fractions and thresholds in sensible ranges', () => {
    expect(CONSTANTS.fearDecay).toBeGreaterThan(0);
    expect(CONSTANTS.fearDecay).toBeLessThan(1);
    expect(CONSTANTS.unrestDecay).toBeGreaterThan(0);
    expect(CONSTANTS.unrestDecay).toBeLessThan(1);
    expect(CONSTANTS.happinessCatchUp).toBeGreaterThan(0);
    expect(CONSTANTS.happinessCatchUp).toBeLessThan(1);
    expect(CONSTANTS.revoltThreshold).toBeGreaterThan(0);
    expect(CONSTANTS.revoltThreshold).toBeLessThan(100);
    expect(CONSTANTS.spellBreaksThreshold).toBeGreaterThan(0);
    expect(CONSTANTS.spellBreaksThreshold).toBeLessThanOrEqual(100);
    expect(CONSTANTS.emigrationRate).toBeGreaterThan(0);
    expect(CONSTANTS.emigrationRate).toBeLessThan(1);
    expect(CONSTANTS.prosperityWealthWeight + CONSTANTS.prosperityHappinessWeight).toBeCloseTo(1);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/constants.test.ts`
Expected: FAIL — the new constants do not exist yet.

- [ ] **Step 3: Extend `src/content/constants.ts`**

Insert the following block of properties inside the `CONSTANTS` object literal, after the
existing `bloatRate` entry (i.e. immediately before the closing `} as const;`):

```ts
  // --- Per-district meters: Happiness ---
  happinessFromWealth: 1.0, // equilibrium happiness equals wealth, minus inflation drag
  happinessInflationDrag: 0.8, // happiness equilibrium loses 0.8 per 1 point of inflation
  happinessCatchUp: 0.2, // fraction of gap toward equilibrium per month
  happinessFloor: 0,
  happinessCeiling: 100,

  // --- Per-district meters: Awareness ---
  awarenessFloor: 0,
  awarenessCeiling: 100,
  awarenessFromProsperity: 0.015, // monthly rise per 1 point of (wealth - 50), clamped >=0
  awarenessFromInflation: 0.05, // monthly rise per 1 point of inflation
  awarenessEducationSuppression: 0.6, // monthly fall per unit of educationLevel
  awarenessPropagandaSuppression: 0.0003, // monthly fall per dollar of propagandaBudget
  awarenessRepressionSpike: 5, // one-shot rise per repression action (per district)

  // --- Per-district meters: Unrest ---
  unrestFloor: 0,
  unrestCeiling: 100,
  unrestMiseryFactor: 0.05, // pressure per month at full misery × full awareness
  unrestFearSuppression: 0.02, // pressure reduction per 1 point of national fear
  unrestPropagandaSuppression: 0.0005, // pressure reduction per dollar of propagandaBudget
  unrestDecay: 0.97, // monthly retention factor (3%/month decay)

  // --- National Fear ---
  fearFloor: 0,
  fearCeiling: 100,
  fearDecay: 0.97, // monthly retention factor (3%/month decay)

  // --- Lever costs and effects ---
  educationUpkeepPerLevel: 200, // monthly $ cost per unit of educationLevel
  educationWealthDrag: 0.05, // wealth growth lost per unit of educationLevel
  repressionCost: 300, // treasury cost per repression action
  repressionUnrestCut: 25, // unrest cut per repression action, per district
  fearOpCostPerUnit: 50, // treasury cost per unit of fear injected by spawnFearOp

  // --- Emigration ---
  emigrationAwarenessThreshold: 40, // contributes only when district awareness > this
  emigrationHappinessThreshold: 40, // contributes only when district happiness < this
  emigrationRate: 0.02, // monthly loss fraction at full emigration pressure

  // --- National aggregates ---
  prosperityWealthWeight: 0.6, // local prosperity = wealth*W + happiness*(1-W)
  prosperityHappinessWeight: 0.4,

  // --- Loss thresholds ---
  revoltThreshold: 70, // national unrest at or above this triggers revolt
  spellBreaksThreshold: 80, // national prosperity at or above this triggers spell-breaks
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/constants.test.ts`
Expected: PASS — 4 tests (the original 2 plus the new 2).

- [ ] **Step 5: Commit**

```bash
git add src/content/constants.ts src/content/constants.test.ts
git commit -m "feat: add Plan 2 tuning constants"
```

---

## Task 2: Extend types, districts, and initial state

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/content/districts.ts`
- Modify: `src/sim/state.ts`
- Modify: `src/sim/state.test.ts`

This task is a single coordinated edit: the `District` and `GameState` types grow, every
seed district gets its new starting meter values, `createInitialState` initialises the
new state fields, and the existing tests gain new cases for the additions. The four
files change together because the type extensions only compile when all four are updated.

- [ ] **Step 1: Add the new tests in `src/sim/state.test.ts`**

Append the following two `it` blocks inside the existing `describe('createInitialState', ...)`:

```ts
  it('initialises Plan 2 national fields to neutral starting values', () => {
    const s = createInitialState();
    expect(s.fear).toBe(0);
    expect(s.nationalUnrest).toBe(0);
    expect(s.nationalProsperity).toBe(0);
    expect(s.propagandaBudget).toBe(0);
    expect(s.educationLevel).toBe(0);
  });

  it('gives every district initial happiness, awareness, and unrest in valid range', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThanOrEqual(0);
      expect(d.happiness).toBeLessThanOrEqual(100);
      expect(d.awareness).toBeGreaterThanOrEqual(0);
      expect(d.awareness).toBeLessThanOrEqual(100);
      expect(d.unrest).toBeGreaterThanOrEqual(0);
      expect(d.unrest).toBeLessThanOrEqual(100);
    }
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/state.test.ts`
Expected: FAIL — the new fields do not exist on `GameState`/`District` yet.

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

/** The complete, serializable simulation state. */
export interface GameState {
  month: number; // months elapsed; 0 at the start of a run
  rng: number; // current RNG state (see rng.ts); carried for later plans
  treasury: number; // money on hand
  lifetimeExtraction: number; // running total of all wealth ever extracted
  inflation: number; // current inflation level, >= 0
  inflationPressure: number; // pending inflation not yet realised (momentum)
  taxRate: number; // 0..1
  apparatusUpkeep: number; // current monthly cost of the state's machinery
  // Plan 2 — control levers (set by the player; persist across ticks):
  propagandaBudget: number; // monthly $ spent on propaganda
  educationLevel: number; // 0..1, state's monopoly grip on schooling
  // Plan 2 — national meters (derived each tick from district + lever state):
  fear: number; // 0..100, perceived threat — the keystone meter
  nationalUnrest: number; // 0..100, population-weighted average district unrest
  nationalProsperity: number; // 0..100, population-weighted blend of wealth + happiness
  districts: District[];
  lossCause: LossCause | null; // null while the run is still going
}

/** The outcome of a headless run. */
export interface RunResult {
  monthsSurvived: number;
  lifetimeExtraction: number;
  lossCause: LossCause | null;
}
```

- [ ] **Step 4: Extend `src/content/districts.ts`**

Replace the existing file with:

```ts
import type { District } from '../sim/types';

/** The nine starting districts — varied so the map has texture (design doc §3.1).
 *  Each begins with `happiness === wealth` (the natural equilibrium at zero
 *  inflation), a small baseline awareness, and zero unrest. */
export const INITIAL_DISTRICTS: readonly District[] = [
  { id: 'capital', name: 'The Capital', population: 1200, wealth: 70, happiness: 70, awareness: 10, unrest: 0 },
  { id: 'industrial', name: 'The Industrial Belt', population: 1500, wealth: 50, happiness: 50, awareness: 10, unrest: 0 },
  { id: 'port', name: 'The Port', population: 900, wealth: 55, happiness: 55, awareness: 10, unrest: 0 },
  { id: 'oldtown', name: 'Old Town', population: 700, wealth: 45, happiness: 45, awareness: 10, unrest: 0 },
  { id: 'university', name: 'The University Quarter', population: 500, wealth: 60, happiness: 60, awareness: 10, unrest: 0 },
  { id: 'outerwards', name: 'The Outer Wards', population: 1800, wealth: 25, happiness: 25, awareness: 10, unrest: 0 },
  { id: 'farmland', name: 'The Farmlands', population: 1100, wealth: 35, happiness: 35, awareness: 10, unrest: 0 },
  { id: 'frontier', name: 'The Frontier', population: 600, wealth: 30, happiness: 30, awareness: 10, unrest: 0 },
  { id: 'garrison', name: 'The Garrison Town', population: 800, wealth: 40, happiness: 40, awareness: 10, unrest: 0 },
];
```

- [ ] **Step 5: Extend `src/sim/state.ts`**

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
    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    lossCause: null,
  };
}
```

- [ ] **Step 6: Run the tests and typecheck to verify they pass**

Run: `npx vitest run src/sim/state.test.ts src/content/districts.test.ts`
Expected: PASS — 5 tests (original 3 in `state.test.ts` + new 2; the existing 3 in
`districts.test.ts` continue to pass because the added fields are within range).

Run: `npm run typecheck`
Expected: exits 0 — Plan 1 modules still compile because their callers do not name the
new fields, and the District/GameState shapes are now strict supersets.

- [ ] **Step 7: Commit**

```bash
git add src/sim/types.ts src/content/districts.ts src/sim/state.ts src/sim/state.test.ts
git commit -m "feat: extend types and initial state for Plan 2 meters and levers"
```

---

## Task 3: Happiness module

**Files:**
- Create: `src/sim/happiness.ts`
- Test: `src/sim/happiness.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/happiness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { happinessTarget, updateHappiness } from './happiness';
import { createInitialState } from './state';

describe('happinessTarget', () => {
  it('equals wealth when inflation is zero (default scaling)', () => {
    expect(happinessTarget(50, 0)).toBeCloseTo(50);
  });

  it('is dragged down by inflation', () => {
    expect(happinessTarget(50, 10)).toBeLessThan(happinessTarget(50, 0));
  });

  it('never drops below zero', () => {
    expect(happinessTarget(0, 50)).toBe(0);
  });
});

describe('updateHappiness', () => {
  it('drifts each district toward its equilibrium', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.districts[0].wealth = 80;
    s.districts[0].happiness = 20;
    updateHappiness(s);
    expect(s.districts[0].happiness).toBeGreaterThan(20);
    expect(s.districts[0].happiness).toBeLessThan(80);
  });

  it('crushes happiness when inflation is severe', () => {
    const s = createInitialState();
    s.inflation = 100;
    const before = s.districts[0].happiness;
    updateHappiness(s);
    expect(s.districts[0].happiness).toBeLessThan(before);
  });

  it('keeps every district happiness within 0..100', () => {
    const s = createInitialState();
    s.inflation = 500;
    updateHappiness(s);
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThanOrEqual(0);
      expect(d.happiness).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/happiness.test.ts`
Expected: FAIL — cannot find module `./happiness`.

- [ ] **Step 3: Write the implementation**

`src/sim/happiness.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * Per-district happiness chases an equilibrium of wealth minus an inflation
 * drag, closing only a fraction of the gap each month (design doc §3.2). Tax
 * does not appear here directly; tax bites happiness indirectly by shrinking
 * wealth via the economy.
 */
export function happinessTarget(wealth: number, inflation: number): number {
  return clamp(
    wealth * CONSTANTS.happinessFromWealth - inflation * CONSTANTS.happinessInflationDrag,
    CONSTANTS.happinessFloor,
    CONSTANTS.happinessCeiling,
  );
}

/** Advance every district's happiness by one month, clamped to 0..100. */
export function updateHappiness(state: GameState): void {
  for (const d of state.districts) {
    const target = happinessTarget(d.wealth, state.inflation);
    d.happiness = clamp(
      d.happiness + (target - d.happiness) * CONSTANTS.happinessCatchUp,
      CONSTANTS.happinessFloor,
      CONSTANTS.happinessCeiling,
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/happiness.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/happiness.ts src/sim/happiness.test.ts
git commit -m "feat: add district happiness meter"
```

---

## Task 4: Awareness module

**Files:**
- Create: `src/sim/awareness.ts`
- Test: `src/sim/awareness.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/awareness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { awarenessDrift, updateAwareness } from './awareness';
import { createInitialState } from './state';

describe('awarenessDrift', () => {
  it('rises when wealth is high and there is no suppression', () => {
    expect(awarenessDrift(80, 0, 0, 0)).toBeGreaterThan(0);
  });

  it('does not rise from prosperity alone at or below wealth 50', () => {
    expect(awarenessDrift(50, 0, 0, 0)).toBeLessThanOrEqual(0);
    expect(awarenessDrift(30, 0, 0, 0)).toBeLessThanOrEqual(0);
  });

  it('rises with inflation', () => {
    expect(awarenessDrift(50, 10, 0, 0)).toBeGreaterThan(awarenessDrift(50, 0, 0, 0));
  });

  it('is held down by education and propaganda', () => {
    const unsuppressed = awarenessDrift(80, 5, 0, 0);
    const suppressed = awarenessDrift(80, 5, 1, 5000);
    expect(suppressed).toBeLessThan(unsuppressed);
  });
});

describe('updateAwareness', () => {
  it('raises awareness in a prosperous, unsuppressed country', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.wealth = 80;
      d.awareness = 20;
    }
    s.inflation = 0;
    s.educationLevel = 0;
    s.propagandaBudget = 0;
    updateAwareness(s);
    for (const d of s.districts) {
      expect(d.awareness).toBeGreaterThan(20);
    }
  });

  it('keeps awareness within 0..100 under extreme suppression', () => {
    const s = createInitialState();
    s.educationLevel = 1;
    s.propagandaBudget = 1_000_000;
    updateAwareness(s);
    for (const d of s.districts) {
      expect(d.awareness).toBeGreaterThanOrEqual(0);
      expect(d.awareness).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/awareness.test.ts`
Expected: FAIL — cannot find module `./awareness`.

- [ ] **Step 3: Write the implementation**

`src/sim/awareness.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/awareness.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/awareness.ts src/sim/awareness.test.ts
git commit -m "feat: add district awareness meter"
```

---

## Task 5: Unrest module

**Files:**
- Create: `src/sim/unrest.ts`
- Test: `src/sim/unrest.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/unrest.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { unrestPressure, updateUnrest } from './unrest';
import { createInitialState } from './state';

describe('unrestPressure', () => {
  it('is zero when people are happy', () => {
    expect(unrestPressure(100, 80, 0, 0)).toBe(0);
  });

  it('is zero when people are unaware, even if miserable', () => {
    expect(unrestPressure(0, 0, 0, 0)).toBe(0);
  });

  it('rises when both misery and awareness are high', () => {
    expect(unrestPressure(20, 80, 0, 0)).toBeGreaterThan(0);
  });

  it('is reduced by fear', () => {
    expect(unrestPressure(20, 80, 50, 0)).toBeLessThan(unrestPressure(20, 80, 0, 0));
  });

  it('is reduced by propaganda', () => {
    expect(unrestPressure(20, 80, 0, 5000)).toBeLessThan(unrestPressure(20, 80, 0, 0));
  });

  it('never goes negative under overwhelming suppression', () => {
    expect(unrestPressure(50, 100, 100, 100_000)).toBeGreaterThanOrEqual(0);
  });
});

describe('updateUnrest', () => {
  it('grows unrest in a miserable, awakened, unsuppressed district', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.happiness = 20;
      d.awareness = 80;
      d.unrest = 0;
    }
    s.fear = 0;
    s.propagandaBudget = 0;
    updateUnrest(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThan(0);
    }
  });

  it('keeps unrest within 0..100', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.happiness = 0;
      d.awareness = 100;
      d.unrest = 100;
    }
    updateUnrest(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThanOrEqual(0);
      expect(d.unrest).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/unrest.test.ts`
Expected: FAIL — cannot find module `./unrest`.

- [ ] **Step 3: Write the implementation**

`src/sim/unrest.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/unrest.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/unrest.ts src/sim/unrest.test.ts
git commit -m "feat: add district unrest meter"
```

---

## Task 6: Fear module

**Files:**
- Create: `src/sim/fear.ts`
- Test: `src/sim/fear.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/fear.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { updateFear } from './fear';
import { createInitialState } from './state';

describe('updateFear', () => {
  it('decays fear toward zero each month', () => {
    const s = createInitialState();
    s.fear = 50;
    updateFear(s);
    expect(s.fear).toBeLessThan(50);
    expect(s.fear).toBeGreaterThan(0);
  });

  it('never lets fear fall below the floor', () => {
    const s = createInitialState();
    s.fear = 0;
    updateFear(s);
    expect(s.fear).toBeGreaterThanOrEqual(0);
  });

  it('leaves a maxed-out fear high after one tick (slow decay)', () => {
    const s = createInitialState();
    s.fear = 100;
    updateFear(s);
    expect(s.fear).toBeGreaterThan(90);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/fear.test.ts`
Expected: FAIL — cannot find module `./fear`.

- [ ] **Step 3: Write the implementation**

`src/sim/fear.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * National fear decays each month and must be re-manufactured to stay up
 * (design doc §3.5). Plan 2 implements only fear's decay; fatigue, exposure,
 * and real-harm-vs-perceived-harm are event-layer concerns (Plan 3).
 */
export function updateFear(state: GameState): void {
  state.fear *= CONSTANTS.fearDecay;
  if (state.fear < CONSTANTS.fearFloor) state.fear = CONSTANTS.fearFloor;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/fear.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/fear.ts src/sim/fear.test.ts
git commit -m "feat: add national fear decay"
```

---

## Task 7: Propaganda lever

**Files:**
- Modify: `src/sim/levers.ts`
- Modify: `src/sim/levers.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/levers.test.ts`**

Append the following `describe` block to the end of the existing file (after the existing
`describe('printMoney', ...)`):

```ts
describe('setPropagandaBudget', () => {
  it('sets a non-negative monthly budget', () => {
    const s = createInitialState();
    setPropagandaBudget(s, 1500);
    expect(s.propagandaBudget).toBe(1500);
  });

  it('clamps negative inputs to zero', () => {
    const s = createInitialState();
    setPropagandaBudget(s, -50);
    expect(s.propagandaBudget).toBe(0);
  });
});
```

Also extend the existing top-of-file import to add `setPropagandaBudget`:

```ts
import { setTaxRate, printMoney, setPropagandaBudget } from './levers';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: FAIL — `setPropagandaBudget` is not exported.

- [ ] **Step 3: Extend `src/sim/levers.ts`**

Append to the end of the file:

```ts

/** Lever 3 — Propaganda. Set the standing monthly propaganda budget (>=0). */
export function setPropagandaBudget(state: GameState, dollars: number): void {
  state.propagandaBudget = Math.max(0, dollars);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: PASS — 7 tests (original 5 + new 2).

- [ ] **Step 5: Commit**

```bash
git add src/sim/levers.ts src/sim/levers.test.ts
git commit -m "feat: add propaganda budget lever"
```

---

## Task 8: Education monopoly lever and economy drag

**Files:**
- Modify: `src/sim/levers.ts`
- Modify: `src/sim/levers.test.ts`
- Modify: `src/sim/economy.ts`
- Modify: `src/sim/economy.test.ts`

- [ ] **Step 1: Add the failing tests**

In `src/sim/levers.test.ts`, extend the top-of-file import to add `setEducationLevel`:

```ts
import { setTaxRate, printMoney, setPropagandaBudget, setEducationLevel } from './levers';
```

Append the following `describe` block to the end of the file:

```ts
describe('setEducationLevel', () => {
  it('sets a level within 0..1', () => {
    const s = createInitialState();
    setEducationLevel(s, 0.6);
    expect(s.educationLevel).toBe(0.6);
  });

  it('clamps inputs outside 0..1', () => {
    const s = createInitialState();
    setEducationLevel(s, 2);
    expect(s.educationLevel).toBe(1);
    setEducationLevel(s, -0.3);
    expect(s.educationLevel).toBe(0);
  });
});
```

In `src/sim/economy.test.ts`, append the following two `it` blocks inside the existing
`describe('districtWealthDelta', ...)`:

```ts
  it('is dragged further down by an education monopoly', () => {
    expect(districtWealthDelta(0, 0, 1)).toBeLessThan(districtWealthDelta(0, 0, 0));
  });

  it('defaults educationLevel to 0 so Plan 1 callers are unaffected', () => {
    expect(districtWealthDelta(0.2, 5)).toBe(districtWealthDelta(0.2, 5, 0));
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/levers.test.ts src/sim/economy.test.ts`
Expected: FAIL — `setEducationLevel` not exported; `districtWealthDelta` does not accept
a third argument.

- [ ] **Step 3: Extend `src/sim/levers.ts`**

Append to the end of the file:

```ts

/** Lever 4 — Education monopoly. Set the level (0..1). Higher = more state grip. */
export function setEducationLevel(state: GameState, level: number): void {
  state.educationLevel = clamp(level, 0, 1);
}
```

- [ ] **Step 4: Extend `src/sim/economy.ts`**

Replace the existing file with:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * The monthly change in a district's wealth. Taxation, inflation, and an
 * education monopoly all drag growth down; past a point the drag exceeds base
 * growth and wealth shrinks (the Laffer dynamic, design doc §4.1; education's
 * docility-for-productivity tradeoff, §4.4). Tax/inflation/education are
 * national, so in this plan every district drifts at the same rate.
 */
export function districtWealthDelta(
  taxRate: number,
  inflation: number,
  educationLevel: number = 0,
): number {
  const taxDrag = taxRate * CONSTANTS.taxGrowthDrag;
  const inflationDrag = inflation * CONSTANTS.inflationGrowthDrag;
  const educationDrag = educationLevel * CONSTANTS.educationWealthDrag;
  return CONSTANTS.baseWealthGrowth - taxDrag - inflationDrag - educationDrag;
}

/** Advance every district's wealth by one month, clamped to 0..100. */
export function updateEconomy(state: GameState): void {
  const delta = districtWealthDelta(state.taxRate, state.inflation, state.educationLevel);
  for (const d of state.districts) {
    d.wealth = clamp(d.wealth + delta, CONSTANTS.wealthFloor, CONSTANTS.wealthCeiling);
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/sim/levers.test.ts src/sim/economy.test.ts`
Expected: PASS — 9 tests in levers.test.ts (5 + 2 + 2), 7 tests in economy.test.ts (5 + 2).

- [ ] **Step 6: Commit**

```bash
git add src/sim/levers.ts src/sim/levers.test.ts src/sim/economy.ts src/sim/economy.test.ts
git commit -m "feat: add education monopoly lever and economy drag"
```

---

## Task 9: Repression lever

**Files:**
- Modify: `src/sim/levers.ts`
- Modify: `src/sim/levers.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/levers.test.ts`**

Extend the top-of-file import:

```ts
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
} from './levers';
```

Add `CONSTANTS` to the top-of-file imports too (it is needed by the new tests):

```ts
import { CONSTANTS } from '../content/constants';
```

Append the following `describe` block to the end of the file:

```ts
describe('doRepression', () => {
  it('deducts the action cost from the treasury', () => {
    const s = createInitialState();
    s.treasury = 5000;
    doRepression(s);
    expect(s.treasury).toBe(5000 - CONSTANTS.repressionCost);
  });

  it('cuts unrest across every district', () => {
    const s = createInitialState();
    s.treasury = 5000;
    for (const d of s.districts) d.unrest = 60;
    doRepression(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeLessThan(60);
    }
  });

  it('spikes awareness across every district', () => {
    const s = createInitialState();
    s.treasury = 5000;
    const before = s.districts.map((d) => d.awareness);
    doRepression(s);
    for (let i = 0; i < s.districts.length; i++) {
      expect(s.districts[i].awareness).toBeGreaterThan(before[i]);
    }
  });

  it('does nothing when the state cannot afford it', () => {
    const s = createInitialState();
    s.treasury = CONSTANTS.repressionCost - 1;
    const treasuryBefore = s.treasury;
    const unrestBefore = s.districts[0].unrest;
    doRepression(s);
    expect(s.treasury).toBe(treasuryBefore);
    expect(s.districts[0].unrest).toBe(unrestBefore);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: FAIL — `doRepression` not exported.

- [ ] **Step 3: Extend `src/sim/levers.ts`**

Append to the end of the file:

```ts

/**
 * Lever 5 — Repression. Direct force: cuts unrest fast across every district,
 * but spikes awareness sharply — the moment the mask slips (design doc §4.5).
 * Costs treasury. Does nothing if the state cannot afford it.
 */
export function doRepression(state: GameState): void {
  if (state.treasury < CONSTANTS.repressionCost) return;
  state.treasury -= CONSTANTS.repressionCost;
  for (const d of state.districts) {
    d.unrest = Math.max(0, d.unrest - CONSTANTS.repressionUnrestCut);
    d.awareness = Math.min(
      CONSTANTS.awarenessCeiling,
      d.awareness + CONSTANTS.awarenessRepressionSpike,
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: PASS — 13 tests (5 + 2 + 2 + 4).

- [ ] **Step 5: Commit**

```bash
git add src/sim/levers.ts src/sim/levers.test.ts
git commit -m "feat: add repression lever"
```

---

## Task 10: Manufactured-threats lever (spawnFearOp)

**Files:**
- Modify: `src/sim/levers.ts`
- Modify: `src/sim/levers.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/levers.test.ts`**

Extend the top-of-file import:

```ts
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
} from './levers';
```

Append the following `describe` block to the end of the file:

```ts
describe('spawnFearOp', () => {
  it('adds fear and deducts the per-unit cost', () => {
    const s = createInitialState();
    s.treasury = 5000;
    spawnFearOp(s, 10);
    expect(s.fear).toBe(10);
    expect(s.treasury).toBe(5000 - 10 * CONSTANTS.fearOpCostPerUnit);
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    s.treasury = 5000;
    const before = s.treasury;
    spawnFearOp(s, 0);
    spawnFearOp(s, -5);
    expect(s.treasury).toBe(before);
    expect(s.fear).toBe(0);
  });

  it('does nothing when the state cannot afford the op', () => {
    const s = createInitialState();
    s.treasury = 100;
    spawnFearOp(s, 100); // would cost 100 * fearOpCostPerUnit, far more than 100
    expect(s.treasury).toBe(100);
    expect(s.fear).toBe(0);
  });

  it('clamps fear to the ceiling', () => {
    const s = createInitialState();
    s.treasury = 1_000_000;
    spawnFearOp(s, 500);
    expect(s.fear).toBe(CONSTANTS.fearCeiling);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: FAIL — `spawnFearOp` not exported.

- [ ] **Step 3: Extend `src/sim/levers.ts`**

Append to the end of the file:

```ts

/**
 * Lever 6 — Manufactured threats. Inject fear at a per-unit cost — the
 * keystone tool that suppresses unrest, awareness, and prosperity all at once
 * (design doc §3.5, §4.6). Plan 3's events differentiate this into false
 * flags, foreign campaigns, provocations, and wars.
 */
export function spawnFearOp(state: GameState, fearAmount: number): void {
  if (fearAmount <= 0) return;
  const cost = fearAmount * CONSTANTS.fearOpCostPerUnit;
  if (state.treasury < cost) return;
  state.treasury -= cost;
  state.fear = Math.min(CONSTANTS.fearCeiling, state.fear + fearAmount);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: PASS — 17 tests (5 + 2 + 2 + 4 + 4).

- [ ] **Step 5: Commit**

```bash
git add src/sim/levers.ts src/sim/levers.test.ts
git commit -m "feat: add manufactured-threats lever"
```

---

## Task 11: Emigration module

**Files:**
- Create: `src/sim/emigration.ts`
- Test: `src/sim/emigration.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/emigration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { emigrationPressure, updateEmigration } from './emigration';
import { createInitialState } from './state';

describe('emigrationPressure', () => {
  it('is zero in a contented, oblivious district', () => {
    expect(emigrationPressure(10, 80)).toBe(0);
  });

  it('is zero in a contented but awakened district', () => {
    expect(emigrationPressure(90, 80)).toBe(0);
  });

  it('is zero in a miserable but oblivious district', () => {
    expect(emigrationPressure(10, 10)).toBe(0);
  });

  it('is positive in a miserable, awakened district', () => {
    expect(emigrationPressure(90, 10)).toBeGreaterThan(0);
  });
});

describe('updateEmigration', () => {
  it('reduces population in a miserable, awakened district', () => {
    const s = createInitialState();
    s.districts[0].awareness = 90;
    s.districts[0].happiness = 10;
    s.districts[0].population = 10_000;
    updateEmigration(s);
    expect(s.districts[0].population).toBeLessThan(10_000);
  });

  it('leaves a contented district alone', () => {
    const s = createInitialState();
    s.districts[0].awareness = 20;
    s.districts[0].happiness = 80;
    const before = s.districts[0].population;
    updateEmigration(s);
    expect(s.districts[0].population).toBe(before);
  });

  it('never lets population go below zero', () => {
    const s = createInitialState();
    s.districts[0].awareness = 100;
    s.districts[0].happiness = 0;
    s.districts[0].population = 1;
    for (let i = 0; i < 1000; i++) updateEmigration(s);
    expect(s.districts[0].population).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/emigration.test.ts`
Expected: FAIL — cannot find module `./emigration`.

- [ ] **Step 3: Write the implementation**

`src/sim/emigration.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Voting with their feet (design doc §3.9). A district whose awareness exceeds
 * a threshold AND whose happiness sits below a threshold loses population each
 * month — citizens emigrate, taking their taxable wealth with them. The most
 * productive citizens leave first; this plan models only the aggregate loss,
 * not which kind of citizen left.
 */
export function emigrationPressure(awareness: number, happiness: number): number {
  const aware = Math.max(0, awareness - CONSTANTS.emigrationAwarenessThreshold);
  const miserable = Math.max(0, CONSTANTS.emigrationHappinessThreshold - happiness);
  return (aware / 100) * (miserable / 100);
}

/** Advance every district's population by one month of emigration. */
export function updateEmigration(state: GameState): void {
  for (const d of state.districts) {
    const pressure = emigrationPressure(d.awareness, d.happiness);
    if (pressure <= 0) continue;
    const loss = d.population * CONSTANTS.emigrationRate * pressure;
    d.population = Math.max(0, Math.floor(d.population - loss));
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/emigration.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/emigration.ts src/sim/emigration.test.ts
git commit -m "feat: add emigration"
```

---

## Task 12: National aggregates module

**Files:**
- Create: `src/sim/aggregates.ts`
- Test: `src/sim/aggregates.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/aggregates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { updateAggregates } from './aggregates';
import { createInitialState } from './state';

describe('updateAggregates', () => {
  it('reports zero national unrest when every district is calm', () => {
    const s = createInitialState();
    for (const d of s.districts) d.unrest = 0;
    updateAggregates(s);
    expect(s.nationalUnrest).toBe(0);
  });

  it('weights district unrest by population', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.unrest = 0;
      d.population = 100;
    }
    s.districts[0].unrest = 80;
    s.districts[0].population = 1000;
    updateAggregates(s);
    // Only the first district carries any unrest; its population dominates,
    // so national unrest is between 0 and 80.
    expect(s.nationalUnrest).toBeGreaterThan(0);
    expect(s.nationalUnrest).toBeLessThan(80);
  });

  it('rises with national prosperity', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.wealth = 20;
      d.happiness = 20;
    }
    updateAggregates(s);
    const low = s.nationalProsperity;
    for (const d of s.districts) {
      d.wealth = 90;
      d.happiness = 90;
    }
    updateAggregates(s);
    expect(s.nationalProsperity).toBeGreaterThan(low);
  });

  it('handles an empty country without throwing', () => {
    const s = createInitialState();
    for (const d of s.districts) d.population = 0;
    updateAggregates(s);
    expect(s.nationalUnrest).toBe(0);
    expect(s.nationalProsperity).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/aggregates.test.ts`
Expected: FAIL — cannot find module `./aggregates`.

- [ ] **Step 3: Write the implementation**

`src/sim/aggregates.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Population-weighted national meters (design doc §3.4). National unrest drives
 * the Revolt loss; national prosperity drives the Spell Breaks loss. Prosperity
 * is a weighted blend of district wealth and happiness.
 */
export function updateAggregates(state: GameState): void {
  let totalPop = 0;
  let weightedUnrest = 0;
  let weightedProsperity = 0;
  for (const d of state.districts) {
    totalPop += d.population;
    weightedUnrest += d.unrest * d.population;
    const localProsperity =
      d.wealth * CONSTANTS.prosperityWealthWeight +
      d.happiness * CONSTANTS.prosperityHappinessWeight;
    weightedProsperity += localProsperity * d.population;
  }
  state.nationalUnrest = totalPop > 0 ? weightedUnrest / totalPop : 0;
  state.nationalProsperity = totalPop > 0 ? weightedProsperity / totalPop : 0;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/aggregates.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/aggregates.ts src/sim/aggregates.test.ts
git commit -m "feat: add national aggregates"
```

---

## Task 13: Treasury extension — propaganda and education costs

**Files:**
- Modify: `src/sim/treasury.ts`
- Modify: `src/sim/treasury.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/treasury.test.ts`**

Add `CONSTANTS` to the top-of-file imports:

```ts
import { CONSTANTS } from '../content/constants';
```

Append the following two `it` blocks inside the existing `describe('updateTreasury', ...)`:

```ts
  it('deducts the standing propaganda budget from the treasury', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.apparatusUpkeep = 0;
    s.propagandaBudget = 800;
    const before = s.treasury;
    updateTreasury(s);
    expect(s.treasury).toBe(before - 800);
  });

  it('deducts the education monopoly cost from the treasury', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.apparatusUpkeep = 0;
    s.educationLevel = 1;
    const before = s.treasury;
    updateTreasury(s);
    expect(s.treasury).toBe(before - CONSTANTS.educationUpkeepPerLevel);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/treasury.test.ts`
Expected: FAIL — `updateTreasury` does not yet deduct the propaganda budget or the
education cost.

- [ ] **Step 3: Extend `src/sim/treasury.ts`**

Replace the existing file with:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/** This month's tax take: a fraction of the country's total taxable wealth. */
export function taxIncome(state: GameState): number {
  let taxableWealth = 0;
  for (const d of state.districts) {
    taxableWealth += d.wealth * d.population;
  }
  return taxableWealth * state.taxRate * CONSTANTS.taxYield;
}

/**
 * The bureaucracy expands on its own, every month, whether or not the player
 * builds anything — the engine of the fiscal vise (design doc §3.6).
 */
export function growBureaucracy(state: GameState): void {
  state.apparatusUpkeep *= 1 + CONSTANTS.bloatRate;
}

/**
 * Collect tax, record the extraction, and pay the month's running costs:
 * apparatus upkeep, the standing propaganda budget, and the education
 * monopoly's upkeep. Repression and fear-op costs are one-shot and deducted
 * at the moment the lever is pulled (in levers.ts), not here.
 */
export function updateTreasury(state: GameState): void {
  const income = taxIncome(state);
  state.treasury += income;
  state.lifetimeExtraction += income;
  state.treasury -= state.apparatusUpkeep;
  state.treasury -= state.propagandaBudget;
  state.treasury -= state.educationLevel * CONSTANTS.educationUpkeepPerLevel;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/treasury.test.ts`
Expected: PASS — 7 tests (original 5 + new 2).

- [ ] **Step 5: Commit**

```bash
git add src/sim/treasury.ts src/sim/treasury.test.ts
git commit -m "feat: deduct propaganda and education costs from treasury"
```

---

## Task 14: Loss extension — revolt and spell-breaks

**Files:**
- Modify: `src/sim/loss.ts`
- Modify: `src/sim/loss.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/loss.test.ts`**

Add `CONSTANTS` to the top-of-file imports:

```ts
import { CONSTANTS } from '../content/constants';
```

Append the following `it` blocks inside the existing `describe('checkLoss', ...)`:

```ts
  it('ends the run in revolt when national unrest crosses the threshold', () => {
    const s = createInitialState();
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('revolt');
  });

  it('ends the run in spell-breaks when national prosperity crosses the threshold', () => {
    const s = createInitialState();
    s.nationalProsperity = CONSTANTS.spellBreaksThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('spell-breaks');
  });

  it('prefers bankruptcy over revolt when both could fire', () => {
    const s = createInitialState();
    s.treasury = 0;
    s.nationalUnrest = CONSTANTS.revoltThreshold + 10;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('prefers revolt over spell-breaks when both could fire', () => {
    const s = createInitialState();
    s.nationalUnrest = CONSTANTS.revoltThreshold;
    s.nationalProsperity = CONSTANTS.spellBreaksThreshold;
    checkLoss(s);
    expect(s.lossCause).toBe('revolt');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/loss.test.ts`
Expected: FAIL — `checkLoss` only knows about bankruptcy.

- [ ] **Step 3: Extend `src/sim/loss.ts`**

Replace the existing file with:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Detect a finished run. Three loss conditions, checked in priority order:
 *
 * 1. **Bankruptcy** — treasury at zero. (Cascades into revolt in the design's
 *    narrative since a broke state cannot pay its propagandists or enforcers,
 *    but the proximate cause is bankruptcy, so the run is named that way.)
 * 2. **Revolt** — population-weighted national unrest at or above the threshold.
 * 3. **Spell Breaks** — population-weighted national prosperity at or above the
 *    threshold (the people stop needing the state).
 */
export function checkLoss(state: GameState): void {
  if (state.lossCause !== null) return;
  if (state.treasury <= 0) {
    state.lossCause = 'bankruptcy';
    return;
  }
  if (state.nationalUnrest >= CONSTANTS.revoltThreshold) {
    state.lossCause = 'revolt';
    return;
  }
  if (state.nationalProsperity >= CONSTANTS.spellBreaksThreshold) {
    state.lossCause = 'spell-breaks';
    return;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/loss.test.ts`
Expected: PASS — 8 tests (original 4 + new 4).

- [ ] **Step 5: Commit**

```bash
git add src/sim/loss.ts src/sim/loss.test.ts
git commit -m "feat: add revolt and spell-breaks loss detection"
```

---

## Task 15: Tick pipeline extension

**Files:**
- Modify: `src/sim/tick.ts`
- Modify: `src/sim/tick.test.ts`

- [ ] **Step 1: Add the failing tests in `src/sim/tick.test.ts`**

Append the following `it` blocks inside the existing `describe('tick', ...)`:

```ts
  it('drifts district happiness toward its equilibrium each tick', () => {
    const s = createInitialState();
    s.taxRate = 0;
    for (const d of s.districts) {
      d.wealth = 80;
      d.happiness = 30;
    }
    tick(s);
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThan(30);
    }
  });

  it('decays national fear each tick', () => {
    const s = createInitialState();
    s.fear = 50;
    tick(s);
    expect(s.fear).toBeLessThan(50);
  });

  it('computes national aggregates each tick', () => {
    const s = createInitialState();
    for (const d of s.districts) d.unrest = 30;
    tick(s);
    expect(s.nationalUnrest).toBeGreaterThan(0);
  });

  it('runs the emigration step (a deliberately-neglected district shrinks)', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.districts[0].awareness = 95;
    s.districts[0].happiness = 5;
    s.districts[0].population = 100_000;
    tick(s);
    expect(s.districts[0].population).toBeLessThan(100_000);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: FAIL — the tick pipeline's steps 2, 3, and 5 are still stubs from Plan 1.

- [ ] **Step 3: Extend `src/sim/tick.ts`**

Replace the existing file with:

```ts
import type { GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { updateHappiness } from './happiness';
import { updateAwareness } from './awareness';
import { updateUnrest } from './unrest';
import { updateFear } from './fear';
import { updateEmigration } from './emigration';
import { growBureaucracy, updateTreasury } from './treasury';
import { updateAggregates } from './aggregates';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors
 * design doc §5.1. Step 6 (events) is filled in by Plan 3.
 */
export function tick(state: GameState): void {
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

  // 6. Events — Plan 3.

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: PASS — 9 tests (original 5 + new 4).

- [ ] **Step 5: Commit**

```bash
git add src/sim/tick.ts src/sim/tick.test.ts
git commit -m "feat: wire population, meters, and aggregates into the tick pipeline"
```

---

## Task 16: Harness Strategy extension

**Files:**
- Modify: `src/sim/harness.ts`
- Modify: `src/sim/harness.test.ts`

- [ ] **Step 1: Add the failing test in `src/sim/harness.test.ts`**

Append the following `it` block inside the existing `describe('runHeadless', ...)`:

```ts
  it('applies the full set of Plan 2 control levers from the strategy', () => {
    // This run exercises every decision channel: tax, print, propaganda
    // budget, education level, repression, and a fear op. It just needs to
    // execute end-to-end without throwing and return a sensible RunResult.
    const r = runHeadless({
      strategy: () => ({
        taxRate: 0.3,
        print: 100,
        propagandaBudget: 200,
        educationLevel: 0.4,
        repression: true,
        fearOp: 2,
      }),
      maxMonths: 12,
    });
    expect(r.monthsSurvived).toBeGreaterThanOrEqual(0);
    expect(r.monthsSurvived).toBeLessThanOrEqual(12);
    expect(['bankruptcy', 'revolt', 'spell-breaks', null]).toContain(r.lossCause);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/harness.test.ts`
Expected: FAIL — the Strategy decision type does not yet accept `propagandaBudget`,
`educationLevel`, `repression`, or `fearOp`.

- [ ] **Step 3: Extend `src/sim/harness.ts`**

Replace the existing file with:

```ts
import type { GameState, RunResult } from './types';
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
 * returns the decisions to apply before the tick. This is how balance is
 * explored without a UI (design doc §6.4). Plan 2 widens the decision type to
 * cover all six levers.
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
    tick(state);
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
Expected: PASS — 4 tests (original 3 + new 1).

- [ ] **Step 5: Commit**

```bash
git add src/sim/harness.ts src/sim/harness.test.ts
git commit -m "feat: widen harness Strategy to all six levers"
```

---

## Task 17: Integration test — structural truths of the control core

**Files:**
- Create: `src/sim/control-balance.test.ts`

This task adds no new module. It is an integration test that exercises the full pipeline
through the tick and harness, and asserts the structural truths the control core must
have. Like Plan 1's `balance.test.ts`, the assertions are about *signs and ordering*,
not exact numbers.

- [ ] **Step 1: Write the integration test**

`src/sim/control-balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { tick } from './tick';
import { runHeadless } from './harness';

describe('control-balance — structural truths', () => {
  it('a miserable, awakened country builds unrest over time', () => {
    const s = createInitialState();
    s.taxRate = 0;
    for (const d of s.districts) {
      d.happiness = 20;
      d.awareness = 80;
      d.unrest = 0;
    }
    for (let i = 0; i < 12; i++) {
      // refresh the meters to keep the pressure on (no economy/inflation
      // dynamics fighting the test setup)
      for (const d of s.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      tick(s);
    }
    for (const d of s.districts) {
      expect(d.unrest).toBeGreaterThan(0);
    }
  });

  it('high fear suppresses unrest in a miserable, awakened country', () => {
    const setup = () => {
      const s = createInitialState();
      s.taxRate = 0;
      for (const d of s.districts) {
        d.happiness = 20;
        d.awareness = 80;
        d.unrest = 0;
      }
      return s;
    };

    const calm = setup();
    for (let i = 0; i < 12; i++) {
      for (const d of calm.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      tick(calm);
    }

    const afraid = setup();
    for (let i = 0; i < 12; i++) {
      for (const d of afraid.districts) {
        d.happiness = 20;
        d.awareness = 80;
      }
      afraid.fear = 100; // top up to defeat decay
      tick(afraid);
    }

    expect(afraid.nationalUnrest).toBeLessThan(calm.nationalUnrest);
  });

  it('heavy propaganda holds awareness down in a prosperous country', () => {
    const setup = () => {
      const s = createInitialState();
      s.taxRate = 0;
      for (const d of s.districts) {
        d.wealth = 90;
        d.awareness = 20;
      }
      return s;
    };

    const silent = setup();
    silent.propagandaBudget = 0;
    for (let i = 0; i < 24; i++) tick(silent);

    const loud = setup();
    loud.propagandaBudget = 5000;
    for (let i = 0; i < 24; i++) tick(loud);

    const avg = (s: ReturnType<typeof setup>) =>
      s.districts.reduce((acc, d) => acc + d.awareness, 0) / s.districts.length;

    expect(avg(loud)).toBeLessThan(avg(silent));
  });

  it('emigration drains a deliberately-neglected district', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const i = 0; // outer wards already starts poor; just push it hard
    s.districts[i].awareness = 95;
    s.districts[i].happiness = 5;
    s.districts[i].population = 100_000;
    const initial = s.districts[i].population;
    for (let m = 0; m < 60; m++) {
      // hold the meters at the bad spot so emigration keeps firing
      s.districts[i].awareness = 95;
      s.districts[i].happiness = 5;
      tick(s);
    }
    expect(s.districts[i].population).toBeLessThan(initial);
  });

  it('every run ends in one of the three named loss conditions eventually', () => {
    const r = runHeadless({
      // a stubborn middle path: tax, but build no control
      strategy: () => ({ taxRate: 0.4 }),
      maxMonths: 2400,
    });
    expect(r.lossCause).not.toBeNull();
    expect(['bankruptcy', 'revolt', 'spell-breaks']).toContain(r.lossCause);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run src/sim/control-balance.test.ts`
Expected: PASS — 5 tests.

If a test fails, **do not adjust `CONSTANTS`**. The numeric constants are deliberate
starting values; balance is found later by simulation runs (design doc §8). A failing
structural test means an implementation in an earlier task has a sign bug or missed a
clamp; debug the implementation, not the constants.

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS — every test file green (Plan 1's 13 files plus the 7 new Plan 2 files:
happiness, awareness, unrest, fear, emigration, aggregates, control-balance).

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/sim/control-balance.test.ts
git commit -m "test: prove structural truths of the control core"
```

---

## Done — what this plan delivers

A headless simulation of the whole core game loop. Districts have wealth, happiness,
awareness, and unrest meters; the nation has fear, prosperity, and unrest aggregates;
the player has six levers — two fiscal (tax, print) and four control (propaganda,
education, repression, manufactured threats). People emigrate from miserable, awakened
districts. The run can end three ways: bankruptcy, revolt, or the Spell Breaks. Every
mechanic is unit-tested; structural truths are integration-tested; the simulation runs
deterministically under the existing headless harness.

**Next: Plan 3 — the events system.** It fills in tick pipeline step 6 with the four
event kinds from design doc §5.2 (ambient news, incidents, crises, self-provision
events), weighted by game state, plus the curated v1 catalog of ~30 events.
