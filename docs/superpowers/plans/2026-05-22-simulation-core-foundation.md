# Simulation Core — Fiscal Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a headless, deterministic, fully-tested TypeScript simulation of *The State*'s fiscal-economic core — districts, the money system, the autonomous bureaucratic vise, and a bankruptcy loss — runnable from a headless harness.

**Architecture:** Pure TypeScript, no DOM and no Electron. A single serializable `GameState` object; a `tick(state)` function advances one in-game month through a fixed pipeline. Every tunable number lives in `src/content/`. The simulation is deterministic.

**Tech Stack:** TypeScript, Vitest, Node. (Vite and Electron arrive in a later plan.)

---

## Context

This is **Plan 1 of 4** for *The State* (see the design doc at
`docs/superpowers/specs/2026-05-22-the-state-game-design.md`):

1. **Simulation core — fiscal foundation** *(this plan)* — state, tick, economy, the money
   system, bankruptcy, headless harness.
2. Simulation core — population & control (meters, four control levers, emigration,
   Revolt + Spell-Breaks losses, scoring).
3. The events system.
4. The game — Electron shell & UI.

This plan produces working, testable software on its own: a headless fiscal simulation
that already demonstrates the design's central "fiscal vise" (design doc §3.6). It builds
no UI — per design doc §6.4, the simulation core is built and proven headless first.

**Scope note for the implementer:** This plan deliberately implements only Wealth,
the money system, and the Bankruptcy loss. The other four meters, the other four levers,
emigration, and the Revolt / Spell-Breaks losses are Plan 2. Where this plan's code has a
natural extension point for Plan 2, a comment marks it. Do not build ahead of this plan.

All numeric constants in this plan are deliberate *starting values*, not balanced final
values — design doc §8 specifies that balance is found later by simulation. The tests
assert structural truths (e.g. "the vise always eventually closes"), not exact numbers.

---

## File Structure

This plan creates the project skeleton and the `src/sim/` and `src/content/` modules
needed for a headless fiscal simulation.

- `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore` — project setup.
- `src/sim/types.ts` — all shared types (`GameState`, `District`, `RunResult`, `LossCause`).
- `src/sim/util.ts` — small pure helpers (`clamp`).
- `src/sim/rng.ts` — deterministic seeded RNG (unused by this plan's tick; established now
  so the state shape is stable for later plans).
- `src/content/constants.ts` — every tunable number, in one place.
- `src/content/districts.ts` — the nine starting districts.
- `src/sim/state.ts` — `createInitialState()`.
- `src/sim/economy.ts` — district wealth growth.
- `src/sim/inflation.ts` — inflation momentum.
- `src/sim/treasury.ts` — tax income, bureaucratic bloat, treasury settlement.
- `src/sim/levers.ts` — the two fiscal levers: `setTaxRate`, `printMoney`.
- `src/sim/loss.ts` — loss detection (Bankruptcy in this plan).
- `src/sim/tick.ts` — the monthly tick pipeline.
- `src/sim/harness.ts` — `runHeadless()` for automated balance runs.

Each `.ts` module gets a co-located `*.test.ts` (Vitest convention — files that change
together live together).

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "the-state",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`, `vitest.config.ts`, and `.gitignore`**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
  },
});
```

`.gitignore`:

```
node_modules/
dist/
*.log
```

- [ ] **Step 3: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 4: Verify the toolchain runs**

Run: `npm test`
Expected: Vitest runs and exits 0 with a "no test files" message (allowed by
`passWithNoTests`).

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore package-lock.json
git commit -m "chore: scaffold TypeScript + Vitest project"
```

---

## Task 2: Deterministic seeded RNG

**Files:**
- Create: `src/sim/rng.ts`
- Test: `src/sim/rng.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/rng.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { nextRandom } from './rng';

describe('nextRandom', () => {
  it('returns a value in [0, 1)', () => {
    const { value } = nextRandom(12345);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('is deterministic for the same input state', () => {
    expect(nextRandom(999)).toEqual(nextRandom(999));
  });

  it('produces a varied sequence when chained through its returned state', () => {
    let state = 42;
    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      const r = nextRandom(state);
      seen.add(r.value);
      state = r.rngState;
    }
    expect(seen.size).toBeGreaterThan(15);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/rng.test.ts`
Expected: FAIL — cannot find module `./rng`.

- [ ] **Step 3: Write the implementation**

`src/sim/rng.ts`:

```ts
/**
 * Deterministic seeded RNG (mulberry32). Pure: takes the current rng state,
 * returns a value in [0, 1) and the next state. The next state must be fed back
 * in for the following draw. Used by later plans (events); included now so the
 * GameState shape is stable.
 */
export function nextRandom(rngState: number): { value: number; rngState: number } {
  const t = (rngState + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: t };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/rng.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/rng.ts src/sim/rng.test.ts
git commit -m "feat: add deterministic seeded RNG"
```

---

## Task 3: Shared types and the clamp helper

**Files:**
- Create: `src/sim/types.ts`
- Create: `src/sim/util.ts`
- Test: `src/sim/util.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/util.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { clamp } from './util';

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps up to the minimum', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps down to the maximum', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/util.test.ts`
Expected: FAIL — cannot find module `./util`.

- [ ] **Step 3: Write the implementations**

`src/sim/types.ts`:

```ts
/** A run ends with exactly one of these causes. Plan 2 adds 'revolt' | 'spell-breaks'. */
export type LossCause = 'bankruptcy';

/** One district of the country. Plan 2 adds happiness/awareness/unrest meters. */
export interface District {
  id: string;
  name: string;
  population: number; // citizens
  wealth: number; // 0..100, average prosperity
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

`src/sim/util.ts`:

```ts
/** Constrain `value` to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
```

- [ ] **Step 4: Run the test and typecheck to verify they pass**

Run: `npx vitest run src/sim/util.test.ts`
Expected: PASS — 3 tests.

Run: `npm run typecheck`
Expected: exits 0 (no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/sim/types.ts src/sim/util.ts src/sim/util.test.ts
git commit -m "feat: add shared simulation types and clamp helper"
```

---

## Task 4: Tunable constants

**Files:**
- Create: `src/content/constants.ts`
- Test: `src/content/constants.test.ts`

- [ ] **Step 1: Write the failing test**

`src/content/constants.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CONSTANTS } from './constants';

describe('CONSTANTS', () => {
  it('exposes positive economic and fiscal parameters', () => {
    expect(CONSTANTS.baseWealthGrowth).toBeGreaterThan(0);
    expect(CONSTANTS.taxYield).toBeGreaterThan(0);
    expect(CONSTANTS.startingTreasury).toBeGreaterThan(0);
    expect(CONSTANTS.initialUpkeep).toBeGreaterThan(0);
  });

  it('keeps rates as sensible fractions', () => {
    expect(CONSTANTS.startingTaxRate).toBeGreaterThanOrEqual(0);
    expect(CONSTANTS.startingTaxRate).toBeLessThanOrEqual(1);
    expect(CONSTANTS.bloatRate).toBeGreaterThan(0);
    expect(CONSTANTS.bloatRate).toBeLessThan(0.1);
    expect(CONSTANTS.inflationPressureDecay).toBeGreaterThan(0);
    expect(CONSTANTS.inflationPressureDecay).toBeLessThan(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/constants.test.ts`
Expected: FAIL — cannot find module `./constants`.

- [ ] **Step 3: Write the implementation**

`src/content/constants.ts`:

```ts
/**
 * Every tunable number in the fiscal core, in one place (design doc §8).
 * These are deliberate STARTING values, not balanced final values — balance is
 * found later by headless simulation.
 */
export const CONSTANTS = {
  // --- Economy (district wealth is on a 0..100 scale) ---
  baseWealthGrowth: 0.5, // wealth points/month at zero tax and zero inflation
  taxGrowthDrag: 1.0, // wealth growth lost per 1.0 of tax rate
  inflationGrowthDrag: 0.04, // wealth growth lost per 1 point of inflation
  wealthFloor: 0,
  wealthCeiling: 100,

  // --- Taxation ---
  startingTaxRate: 0.2,
  taxYield: 0.01, // treasury per (wealth * population) per month at tax rate 1.0

  // --- Money printing & inflation ---
  printInflationPerThousand: 0.6, // inflation pressure added per 1000 printed
  inflationCatchUp: 0.25, // fraction of the gap inflation closes toward pressure each month
  inflationPressureDecay: 0.82, // fraction of pressure retained each month

  // --- Treasury & the bureaucracy ---
  startingTreasury: 5000,
  initialUpkeep: 450, // monthly apparatus upkeep at the start of a run
  bloatRate: 0.004, // upkeep grows 0.4%/month on its own (design doc §3.6)
} as const;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/constants.test.ts`
Expected: PASS — 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/constants.ts src/content/constants.test.ts
git commit -m "feat: add tunable simulation constants"
```

---

## Task 5: District definitions

**Files:**
- Create: `src/content/districts.ts`
- Test: `src/content/districts.test.ts`

- [ ] **Step 1: Write the failing test**

`src/content/districts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { INITIAL_DISTRICTS } from './districts';

describe('INITIAL_DISTRICTS', () => {
  it('defines exactly nine districts', () => {
    expect(INITIAL_DISTRICTS).toHaveLength(9);
  });

  it('gives every district a unique id', () => {
    const ids = INITIAL_DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(9);
  });

  it('starts every district with a positive population and wealth in 0..100', () => {
    for (const d of INITIAL_DISTRICTS) {
      expect(d.population).toBeGreaterThan(0);
      expect(d.wealth).toBeGreaterThanOrEqual(0);
      expect(d.wealth).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/content/districts.test.ts`
Expected: FAIL — cannot find module `./districts`.

- [ ] **Step 3: Write the implementation**

`src/content/districts.ts`:

```ts
import type { District } from '../sim/types';

/** The nine starting districts — varied so the map has texture (design doc §3.1). */
export const INITIAL_DISTRICTS: readonly District[] = [
  { id: 'capital', name: 'The Capital', population: 1200, wealth: 70 },
  { id: 'industrial', name: 'The Industrial Belt', population: 1500, wealth: 50 },
  { id: 'port', name: 'The Port', population: 900, wealth: 55 },
  { id: 'oldtown', name: 'Old Town', population: 700, wealth: 45 },
  { id: 'university', name: 'The University Quarter', population: 500, wealth: 60 },
  { id: 'outerwards', name: 'The Outer Wards', population: 1800, wealth: 25 },
  { id: 'farmland', name: 'The Farmlands', population: 1100, wealth: 35 },
  { id: 'frontier', name: 'The Frontier', population: 600, wealth: 30 },
  { id: 'garrison', name: 'The Garrison Town', population: 800, wealth: 40 },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/content/districts.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/content/districts.ts src/content/districts.test.ts
git commit -m "feat: add the nine starting districts"
```

---

## Task 6: Initial state builder

**Files:**
- Create: `src/sim/state.ts`
- Test: `src/sim/state.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/state.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';
import { INITIAL_DISTRICTS } from '../content/districts';

describe('createInitialState', () => {
  it('starts at month 0, not yet lost, with the starting treasury', () => {
    const s = createInitialState();
    expect(s.month).toBe(0);
    expect(s.lossCause).toBeNull();
    expect(s.treasury).toBe(CONSTANTS.startingTreasury);
    expect(s.taxRate).toBe(CONSTANTS.startingTaxRate);
    expect(s.apparatusUpkeep).toBe(CONSTANTS.initialUpkeep);
  });

  it('copies the nine districts so the simulation never mutates content data', () => {
    const s = createInitialState();
    expect(s.districts).toHaveLength(9);
    s.districts[0].wealth = 0;
    expect(INITIAL_DISTRICTS[0].wealth).not.toBe(0);
  });

  it('is deterministic for a given seed', () => {
    expect(createInitialState(7)).toEqual(createInitialState(7));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/state.test.ts`
Expected: FAIL — cannot find module `./state`.

- [ ] **Step 3: Write the implementation**

`src/sim/state.ts`:

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
    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    lossCause: null,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/state.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/state.ts src/sim/state.test.ts
git commit -m "feat: add initial game state builder"
```

---

## Task 7: The economy — district wealth growth

**Files:**
- Create: `src/sim/economy.ts`
- Test: `src/sim/economy.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/economy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { districtWealthDelta, updateEconomy } from './economy';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';

describe('districtWealthDelta', () => {
  it('grows wealth at the base rate when tax and inflation are zero', () => {
    expect(districtWealthDelta(0, 0)).toBeCloseTo(CONSTANTS.baseWealthGrowth);
  });

  it('goes negative when taxation is punishing', () => {
    expect(districtWealthDelta(1, 0)).toBeLessThan(0);
  });

  it('is dragged further down by inflation', () => {
    expect(districtWealthDelta(0, 20)).toBeLessThan(districtWealthDelta(0, 0));
  });
});

describe('updateEconomy', () => {
  it('raises district wealth under a light tax', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.districts[0].wealth;
    updateEconomy(s);
    expect(s.districts[0].wealth).toBeGreaterThan(before);
  });

  it('never pushes wealth outside 0..100', () => {
    const s = createInitialState();
    s.taxRate = 1;
    for (const d of s.districts) d.wealth = 0.1;
    updateEconomy(s);
    for (const d of s.districts) {
      expect(d.wealth).toBeGreaterThanOrEqual(0);
      expect(d.wealth).toBeLessThanOrEqual(100);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: FAIL — cannot find module `./economy`.

- [ ] **Step 3: Write the implementation**

`src/sim/economy.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/**
 * The monthly change in a district's wealth. Taxation and inflation both drag
 * growth down; past a point the drag exceeds base growth and wealth shrinks
 * (the Laffer dynamic, design doc §4.1). Tax and inflation are national, so in
 * this plan every district drifts at the same rate; Plan 2 adds per-district
 * variation.
 */
export function districtWealthDelta(taxRate: number, inflation: number): number {
  const taxDrag = taxRate * CONSTANTS.taxGrowthDrag;
  const inflationDrag = inflation * CONSTANTS.inflationGrowthDrag;
  return CONSTANTS.baseWealthGrowth - taxDrag - inflationDrag;
}

/** Advance every district's wealth by one month, clamped to 0..100. */
export function updateEconomy(state: GameState): void {
  const delta = districtWealthDelta(state.taxRate, state.inflation);
  for (const d of state.districts) {
    d.wealth = clamp(d.wealth + delta, CONSTANTS.wealthFloor, CONSTANTS.wealthCeiling);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/economy.ts src/sim/economy.test.ts
git commit -m "feat: add district wealth growth"
```

---

## Task 8: Inflation momentum

**Files:**
- Create: `src/sim/inflation.ts`
- Test: `src/sim/inflation.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/inflation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { updateInflation } from './inflation';
import { createInitialState } from './state';

describe('updateInflation', () => {
  it('lets inflation keep climbing while pressure sits above it (momentum)', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.inflationPressure = 10;
    updateInflation(s);
    expect(s.inflation).toBeGreaterThan(0);
    expect(s.inflation).toBeLessThan(10);
  });

  it('decays pending pressure over time', () => {
    const s = createInitialState();
    s.inflationPressure = 10;
    updateInflation(s);
    expect(s.inflationPressure).toBeLessThan(10);
  });

  it('never lets inflation fall below zero', () => {
    const s = createInitialState();
    s.inflation = 0;
    s.inflationPressure = 0;
    updateInflation(s);
    expect(s.inflation).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/inflation.test.ts`
Expected: FAIL — cannot find module `./inflation`.

- [ ] **Step 3: Write the implementation**

`src/sim/inflation.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Advance inflation one month. Inflation chases its pending `inflationPressure`,
 * closing only a fraction of the gap each month — so it keeps climbing for a
 * while after money is printed, and is slow to come back down (design doc §4.2).
 * The pressure itself decays as it is realised.
 */
export function updateInflation(state: GameState): void {
  const gap = state.inflationPressure - state.inflation;
  state.inflation += gap * CONSTANTS.inflationCatchUp;
  if (state.inflation < 0) state.inflation = 0;
  state.inflationPressure *= CONSTANTS.inflationPressureDecay;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/inflation.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/inflation.ts src/sim/inflation.test.ts
git commit -m "feat: add inflation momentum"
```

---

## Task 9: Treasury and the bureaucracy

**Files:**
- Create: `src/sim/treasury.ts`
- Test: `src/sim/treasury.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/treasury.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { taxIncome, growBureaucracy, updateTreasury } from './treasury';
import { createInitialState } from './state';

describe('taxIncome', () => {
  it('is zero when the tax rate is zero', () => {
    const s = createInitialState();
    s.taxRate = 0;
    expect(taxIncome(s)).toBe(0);
  });

  it('is positive when the state taxes a populated, wealthy country', () => {
    const s = createInitialState();
    s.taxRate = 0.3;
    expect(taxIncome(s)).toBeGreaterThan(0);
  });
});

describe('growBureaucracy', () => {
  it('expands apparatus upkeep on its own, every month', () => {
    const s = createInitialState();
    const before = s.apparatusUpkeep;
    growBureaucracy(s);
    expect(s.apparatusUpkeep).toBeGreaterThan(before);
  });
});

describe('updateTreasury', () => {
  it('adds tax income and records it as lifetime extraction', () => {
    const s = createInitialState();
    s.taxRate = 0.3;
    s.apparatusUpkeep = 0;
    updateTreasury(s);
    expect(s.lifetimeExtraction).toBeGreaterThan(0);
  });

  it('deducts apparatus upkeep from the treasury', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.apparatusUpkeep = 1000;
    const before = s.treasury;
    updateTreasury(s);
    expect(s.treasury).toBe(before - 1000);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/treasury.test.ts`
Expected: FAIL — cannot find module `./treasury`.

- [ ] **Step 3: Write the implementation**

`src/sim/treasury.ts`:

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

/** Collect tax, record the extraction, and pay the month's apparatus upkeep. */
export function updateTreasury(state: GameState): void {
  const income = taxIncome(state);
  state.treasury += income;
  state.lifetimeExtraction += income;
  state.treasury -= state.apparatusUpkeep;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/treasury.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/treasury.ts src/sim/treasury.test.ts
git commit -m "feat: add treasury settlement and bureaucratic bloat"
```

---

## Task 10: The fiscal levers — taxation and money printing

**Files:**
- Create: `src/sim/levers.ts`
- Test: `src/sim/levers.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/levers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { setTaxRate, printMoney } from './levers';
import { createInitialState } from './state';

describe('setTaxRate', () => {
  it('sets a rate that is within range', () => {
    const s = createInitialState();
    setTaxRate(s, 0.45);
    expect(s.taxRate).toBe(0.45);
  });

  it('clamps rates outside 0..1', () => {
    const s = createInitialState();
    setTaxRate(s, 1.8);
    expect(s.taxRate).toBe(1);
    setTaxRate(s, -0.5);
    expect(s.taxRate).toBe(0);
  });
});

describe('printMoney', () => {
  it('adds cash to the treasury and to lifetime extraction', () => {
    const s = createInitialState();
    const before = s.treasury;
    printMoney(s, 2000);
    expect(s.treasury).toBe(before + 2000);
    expect(s.lifetimeExtraction).toBe(2000);
  });

  it('raises inflation pressure — the hidden cost', () => {
    const s = createInitialState();
    printMoney(s, 5000);
    expect(s.inflationPressure).toBeGreaterThan(0);
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    const before = s.treasury;
    printMoney(s, -100);
    printMoney(s, 0);
    expect(s.treasury).toBe(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: FAIL — cannot find module `./levers`.

- [ ] **Step 3: Write the implementation**

`src/sim/levers.ts`:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { clamp } from './util';

/** Lever 1 — Taxation. Set the standing tax rate (clamped to 0..1). */
export function setTaxRate(state: GameState, rate: number): void {
  state.taxRate = clamp(rate, 0, 1);
}

/**
 * Lever 2 — Money printing. Instant cash, but it adds inflation pressure that
 * will be realised as inflation over the following months (design doc §4.2).
 */
export function printMoney(state: GameState, amount: number): void {
  if (amount <= 0) return;
  state.treasury += amount;
  state.lifetimeExtraction += amount;
  state.inflationPressure += (amount / 1000) * CONSTANTS.printInflationPerThousand;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/levers.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/levers.ts src/sim/levers.test.ts
git commit -m "feat: add taxation and money-printing levers"
```

---

## Task 11: Loss detection — bankruptcy

**Files:**
- Create: `src/sim/loss.ts`
- Test: `src/sim/loss.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/loss.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkLoss } from './loss';
import { createInitialState } from './state';

describe('checkLoss', () => {
  it('leaves a solvent state running', () => {
    const s = createInitialState();
    s.treasury = 100;
    checkLoss(s);
    expect(s.lossCause).toBeNull();
  });

  it('ends the run in bankruptcy when the treasury is exhausted', () => {
    const s = createInitialState();
    s.treasury = 0;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('ends the run in bankruptcy when the treasury goes negative', () => {
    const s = createInitialState();
    s.treasury = -250;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });

  it('never overwrites an existing loss cause', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    s.treasury = 9999;
    checkLoss(s);
    expect(s.lossCause).toBe('bankruptcy');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/loss.test.ts`
Expected: FAIL — cannot find module `./loss`.

- [ ] **Step 3: Write the implementation**

`src/sim/loss.ts`:

```ts
import type { GameState } from './types';

/**
 * Detect a finished run. In this plan, the only loss is bankruptcy — an empty
 * treasury. Plan 2 extends this with 'revolt' and 'spell-breaks', and refines
 * bankruptcy into the unrest cascade of design doc §3.6.
 */
export function checkLoss(state: GameState): void {
  if (state.lossCause !== null) return;
  if (state.treasury <= 0) {
    state.lossCause = 'bankruptcy';
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/loss.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/loss.ts src/sim/loss.test.ts
git commit -m "feat: add bankruptcy loss detection"
```

---

## Task 12: The tick pipeline

**Files:**
- Create: `src/sim/tick.ts`
- Test: `src/sim/tick.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/tick.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { tick } from './tick';
import { createInitialState } from './state';

describe('tick', () => {
  it('advances the calendar by one month', () => {
    const s = createInitialState();
    tick(s);
    expect(s.month).toBe(1);
  });

  it('runs the economy — district wealth moves', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.districts[0].wealth;
    tick(s);
    expect(s.districts[0].wealth).not.toBe(before);
  });

  it('settles the treasury — upkeep is paid', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.treasury;
    tick(s);
    expect(s.treasury).toBeLessThan(before);
  });

  it('grows the bureaucracy each tick', () => {
    const s = createInitialState();
    const before = s.apparatusUpkeep;
    tick(s);
    expect(s.apparatusUpkeep).toBeGreaterThan(before);
  });

  it('does not advance a run that is already over', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    tick(s);
    expect(s.month).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: FAIL — cannot find module `./tick`.

- [ ] **Step 3: Write the implementation**

`src/sim/tick.ts`:

```ts
import type { GameState } from './types';
import { updateEconomy } from './economy';
import { updateInflation } from './inflation';
import { growBureaucracy, updateTreasury } from './treasury';
import { checkLoss } from './loss';

/**
 * Advance the simulation by one in-game month. The fixed pipeline mirrors design
 * doc §5.1; steps not yet built are marked for the plan that adds them.
 */
export function tick(state: GameState): void {
  if (state.lossCause !== null) return; // a finished run does not advance

  // 1. Economy
  updateEconomy(state);

  // 2. Meters — Plan 1: inflation only. Plan 2 adds happiness/awareness/unrest/fear.
  updateInflation(state);

  // 3. Population (emigration) — Plan 2.

  // 4. Treasury
  growBureaucracy(state);
  updateTreasury(state);

  // 5. Aggregates (national unrest, prosperity) — Plan 2.
  // 6. Events — Plan 3.

  // 7. Loss check
  checkLoss(state);

  // 8. Advance the calendar.
  state.month += 1;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/tick.ts src/sim/tick.test.ts
git commit -m "feat: add the monthly tick pipeline"
```

---

## Task 13: The headless harness

**Files:**
- Create: `src/sim/harness.ts`
- Test: `src/sim/harness.test.ts`

- [ ] **Step 1: Write the failing test**

`src/sim/harness.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from './harness';

describe('runHeadless', () => {
  it('stops at maxMonths when the state survives that long', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 24 });
    expect(r.monthsSurvived).toBeLessThanOrEqual(24);
  });

  it('returns a RunResult with all three fields', () => {
    const r = runHeadless({ strategy: () => ({}), maxMonths: 12 });
    expect(r).toHaveProperty('monthsSurvived');
    expect(r).toHaveProperty('lifetimeExtraction');
    expect(r).toHaveProperty('lossCause');
  });

  it('is deterministic for the same seed and strategy', () => {
    const opts = { seed: 5, strategy: () => ({ taxRate: 0.25 }), maxMonths: 60 };
    expect(runHeadless(opts)).toEqual(runHeadless(opts));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/sim/harness.test.ts`
Expected: FAIL — cannot find module `./harness`.

- [ ] **Step 3: Write the implementation**

`src/sim/harness.ts`:

```ts
import type { GameState, RunResult } from './types';
import { createInitialState } from './state';
import { tick } from './tick';
import { setTaxRate, printMoney } from './levers';

/**
 * A Strategy is an automated "player": each month it inspects the state and
 * returns the decisions to apply before the tick. This is how balance is
 * explored without a UI (design doc §6.4).
 */
export interface Strategy {
  (state: GameState): { taxRate?: number; print?: number };
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
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/sim/harness.ts src/sim/harness.test.ts
git commit -m "feat: add headless simulation harness"
```

---

## Task 14: Integration test — the fiscal vise

**Files:**
- Create: `src/sim/balance.test.ts`

This task adds no new module. It is an integration test that exercises the whole pipeline
through the harness and asserts the structural truths the fiscal core must have — above
all, that the vise (design doc §3.6) always eventually closes.

- [ ] **Step 1: Write the integration test**

`src/sim/balance.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { runHeadless } from './harness';

describe('fiscal vise — structural balance', () => {
  it('a state that never taxes goes bankrupt quickly', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0 }), maxMonths: 600 });
    expect(r.lossCause).toBe('bankruptcy');
    expect(r.monthsSurvived).toBeLessThan(60);
  });

  it('a steady, moderate tax cannot outrun the bureaucracy forever — the vise always closes', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 2400 });
    expect(r.lossCause).toBe('bankruptcy');
  });

  it('a moderate tax still buys many years of rule before the vise closes', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 2400 });
    expect(r.monthsSurvived).toBeGreaterThan(60); // more than five years
  });

  it('printing money is a real, recorded extraction', () => {
    const taxed = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 60 });
    const printed = runHeadless({
      strategy: () => ({ taxRate: 0.3, print: 500 }),
      maxMonths: 60,
    });
    expect(printed.lifetimeExtraction).toBeGreaterThan(taxed.lifetimeExtraction);
  });
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx vitest run src/sim/balance.test.ts`
Expected: PASS — 4 tests.

If the "moderate tax" run does NOT reach bankruptcy within 2400 months, the bureaucratic
bloat or tax-yield constants are mis-set — `bloatRate` must be > 0 and income must be
bounded (it is: wealth is capped at 100 and population is fixed), so the vise is
guaranteed to close given enough months. Adjust `CONSTANTS` only if a test reveals a
genuine structural break, not to hit a specific number.

- [ ] **Step 3: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS — all test files green (rng, util, constants, districts, state, economy,
inflation, treasury, levers, loss, tick, harness, balance).

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/sim/balance.test.ts
git commit -m "test: prove the fiscal vise always closes"
```

---

## Done — what this plan delivers

A headless, deterministic, fully-tested fiscal simulation: nine districts, a wealth
economy, taxation and money printing, inflation with momentum, an autonomously growing
bureaucracy, a bankruptcy loss, and a harness for automated balance runs. The central
"fiscal vise" of the design is provable on its own, before any UI exists.

**Next: Plan 2 — Simulation core: population & control.** It adds the Happiness,
Awareness, Unrest, and Fear meters; the four control levers (Propaganda, Education,
Repression, Manufactured threats & war); emigration; the Revolt and Spell-Breaks loss
conditions; and scoring. It extends `checkLoss`, the tick pipeline's stubbed steps 2/3/5,
and the harness's `Strategy` decision type.
