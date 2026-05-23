# Electron Shell & UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the proven headless simulation in a desktop Electron app: a real-time
loop with pause/1×/2×/3× speed, an SVG district map, a HUD with the two loss meters,
a six-lever dashboard, a scrolling events feed, a crisis modal that pauses on player
choice, a defeat screen, and a localStorage autosave. After this plan, *The State* is a
playable game.

**Architecture:** Vanilla DOM + SVG, no UI framework — the renderer is a fixed set of
modules each owning one zone of the screen, each re-rendered every tick from a single
`GameState`. The Vite dev server feeds the Electron BrowserWindow. The sim core remains
unchanged except for one focused extension in `events.ts` to support **deferred** crisis
resolution (the UI modal must pause the game and wait for a click; headless `onCrisis`
still returns synchronously).

**Tech Stack:** Electron, Vite, TypeScript, jsdom (for renderer unit tests). Vitest
continues as the test runner.

---

## Context

This is **Plan 4 of 4** for *The State*:

1. ✅ Simulation core — fiscal foundation (Plan 1).
2. ✅ Simulation core — population & control (Plan 2).
3. ✅ The events system (Plan 3).
4. **The game — Electron shell & UI** *(this plan)*.

The full headless simulation already works end-to-end via `runHeadless()`; this plan
adds the visible game. The sim core is treated as a black box that this plan only reads
from (renders) and writes to (lever calls, crisis resolutions).

**Scope kept tight (must-have for a playable v1):**

- One main screen, four zones (HUD top, SVG map left, lever dashboard right,
  events feed bottom). Crisis modal overlays. Defeat screen overlays.
- Speed controls: Pause · 1× · 2× · 3×. Auto-pause on crises (per design doc §5.2).
- All six levers exposed.
- localStorage autosave (one slot, autosaves every minute and on game over; "Continue"
  on reload).

**Out of v1 scope (deferred to a polish pass):**

- District detail panel (clicking a district just highlights it; the diagnostic view is
  v1.1).
- Map color overlay selector (default overlay is Wealth; switching to
  Happiness/Awareness/Unrest is v1.1).
- Lever preview cards (the design doc's "every lever previews its effect"; v1 shows
  effects after applying, not before).
- Teaching first-run beats (the introductory scripted scenario in design doc §6.2;
  v1 starts cold).
- A polished visual pass beyond the dark base theme.

---

## File Structure

This plan adds Electron entry, Vite config additions, a styled `index.html`, and a set
of focused renderer modules under `src/ui/`. Sim core changes are confined to a single
events.ts extension.

**Modify:**

- `package.json` — Electron, Vite, jsdom, `electron-builder` (optional, skipped in v1)
  deps; new `dev`, `build:web`, `electron` scripts.
- `tsconfig.json` — include `electron/` and `lib: ["DOM", "ES2022"]`.
- `vitest.config.ts` — set `environment: 'jsdom'` for renderer tests.
- `src/sim/types.ts` — add `PendingCrisis`; extend `GameState` with `pendingCrises`.
- `src/sim/state.ts` — `createInitialState` initialises `pendingCrises: []`.
- `src/sim/state.test.ts` — add the new state-field test.
- `src/sim/events.ts` — `fireEvent` honours `onCrisis` returning `-1` (defer); export
  `resolveCrisis(state, choiceIdx)`.
- `src/sim/events.test.ts` — add tests for the deferred path and `resolveCrisis`.

**Create:**

- `electron/main.ts` — Electron main process: window + lifecycle.
- `index.html` — minimal page shell.
- `src/ui/styles.css` — dark "situation room" base theme.
- `src/ui/format.ts` + `format.test.ts` — pure formatters (numbers, meter classes).
- `src/ui/hud.ts` — top-bar renderer.
- `src/ui/map.ts` — SVG district map renderer.
- `src/ui/dashboard.ts` — six-lever dashboard.
- `src/ui/feed.ts` — events feed renderer.
- `src/ui/modal.ts` — crisis modal (drains `state.pendingCrises`).
- `src/ui/defeat.ts` — defeat screen overlay.
- `src/game/loop.ts` — real-time loop + speed controls.
- `src/game/save.ts` — localStorage autosave + load.
- `src/game/app.ts` — entry point: load state, mount renderers, start the loop.

---

## Task 1: Project scaffolding for Electron + Vite

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `vitest.config.ts`
- Create: `vite.config.app.ts`
- Create: `index.html`
- Create: `electron/main.ts`
- Create: `src/ui/styles.css`

- [ ] **Step 1: Update `package.json`**

Replace with (preserving existing `name`/`version`/`type`/`private`):

```json
{
  "name": "the-state",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "electron/main.cjs",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "dev": "vite --config vite.config.app.ts",
    "build:web": "vite build --config vite.config.app.ts",
    "electron": "electron ."
  },
  "devDependencies": {
    "@types/node": "^22.9.0",
    "electron": "^33.0.0",
    "jsdom": "^25.0.0",
    "typescript": "^5.6.3",
    "vite": "^5.4.0",
    "vitest": "^2.1.5"
  }
}
```

(The `main: electron/main.cjs` plus `electron/main.ts` will be paired by a tiny `.cjs`
shim created in Step 5 — Electron's main process needs CommonJS, while the rest of the
project is ESM.)

- [ ] **Step 2: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["node"],
    "outDir": "dist"
  },
  "include": ["src"]
}
```

(The Electron main process is in `electron/main.cjs` — plain CommonJS JavaScript, not
TypeScript. We don't include it in `tsconfig.json` to keep the TypeScript scope to the
renderer + sim code.)

- [ ] **Step 3: Replace `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
  },
});
```

(jsdom lets renderer modules import `document`/`window` in unit tests without a real
browser. Pure sim tests are unaffected.)

- [ ] **Step 4: Create `vite.config.app.ts`**

```ts
import { defineConfig } from 'vite';

/**
 * Vite config for the renderer (the game UI). Kept separate from
 * vitest.config.ts so the test runner does not inherit dev-server settings.
 */
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
```

- [ ] **Step 5: Create `index.html`, `electron/main.cjs`, `src/ui/styles.css`**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>The State</title>
    <link rel="stylesheet" href="/src/ui/styles.css" />
  </head>
  <body>
    <div id="app">
      <header id="hud"></header>
      <main id="board">
        <section id="map"></section>
        <aside id="dashboard"></aside>
      </main>
      <footer id="feed"></footer>
      <div id="modal-root"></div>
      <div id="defeat-root"></div>
    </div>
    <script type="module" src="/src/game/app.ts"></script>
  </body>
</html>
```

`electron/main.cjs`:

```cjs
'use strict';
const { app, BrowserWindow } = require('electron');
const path = require('node:path');

const IS_DEV = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'The State',
    backgroundColor: '#0f1115',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (IS_DEV) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist-web', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`src/ui/styles.css`:

```css
/* Dark "situation-room" base theme. Design doc §6.3: restrained, official, dark UI. */
:root {
  --bg: #0f1115;
  --bg-panel: #181b22;
  --bg-elev: #1f242d;
  --fg: #d8dde6;
  --fg-dim: #8d97a8;
  --accent: #c7b27b; /* desaturated official-document gold */
  --danger: #c25555;
  --warn: #d49a3a;
  --good: #5a8c5a;
  --border: #262b34;
  --font: 'Inter', 'Segoe UI', system-ui, sans-serif;
  --mono: 'Roboto Mono', ui-monospace, monospace;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  font-size: 14px;
  height: 100%;
  overflow: hidden;
}

#app {
  display: grid;
  grid-template-rows: 64px 1fr 160px;
  height: 100vh;
}

#hud {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 20px;
  background: var(--bg-panel);
  border-bottom: 1px solid var(--border);
}

#board {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 0;
  overflow: hidden;
}

#map {
  background: var(--bg);
  overflow: auto;
}

#dashboard {
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  padding: 16px;
  overflow: auto;
}

#feed {
  background: var(--bg-panel);
  border-top: 1px solid var(--border);
  padding: 12px 20px;
  overflow: auto;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--fg-dim);
}

.hud-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hud-stat .label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-dim);
}

.hud-stat .value {
  font-family: var(--mono);
  font-size: 18px;
}

.hud-stat .value.danger {
  color: var(--danger);
}

.hud-stat .value.warn {
  color: var(--warn);
}

.speed-controls {
  margin-left: auto;
  display: flex;
  gap: 4px;
}

.speed-controls button {
  background: var(--bg-elev);
  color: var(--fg);
  border: 1px solid var(--border);
  padding: 6px 12px;
  font-family: var(--mono);
  cursor: pointer;
}

.speed-controls button.active {
  background: var(--accent);
  color: var(--bg);
}

.lever {
  border: 1px solid var(--border);
  background: var(--bg-elev);
  padding: 10px;
  margin-bottom: 10px;
}

.lever h3 {
  margin: 0 0 6px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--fg-dim);
}

.lever input[type='range'],
.lever input[type='number'] {
  width: 100%;
  background: var(--bg-panel);
  color: var(--fg);
  border: 1px solid var(--border);
  padding: 4px;
}

.lever button {
  width: 100%;
  background: var(--accent);
  color: var(--bg);
  border: none;
  padding: 8px;
  cursor: pointer;
  font-family: var(--mono);
}

#modal-root,
#defeat-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
}

.modal-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: grid;
  place-items: center;
  pointer-events: auto;
}

.modal {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  max-width: 540px;
  padding: 24px;
}

.modal h2 {
  margin: 0 0 12px;
  color: var(--accent);
}

.modal .choices {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.modal .choices button {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  color: var(--fg);
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
  font-family: var(--font);
}

.modal .choices button:hover {
  background: var(--accent);
  color: var(--bg);
}

.feed-entry {
  margin: 2px 0;
}

.district {
  fill: var(--bg-elev);
  stroke: var(--border);
  cursor: pointer;
}

.district:hover {
  stroke: var(--accent);
}
```

- [ ] **Step 6: Install the new dependencies**

Run: `npm install`
Expected: installs `electron`, `vite`, `jsdom`, plus any peer deps. Some warnings about
optional native deps for Electron are normal.

- [ ] **Step 7: Verify the toolchain still runs**

Run: `npm test`
Expected: all existing tests pass (the jsdom environment switch should not break any of
them — sim tests do not touch the DOM). Test count should be unchanged from Plan 3's
final tally (23 files / 147 tests).

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts vite.config.app.ts index.html electron/main.ts electron/main.cjs src/ui/styles.css package-lock.json
git commit -m "chore: scaffold Electron + Vite for the renderer"
```

---

## Task 2: Deferred crisis resolution

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/state.ts`
- Modify: `src/sim/state.test.ts`
- Modify: `src/sim/events.ts`
- Modify: `src/sim/events.test.ts`

The UI's crisis flow is asynchronous (modal pauses the loop; user clicks; effects
apply). The sim core's `onCrisis` is synchronous (`(state, event) => number`). The
bridge: an `onCrisis` that returns `-1` tells `fireEvent` to **defer** — apply no choice
effects, push the crisis onto `state.pendingCrises`, and let the UI drain that queue
later with `resolveCrisis(state, choiceIdx)`.

- [ ] **Step 1: Add the failing tests**

In `src/sim/state.test.ts`, append inside `describe('createInitialState', ...)`:

```ts
  it('initialises pendingCrises to empty', () => {
    const s = createInitialState();
    expect(s.pendingCrises).toEqual([]);
  });
```

In `src/sim/events.test.ts`, extend the top import to add `resolveCrisis`:

```ts
import { pickEvent, fireEvent, processEvents, resolveCrisis } from './events';
```

Append at the END of the file:

```ts
describe('deferred crisis resolution', () => {
  it('skips choice effects when onCrisis returns -1 and pushes to pendingCrises', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 500; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    fireEvent(s, event, () => -1);
    expect(s.treasury).toBe(1000); // no choice applied
    expect(s.fear).toBe(0);
    expect(s.pendingCrises).toHaveLength(1);
    expect(s.pendingCrises[0].eventId).toBe('leak');
    expect(s.pendingCrises[0].text).toBe('An archivist leaks documents.');
    expect(s.pendingCrises[0].choices).toHaveLength(2);
  });

  it('still applies base effects and schedules even when deferred', () => {
    const s = createInitialState();
    s.month = 3;
    const event: Event = {
      id: 'false-flag',
      kind: 'crisis',
      text: '...',
      weight: () => 1,
      effects: (st) => { st.fear += 1; }, // base effect
      choices: [{ label: 'A', effects: () => {} }],
      schedule: (st) => [{ eventId: 'followup', fireMonth: st.month + 1 }],
    };
    fireEvent(s, event, () => -1);
    expect(s.fear).toBe(1);
    expect(s.pendingEvents).toEqual([{ eventId: 'followup', fireMonth: 4 }]);
  });

  it('still appends a log entry for the deferred crisis (without chosenOption)', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'x',
      kind: 'crisis',
      text: 'pick',
      weight: () => 1,
      effects: () => {},
      choices: [{ label: 'A', effects: () => {} }],
    };
    fireEvent(s, event, () => -1);
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0].eventId).toBe('x');
    expect(s.eventLog[0].chosenOption).toBeUndefined();
  });
});

describe('resolveCrisis', () => {
  it('applies the chosen option and removes from pendingCrises', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const choices = [
      { label: 'A', effects: (st: typeof s) => { st.treasury -= 100; } },
      { label: 'B', effects: (st: typeof s) => { st.fear += 7; } },
    ];
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 1);
    expect(s.fear).toBe(7);
    expect(s.treasury).toBe(1000); // A was not chosen
    expect(s.pendingCrises).toHaveLength(0);
  });

  it('clamps an out-of-range choice index to the last option', () => {
    const s = createInitialState();
    const choices = [
      { label: 'A', effects: () => {} },
      { label: 'B', effects: (st: typeof s) => { st.fear = 5; } },
    ];
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 99);
    expect(s.fear).toBe(5);
    expect(s.pendingCrises).toHaveLength(0);
  });

  it('updates the matching event-log entry with the chosen option', () => {
    const s = createInitialState();
    s.month = 4;
    const choices = [
      { label: 'A', effects: () => {} },
      { label: 'B', effects: () => {} },
    ];
    // Simulate having fired the crisis earlier (one log entry with no chosenOption)
    s.eventLog.push({ month: 4, eventId: 'x', text: 'pick' });
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 1);
    expect(s.eventLog[0].chosenOption).toBe('B');
  });

  it('no-ops when pendingCrises is empty', () => {
    const s = createInitialState();
    const before = { ...s };
    resolveCrisis(s, 0);
    expect(s.fear).toBe(before.fear);
    expect(s.treasury).toBe(before.treasury);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sim/state.test.ts src/sim/events.test.ts`
Expected: FAIL — `pendingCrises` field missing; `resolveCrisis` not exported; deferred
crisis behaviour not present.

- [ ] **Step 3: Extend `src/sim/types.ts`**

Replace the entire file with:

```ts
/** A run ends with exactly one of these causes. */
export type LossCause = 'bankruptcy' | 'revolt' | 'spell-breaks';

/** One district of the country. */
export interface District {
  id: string;
  name: string;
  population: number;
  wealth: number;
  happiness: number;
  awareness: number;
  unrest: number;
}

export type EventKind = 'ambient' | 'incident' | 'crisis' | 'self-provision';

export interface EventChoice {
  label: string;
  effects: (state: GameState) => void;
}

export interface PendingEvent {
  eventId: string;
  fireMonth: number;
}

export interface EventLogEntry {
  month: number;
  eventId: string;
  text: string;
  chosenOption?: string;
}

export interface Event {
  id: string;
  kind: EventKind;
  text: string;
  weight: (state: GameState) => number;
  effects: (state: GameState) => void;
  choices?: EventChoice[];
  schedule?: (state: GameState) => PendingEvent[];
}

/**
 * A crisis (or self-provision event) awaiting a player choice. The UI modal
 * drains this queue; calling `resolveCrisis(state, idx)` applies the chosen
 * option and pops the head entry.
 */
export interface PendingCrisis {
  eventId: string;
  text: string;
  choices: EventChoice[];
}

export interface GameState {
  month: number;
  rng: number;
  treasury: number;
  lifetimeExtraction: number;
  inflation: number;
  inflationPressure: number;
  taxRate: number;
  apparatusUpkeep: number;
  propagandaBudget: number;
  educationLevel: number;
  fear: number;
  nationalUnrest: number;
  nationalProsperity: number;
  eventLog: EventLogEntry[];
  pendingEvents: PendingEvent[];
  pendingCrises: PendingCrisis[];
  districts: District[];
  lossCause: LossCause | null;
}

export interface RunResult {
  monthsSurvived: number;
  lifetimeExtraction: number;
  lossCause: LossCause | null;
}
```

- [ ] **Step 4: Extend `src/sim/state.ts`**

Replace with:

```ts
import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';
import { INITIAL_DISTRICTS } from '../content/districts';

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
    pendingCrises: [],
    districts: INITIAL_DISTRICTS.map((d) => ({ ...d })),
    lossCause: null,
  };
}
```

- [ ] **Step 5: Extend `src/sim/events.ts`**

Find the `fireEvent` function and replace it with:

```ts
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
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/sim/state.test.ts src/sim/events.test.ts`
Expected: PASS — 7 tests in state.test.ts (original 6 + new 1), 26 tests in
events.test.ts (original 18 + new 8).

Then run the full suite:

Run: `npm test`
Expected: every test file green. Plan 1/2/3 tests must continue to pass because the
default `onCrisis` returns 0 (never -1), so the new branch is dormant for headless code.

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 7: Commit**

```bash
git add src/sim/types.ts src/sim/state.ts src/sim/state.test.ts src/sim/events.ts src/sim/events.test.ts
git commit -m "feat: add deferred crisis resolution for UI"
```

---

## Task 3: UI formatters

**Files:**
- Create: `src/ui/format.ts`
- Test: `src/ui/format.test.ts`

Pure functions, fully unit-tested. Everything in this module is DOM-free.

- [ ] **Step 1: Write the failing test**

`src/ui/format.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatMonth, formatMoney, meterClass } from './format';

describe('formatMonth', () => {
  it('formats month 0 as Year 1, Jan', () => {
    expect(formatMonth(0)).toBe('Year 1, Jan');
  });
  it('formats month 11 as Year 1, Dec', () => {
    expect(formatMonth(11)).toBe('Year 1, Dec');
  });
  it('rolls into Year 2 at month 12', () => {
    expect(formatMonth(12)).toBe('Year 2, Jan');
  });
});

describe('formatMoney', () => {
  it('groups thousands and prepends a currency mark', () => {
    expect(formatMoney(5000)).toBe('$5,000');
    expect(formatMoney(1234567)).toBe('$1,234,567');
  });
  it('rounds to whole units', () => {
    expect(formatMoney(123.4)).toBe('$123');
    expect(formatMoney(123.7)).toBe('$124');
  });
  it('handles negatives', () => {
    expect(formatMoney(-200)).toBe('-$200');
  });
});

describe('meterClass', () => {
  it('returns "" when the value is well below the threshold', () => {
    expect(meterClass(10, 100)).toBe('');
  });
  it('returns "warn" when value is past 60% of threshold', () => {
    expect(meterClass(70, 100)).toBe('warn');
  });
  it('returns "danger" when value is past 85% of threshold', () => {
    expect(meterClass(90, 100)).toBe('danger');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Write the implementation**

`src/ui/format.ts`:

```ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Year N, Mon" from a 0-based monthIndex. */
export function formatMonth(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12) + 1;
  const m = MONTHS[((monthIndex % 12) + 12) % 12];
  return `Year ${year}, ${m}`;
}

/** "$1,234" with thousands separators, rounded to a whole unit. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const n = Math.abs(rounded).toLocaleString('en-US');
  return `${sign}$${n}`;
}

/**
 * CSS class for a meter value approaching a danger threshold:
 *   < 60% of threshold → ''
 *   60–85%             → 'warn'
 *   >= 85%             → 'danger'
 */
export function meterClass(value: number, threshold: number): string {
  if (threshold <= 0) return '';
  const r = value / threshold;
  if (r >= 0.85) return 'danger';
  if (r >= 0.6) return 'warn';
  return '';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/format.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts
git commit -m "feat: add UI formatters"
```

---

## Task 4: HUD renderer

**Files:**
- Create: `src/ui/hud.ts`
- Test: `src/ui/hud.test.ts`

A pure rendering function: `renderHud(state, hudEl, speed, onSpeedChange)`. Re-renders
the whole HUD every tick — simple and idempotent.

- [ ] **Step 1: Write the failing test**

`src/ui/hud.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHud } from './hud';
import { createInitialState } from '../sim/state';

describe('renderHud', () => {
  let hud: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<header id="hud"></header>';
    hud = document.getElementById('hud')!;
  });

  it('shows the calendar, treasury, inflation, fear, and both loss meters', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {});
    expect(hud.textContent).toContain('Year 1');
    expect(hud.textContent).toContain('$5,000');
    expect(hud.textContent).toContain('Unrest');
    expect(hud.textContent).toContain('Prosperity');
    expect(hud.textContent).toContain('Inflation');
    expect(hud.textContent).toContain('Fear');
  });

  it('shows four speed buttons (Pause, 1×, 2×, 3×)', () => {
    const s = createInitialState();
    renderHud(s, hud, 1, () => {});
    const buttons = hud.querySelectorAll('.speed-controls button');
    expect(buttons.length).toBe(4);
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual(['Pause', '1×', '2×', '3×']);
  });

  it('marks the active speed', () => {
    const s = createInitialState();
    renderHud(s, hud, 2, () => {});
    const active = hud.querySelector('.speed-controls button.active');
    expect(active?.textContent).toBe('2×');
  });

  it('invokes onSpeedChange with the chosen speed when a speed button is clicked', () => {
    const s = createInitialState();
    let received = -1;
    renderHud(s, hud, 1, (n) => { received = n; });
    const threeX = Array.from(hud.querySelectorAll('button')).find((b) => b.textContent === '3×')!;
    threeX.click();
    expect(received).toBe(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/hud.test.ts`
Expected: FAIL — cannot find module `./hud`.

- [ ] **Step 3: Write the implementation**

`src/ui/hud.ts`:

```ts
import type { GameState } from '../sim/types';
import { CONSTANTS } from '../content/constants';
import { formatMonth, formatMoney, meterClass } from './format';

/**
 * Render the HUD bar (design doc §6.1). Speed is 0 (paused), 1, 2, or 3;
 * `onSpeedChange` is invoked when the user clicks one of the four speed
 * buttons. The HUD is fully re-rendered each call — cheap because there are
 * only a handful of nodes.
 */
export function renderHud(
  state: GameState,
  el: HTMLElement,
  speed: 0 | 1 | 2 | 3,
  onSpeedChange: (n: 0 | 1 | 2 | 3) => void,
): void {
  el.innerHTML = '';

  const stat = (label: string, value: string, cssClass = ''): HTMLElement => {
    const node = document.createElement('div');
    node.className = 'hud-stat';
    const lbl = document.createElement('div');
    lbl.className = 'label';
    lbl.textContent = label;
    const val = document.createElement('div');
    val.className = `value ${cssClass}`.trim();
    val.textContent = value;
    node.appendChild(lbl);
    node.appendChild(val);
    return node;
  };

  el.appendChild(stat('Date', formatMonth(state.month)));
  el.appendChild(stat('Treasury', formatMoney(state.treasury)));
  el.appendChild(stat('Inflation', `${state.inflation.toFixed(1)}`));
  el.appendChild(stat('Fear', `${Math.round(state.fear)}`));
  el.appendChild(
    stat(
      'Unrest',
      `${Math.round(state.nationalUnrest)}/${CONSTANTS.revoltThreshold}`,
      meterClass(state.nationalUnrest, CONSTANTS.revoltThreshold),
    ),
  );
  el.appendChild(
    stat(
      'Prosperity',
      `${Math.round(state.nationalProsperity)}/${CONSTANTS.spellBreaksThreshold}`,
      meterClass(state.nationalProsperity, CONSTANTS.spellBreaksThreshold),
    ),
  );

  const controls = document.createElement('div');
  controls.className = 'speed-controls';
  const speeds: Array<{ n: 0 | 1 | 2 | 3; label: string }> = [
    { n: 0, label: 'Pause' },
    { n: 1, label: '1×' },
    { n: 2, label: '2×' },
    { n: 3, label: '3×' },
  ];
  for (const s of speeds) {
    const btn = document.createElement('button');
    btn.textContent = s.label;
    if (s.n === speed) btn.classList.add('active');
    btn.addEventListener('click', () => onSpeedChange(s.n));
    controls.appendChild(btn);
  }
  el.appendChild(controls);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/hud.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/hud.ts src/ui/hud.test.ts
git commit -m "feat: add HUD renderer"
```

---

## Task 5: SVG district map

**Files:**
- Create: `src/ui/map.ts`
- Test: `src/ui/map.test.ts`

Nine districts arranged in a 3×3 grid of rectangles (a deliberately abstract,
administrative look — design doc §6.3). Each district's fill is interpolated between a
"poor" colour and a "wealthy" colour based on its wealth.

- [ ] **Step 1: Write the failing test**

`src/ui/map.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderMap } from './map';
import { createInitialState } from '../sim/state';

describe('renderMap', () => {
  let mapEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<section id="map"></section>';
    mapEl = document.getElementById('map')!;
  });

  it('renders one SVG group per district (9 total)', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    const tiles = mapEl.querySelectorAll('.district');
    expect(tiles.length).toBe(9);
  });

  it('labels each tile with the district name', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    const labels = Array.from(mapEl.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toContain('The Capital');
    expect(labels).toContain('The Outer Wards');
  });

  it('colours a rich district differently from a poor one', () => {
    const s = createInitialState();
    renderMap(s, mapEl);
    // Capital starts at wealth 70; Outer Wards at 25.
    const capital = mapEl.querySelector('[data-district-id="capital"]') as SVGElement;
    const outer = mapEl.querySelector('[data-district-id="outerwards"]') as SVGElement;
    expect(capital.getAttribute('fill')).not.toBe(outer.getAttribute('fill'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/map.test.ts`
Expected: FAIL — cannot find module `./map`.

- [ ] **Step 3: Write the implementation**

`src/ui/map.ts`:

```ts
import type { District, GameState } from '../sim/types';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TILE = 120;
const PAD = 8;

/** Linear interpolation between two RGB colours by t in [0,1]. */
function lerpColor(t: number): string {
  // Poor → desaturated brown; Wealthy → muted gold (design doc §6.3 palette family).
  const poor = [60, 50, 40];
  const rich = [199, 178, 123];
  const c = poor.map((p, i) => Math.round(p + (rich[i] - p) * Math.max(0, Math.min(1, t))));
  return `rgb(${c.join(', ')})`;
}

/** Render the 9-district map as an SVG. Re-renders the whole subtree each call. */
export function renderMap(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  const svg = document.createElementNS(SVG_NS, 'svg');
  const cols = 3;
  const rows = 3;
  svg.setAttribute('width', String(cols * (TILE + PAD) + PAD));
  svg.setAttribute('height', String(rows * (TILE + PAD) + PAD));

  state.districts.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (TILE + PAD);
    const y = PAD + row * (TILE + PAD);
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('data-district-id', d.id);
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'district');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(TILE));
    rect.setAttribute('height', String(TILE));
    rect.setAttribute('fill', lerpColor(d.wealth / 100));
    g.appendChild(rect);
    g.appendChild(districtLabel(d, x + TILE / 2, y + TILE / 2));
    svg.appendChild(g);
  });
  el.appendChild(svg);
}

function districtLabel(d: District, x: number, y: number): SVGTextElement {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', String(x));
  t.setAttribute('y', String(y));
  t.setAttribute('text-anchor', 'middle');
  t.setAttribute('dominant-baseline', 'middle');
  t.setAttribute('fill', '#d8dde6');
  t.setAttribute('font-size', '12');
  t.setAttribute('font-family', 'Inter, sans-serif');
  t.textContent = d.name;
  return t;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/map.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/map.ts src/ui/map.test.ts
git commit -m "feat: add SVG district map renderer"
```

---

## Task 6: Lever dashboard

**Files:**
- Create: `src/ui/dashboard.ts`
- Test: `src/ui/dashboard.test.ts`

Six controls — two fiscal (tax slider, print button) and four control (propaganda
budget input, education slider, repression button, fear-op button). Each control calls
back to a handler that the app wires to the corresponding lever function.

- [ ] **Step 1: Write the failing test**

`src/ui/dashboard.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderDashboard } from './dashboard';
import { createInitialState } from '../sim/state';

describe('renderDashboard', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<aside id="dashboard"></aside>';
    el = document.getElementById('dashboard')!;
  });

  it('renders one control per lever (six total)', () => {
    renderDashboard(createInitialState(), el, {
      onTaxRate: () => {},
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => {},
      onFearOp: () => {},
    });
    const levers = el.querySelectorAll('.lever');
    expect(levers.length).toBe(6);
  });

  it('routes the tax slider to onTaxRate', () => {
    let lastRate = -1;
    renderDashboard(createInitialState(), el, {
      onTaxRate: (n) => { lastRate = n; },
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => {},
      onFearOp: () => {},
    });
    const slider = el.querySelector('input[data-lever="tax"]') as HTMLInputElement;
    slider.value = '0.45';
    slider.dispatchEvent(new Event('input'));
    expect(lastRate).toBeCloseTo(0.45);
  });

  it('routes the repression button to onRepression', () => {
    let pressed = 0;
    renderDashboard(createInitialState(), el, {
      onTaxRate: () => {},
      onPrint: () => {},
      onPropaganda: () => {},
      onEducation: () => {},
      onRepression: () => { pressed++; },
      onFearOp: () => {},
    });
    const btn = el.querySelector('button[data-lever="repression"]') as HTMLButtonElement;
    btn.click();
    expect(pressed).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/dashboard.test.ts`
Expected: FAIL — cannot find module `./dashboard`.

- [ ] **Step 3: Write the implementation**

`src/ui/dashboard.ts`:

```ts
import type { GameState } from '../sim/types';

export interface DashboardHandlers {
  onTaxRate: (rate: number) => void;
  onPrint: (amount: number) => void;
  onPropaganda: (budget: number) => void;
  onEducation: (level: number) => void;
  onRepression: () => void;
  onFearOp: (units: number) => void;
}

/**
 * Render the six-lever dashboard (design doc §4). Each control captures its
 * own input element and routes through the matching handler. Re-renders the
 * whole subtree each call.
 */
export function renderDashboard(
  state: GameState,
  el: HTMLElement,
  h: DashboardHandlers,
): void {
  el.innerHTML = '';

  el.appendChild(
    leverSlider('Tax rate', 'tax', 0, 1, 0.01, state.taxRate, (n) => h.onTaxRate(n)),
  );

  el.appendChild(
    leverInput('Print money ($)', 'print', 'Print', (n) => h.onPrint(n)),
  );

  el.appendChild(
    leverInput(
      'Propaganda budget ($/mo)',
      'propaganda',
      'Set',
      (n) => h.onPropaganda(n),
      state.propagandaBudget,
    ),
  );

  el.appendChild(
    leverSlider(
      'Education monopoly',
      'education',
      0,
      1,
      0.05,
      state.educationLevel,
      (n) => h.onEducation(n),
    ),
  );

  el.appendChild(leverButton('Crack down', 'repression', () => h.onRepression()));

  el.appendChild(
    leverInput('Manufacture fear (units)', 'fearop', 'Spawn', (n) => h.onFearOp(n)),
  );
}

function leverSlider(
  title: string,
  id: string,
  min: number,
  max: number,
  step: number,
  initial: number,
  on: (n: number) => void,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.dataset.lever = id;
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(initial);
  const readout = document.createElement('div');
  readout.style.fontFamily = 'var(--mono)';
  readout.style.fontSize = '12px';
  readout.style.color = 'var(--fg-dim)';
  readout.style.marginTop = '4px';
  readout.textContent = slider.value;
  slider.addEventListener('input', () => {
    readout.textContent = slider.value;
    on(Number(slider.value));
  });
  wrap.appendChild(slider);
  wrap.appendChild(readout);
  return wrap;
}

function leverInput(
  title: string,
  id: string,
  buttonLabel: string,
  on: (n: number) => void,
  initial?: number,
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const input = document.createElement('input');
  input.type = 'number';
  input.dataset.lever = id;
  input.min = '0';
  input.value = initial !== undefined ? String(initial) : '';
  wrap.appendChild(input);
  const btn = document.createElement('button');
  btn.textContent = buttonLabel;
  btn.style.marginTop = '6px';
  btn.addEventListener('click', () => {
    const n = Number(input.value);
    if (!Number.isFinite(n) || n < 0) return;
    on(n);
  });
  wrap.appendChild(btn);
  return wrap;
}

function leverButton(title: string, id: string, on: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'lever';
  const h = document.createElement('h3');
  h.textContent = title;
  wrap.appendChild(h);
  const btn = document.createElement('button');
  btn.textContent = 'Deploy force';
  btn.dataset.lever = id;
  btn.addEventListener('click', () => on());
  wrap.appendChild(btn);
  return wrap;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/dashboard.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/dashboard.ts src/ui/dashboard.test.ts
git commit -m "feat: add lever dashboard"
```

---

## Task 7: Events feed

**Files:**
- Create: `src/ui/feed.ts`
- Test: `src/ui/feed.test.ts`

A scrolling log: the last 20 entries from `state.eventLog`, newest first. Re-rendered
each tick; cheap because the slice is small.

- [ ] **Step 1: Write the failing test**

`src/ui/feed.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderFeed } from './feed';
import { createInitialState } from '../sim/state';

describe('renderFeed', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<footer id="feed"></footer>';
    el = document.getElementById('feed')!;
  });

  it('shows nothing when the log is empty', () => {
    const s = createInitialState();
    renderFeed(s, el);
    expect(el.querySelectorAll('.feed-entry').length).toBe(0);
  });

  it('shows each log entry, newest first', () => {
    const s = createInitialState();
    s.eventLog.push({ month: 0, eventId: 'a', text: 'First.' });
    s.eventLog.push({ month: 1, eventId: 'b', text: 'Second.' });
    renderFeed(s, el);
    const entries = Array.from(el.querySelectorAll('.feed-entry'));
    expect(entries[0].textContent).toContain('Second.');
    expect(entries[1].textContent).toContain('First.');
  });

  it('caps the feed at 20 entries', () => {
    const s = createInitialState();
    for (let i = 0; i < 50; i++) {
      s.eventLog.push({ month: i, eventId: `e${i}`, text: `entry ${i}` });
    }
    renderFeed(s, el);
    expect(el.querySelectorAll('.feed-entry').length).toBe(20);
  });

  it('appends the chosen option when present', () => {
    const s = createInitialState();
    s.eventLog.push({ month: 0, eventId: 'x', text: 'A choice.', chosenOption: 'Suppress' });
    renderFeed(s, el);
    const entry = el.querySelector('.feed-entry');
    expect(entry?.textContent).toContain('A choice.');
    expect(entry?.textContent).toContain('Suppress');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/feed.test.ts`
Expected: FAIL — cannot find module `./feed`.

- [ ] **Step 3: Write the implementation**

`src/ui/feed.ts`:

```ts
import type { GameState } from '../sim/types';
import { formatMonth } from './format';

const MAX_ENTRIES = 20;

/** Render the last MAX_ENTRIES events, newest first. */
export function renderFeed(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  const entries = state.eventLog.slice(-MAX_ENTRIES).reverse();
  for (const e of entries) {
    const node = document.createElement('div');
    node.className = 'feed-entry';
    const time = `[${formatMonth(e.month)}] `;
    const choice = e.chosenOption ? ` — ${e.chosenOption}` : '';
    node.textContent = `${time}${e.text}${choice}`;
    el.appendChild(node);
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/feed.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/feed.ts src/ui/feed.test.ts
git commit -m "feat: add events feed renderer"
```

---

## Task 8: Crisis modal

**Files:**
- Create: `src/ui/modal.ts`
- Test: `src/ui/modal.test.ts`

If `state.pendingCrises[0]` exists, show the modal; otherwise render nothing. Clicking
a choice button calls `onChoose(idx)`.

- [ ] **Step 1: Write the failing test**

`src/ui/modal.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderModal } from './modal';
import { createInitialState } from '../sim/state';

describe('renderModal', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="modal-root"></div>';
    el = document.getElementById('modal-root')!;
  });

  it('renders nothing when pendingCrises is empty', () => {
    const s = createInitialState();
    renderModal(s, el, () => {});
    expect(el.children.length).toBe(0);
  });

  it('renders the crisis text and one button per choice', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'leak',
      text: 'An archivist has leaked documents.',
      choices: [
        { label: 'Suppress', effects: () => {} },
        { label: 'Discredit', effects: () => {} },
        { label: 'Let it run', effects: () => {} },
      ],
    });
    renderModal(s, el, () => {});
    expect(el.textContent).toContain('archivist');
    const buttons = el.querySelectorAll('.choices button');
    expect(buttons.length).toBe(3);
    expect(buttons[0].textContent).toBe('Suppress');
  });

  it('invokes onChoose with the clicked choice index', () => {
    const s = createInitialState();
    s.pendingCrises.push({
      eventId: 'x',
      text: '...',
      choices: [
        { label: 'A', effects: () => {} },
        { label: 'B', effects: () => {} },
      ],
    });
    let chosen = -1;
    renderModal(s, el, (idx) => { chosen = idx; });
    const buttons = el.querySelectorAll('.choices button');
    (buttons[1] as HTMLElement).click();
    expect(chosen).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/modal.test.ts`
Expected: FAIL — cannot find module `./modal`.

- [ ] **Step 3: Write the implementation**

`src/ui/modal.ts`:

```ts
import type { GameState } from '../sim/types';

/**
 * Render (or clear) the crisis modal. Shows the head of `pendingCrises`; the
 * caller is responsible for pausing the game loop while pendingCrises is
 * non-empty.
 */
export function renderModal(
  state: GameState,
  el: HTMLElement,
  onChoose: (choiceIdx: number) => void,
): void {
  el.innerHTML = '';
  const crisis = state.pendingCrises[0];
  if (!crisis) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const title = document.createElement('h2');
  title.textContent = 'A decision';
  const body = document.createElement('p');
  body.textContent = crisis.text;
  const choices = document.createElement('div');
  choices.className = 'choices';
  crisis.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.textContent = c.label;
    btn.addEventListener('click', () => onChoose(i));
    choices.appendChild(btn);
  });
  modal.appendChild(title);
  modal.appendChild(body);
  modal.appendChild(choices);
  overlay.appendChild(modal);
  el.appendChild(overlay);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/modal.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/modal.ts src/ui/modal.test.ts
git commit -m "feat: add crisis modal renderer"
```

---

## Task 9: Defeat screen

**Files:**
- Create: `src/ui/defeat.ts`
- Test: `src/ui/defeat.test.ts`

When `state.lossCause` is set, overlay a defeat screen with the cause and the final two
scores (years survived, lifetime extraction).

- [ ] **Step 1: Write the failing test**

`src/ui/defeat.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderDefeat } from './defeat';
import { createInitialState } from '../sim/state';

describe('renderDefeat', () => {
  let el: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div id="defeat-root"></div>';
    el = document.getElementById('defeat-root')!;
  });

  it('renders nothing while the run is still going', () => {
    const s = createInitialState();
    renderDefeat(s, el);
    expect(el.children.length).toBe(0);
  });

  it('shows the loss cause and final scores when the run ends', () => {
    const s = createInitialState();
    s.lossCause = 'revolt';
    s.month = 240;
    s.lifetimeExtraction = 1_000_000;
    renderDefeat(s, el);
    expect(el.textContent?.toLowerCase()).toContain('revolt');
    expect(el.textContent).toContain('20'); // 240 months = 20 years
    expect(el.textContent).toContain('1,000,000');
  });

  it('uses different copy for each loss cause', () => {
    const s1 = createInitialState();
    s1.lossCause = 'bankruptcy';
    renderDefeat(s1, el);
    const t1 = el.textContent ?? '';
    const s2 = createInitialState();
    s2.lossCause = 'spell-breaks';
    renderDefeat(s2, el);
    const t2 = el.textContent ?? '';
    expect(t1).not.toBe(t2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/defeat.test.ts`
Expected: FAIL — cannot find module `./defeat`.

- [ ] **Step 3: Write the implementation**

`src/ui/defeat.ts`:

```ts
import type { GameState, LossCause } from '../sim/types';
import { formatMoney } from './format';

const TITLES: Record<LossCause, string> = {
  bankruptcy: 'Bankruptcy.',
  revolt: 'Revolt.',
  'spell-breaks': 'The Spell Breaks.',
};

const EPITAPHS: Record<LossCause, string> = {
  bankruptcy: 'The treasury is empty. Propaganda goes unread; enforcers go unpaid. The state pries its own hands off the controls.',
  revolt: 'The people came for the palace. The state was overthrown.',
  'spell-breaks': 'The people stopped needing the state. They quietly carried on without it.',
};

export function renderDefeat(state: GameState, el: HTMLElement): void {
  el.innerHTML = '';
  if (!state.lossCause) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  const title = document.createElement('h2');
  title.textContent = TITLES[state.lossCause];
  const epitaph = document.createElement('p');
  epitaph.textContent = EPITAPHS[state.lossCause];
  const stats = document.createElement('p');
  const years = (state.month / 12).toFixed(1);
  stats.innerHTML = `<strong>Longest Reign:</strong> ${years} years &nbsp; <strong>Biggest Haul:</strong> ${formatMoney(state.lifetimeExtraction)}`;
  modal.appendChild(title);
  modal.appendChild(epitaph);
  modal.appendChild(stats);
  overlay.appendChild(modal);
  el.appendChild(overlay);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/defeat.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/ui/defeat.ts src/ui/defeat.test.ts
git commit -m "feat: add defeat screen"
```

---

## Task 10: Real-time loop with speed controls

**Files:**
- Create: `src/game/loop.ts`
- Test: `src/game/loop.test.ts`

The loop runs `tick(state, onCrisisDefer)` on an interval whose period depends on
speed. `onCrisisDefer` is the trivial function `() => -1` — every crisis is deferred to
the UI modal. The loop pauses when speed=0 OR when `state.pendingCrises` is non-empty
OR when `state.lossCause` is set.

- [ ] **Step 1: Write the failing test**

`src/game/loop.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Loop } from './loop';
import { createInitialState } from '../sim/state';

describe('Loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not tick while paused (speed=0)', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(0);
    loop.start();
    vi.advanceTimersByTime(5000);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('ticks every period when running at speed 1', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 3 + 1);
    expect(s.month).toBe(3);
    loop.stop();
  });

  it('ticks faster at higher speeds', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(3);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 3 + 1);
    expect(s.month).toBeGreaterThan(3); // 3× speed in the same real-time window
    loop.stop();
  });

  it('stops ticking when pendingCrises has an entry', () => {
    const s = createInitialState();
    s.pendingCrises.push({ eventId: 'x', text: '...', choices: [{ label: 'A', effects: () => {} }] });
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 5 + 1);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('stops ticking when lossCause is set', () => {
    const s = createInitialState();
    s.lossCause = 'revolt';
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 5 + 1);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('calls the onTick callback after each tick', () => {
    const s = createInitialState();
    let calls = 0;
    const loop = new Loop(s, () => { calls++; });
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 2 + 1);
    expect(calls).toBe(2);
    loop.stop();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/loop.test.ts`
Expected: FAIL — cannot find module `./loop`.

- [ ] **Step 3: Write the implementation**

`src/game/loop.ts`:

```ts
import type { GameState } from '../sim/types';
import { tick } from '../sim/tick';

/** Base period in ms for 1× speed (one month per BASE_PERIOD_MS of wall clock). */
const BASE_PERIOD_MS = 800;

export type Speed = 0 | 1 | 2 | 3;

/**
 * Real-time game loop. setInterval-based; period is BASE_PERIOD_MS divided by
 * current speed. Pauses (skips ticks) when speed=0, when a crisis is pending,
 * or when the run has ended.
 */
export class Loop {
  private speed: Speed = 1;
  private handle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly state: GameState,
    private readonly onTick: () => void,
  ) {}

  periodFor(speed: Speed): number {
    return speed === 0 ? BASE_PERIOD_MS : Math.max(50, Math.floor(BASE_PERIOD_MS / speed));
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
    if (this.handle !== null) {
      // restart with the new period
      this.stop();
      this.start();
    }
  }

  start(): void {
    if (this.handle !== null) return;
    this.handle = setInterval(() => this.step(), this.periodFor(this.speed));
  }

  stop(): void {
    if (this.handle !== null) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }

  private step(): void {
    if (this.speed === 0) return;
    if (this.state.lossCause !== null) return;
    if (this.state.pendingCrises.length > 0) return;
    tick(this.state, () => -1); // defer every choice to the UI modal
    this.onTick();
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/loop.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/loop.ts src/game/loop.test.ts
git commit -m "feat: add real-time loop with speed controls"
```

---

## Task 11: localStorage save / load

**Files:**
- Create: `src/game/save.ts`
- Test: `src/game/save.test.ts`

Single-slot autosave to `localStorage`. The sim state is one serializable object —
`JSON.stringify` round-trip works (the only non-data fields are functions on the Event
catalog, which never live on `GameState`).

- [ ] **Step 1: Write the failing test**

`src/game/save.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState, hasSave, clearSave } from './save';
import { createInitialState } from '../sim/state';

describe('save / load', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an initial state', () => {
    const original = createInitialState(7);
    saveState(original);
    const loaded = loadState();
    expect(loaded).toEqual(original);
  });

  it('hasSave reflects whether a save exists', () => {
    expect(hasSave()).toBe(false);
    saveState(createInitialState());
    expect(hasSave()).toBe(true);
  });

  it('clearSave removes the save', () => {
    saveState(createInitialState());
    clearSave();
    expect(hasSave()).toBe(false);
    expect(loadState()).toBeNull();
  });

  it('loadState returns null when no save exists', () => {
    expect(loadState()).toBeNull();
  });

  it('returns null when the save is corrupt', () => {
    localStorage.setItem('the-state:save', 'not-json');
    expect(loadState()).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/game/save.test.ts`
Expected: FAIL — cannot find module `./save`.

- [ ] **Step 3: Write the implementation**

`src/game/save.ts`:

```ts
import type { GameState } from '../sim/types';

const KEY = 'the-state:save';

/** Persist the entire game state into localStorage (single-slot autosave). */
export function saveState(state: GameState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Load the saved state, or null if none / corrupt. */
export function loadState(): GameState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/game/save.test.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/game/save.ts src/game/save.test.ts
git commit -m "feat: add localStorage autosave"
```

---

## Task 12: App entry — wire everything together

**Files:**
- Create: `src/game/app.ts`

The entry point: find the DOM zones, load (or create) a state, instantiate the Loop,
register handlers, and start. There is no unit test for `app.ts` — it is glue. A
smoke run via `npm run dev` (Vite) confirms the page boots.

- [ ] **Step 1: Write the implementation**

`src/game/app.ts`:

```ts
import { createInitialState } from '../sim/state';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
} from '../sim/levers';
import { resolveCrisis } from '../sim/events';
import { Loop, type Speed } from './loop';
import { saveState, loadState, clearSave } from './save';
import { renderHud } from '../ui/hud';
import { renderMap } from '../ui/map';
import { renderDashboard } from '../ui/dashboard';
import { renderFeed } from '../ui/feed';
import { renderModal } from '../ui/modal';
import { renderDefeat } from '../ui/defeat';

function bootstrap(): void {
  const hudEl = document.getElementById('hud')!;
  const mapEl = document.getElementById('map')!;
  const dashboardEl = document.getElementById('dashboard')!;
  const feedEl = document.getElementById('feed')!;
  const modalEl = document.getElementById('modal-root')!;
  const defeatEl = document.getElementById('defeat-root')!;

  // If a save exists, offer to resume it — for v1, always auto-resume.
  const state = loadState() ?? createInitialState(Date.now());
  let speed: Speed = 1;

  const loop = new Loop(state, () => {
    render();
    // autosave every 12 ticks (one in-game year)
    if (state.month % 12 === 0) saveState(state);
  });

  function render(): void {
    renderHud(state, hudEl, speed, (n) => {
      speed = n;
      loop.setSpeed(n);
      render();
    });
    renderMap(state, mapEl);
    renderDashboard(state, dashboardEl, {
      onTaxRate: (n) => { setTaxRate(state, n); render(); },
      onPrint: (n) => { printMoney(state, n); render(); },
      onPropaganda: (n) => { setPropagandaBudget(state, n); render(); },
      onEducation: (n) => { setEducationLevel(state, n); render(); },
      onRepression: () => { doRepression(state); render(); },
      onFearOp: (n) => { spawnFearOp(state, n); render(); },
    });
    renderFeed(state, feedEl);
    renderModal(state, modalEl, (idx) => {
      resolveCrisis(state, idx);
      render();
    });
    renderDefeat(state, defeatEl);
    if (state.lossCause) {
      // Final autosave on game over, then keep the save so the player can
      // see the defeat screen next session if they restart.
      saveState(state);
    }
  }

  render();
  loop.setSpeed(speed);
  loop.start();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

// expose a tiny dev affordance to start over in DevTools
declare global {
  interface Window {
    theStateReset?: () => void;
  }
}
if (typeof window !== 'undefined') {
  window.theStateReset = () => {
    clearSave();
    location.reload();
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: every test file green, including all Plan 1/2/3 tests plus all Plan 4 UI
tests (format, hud, map, dashboard, feed, modal, defeat, loop, save).

- [ ] **Step 4: Smoke run — verify the page boots in dev**

Run: `npm run dev`
Expected: Vite reports `Local: http://localhost:5173`. Open the URL in a browser; the
HUD, map, dashboard, and feed are visible; the speed controls work; clicking a lever
changes state; events appear in the feed.

(For the Electron desktop wrapper: in a second terminal, after `npm run dev`,
run `npm run electron`. A native window opens displaying the same renderer. v1 ships
the dev-server flow; packaging the app for distribution is deferred.)

- [ ] **Step 5: Commit**

```bash
git add src/game/app.ts
git commit -m "feat: wire the renderer and start the game"
```

---

## Done — what this plan delivers

A playable desktop game. Open the window, watch the HUD's two loss meters tick, pull
the six levers, see events scroll past in the deadpan feed, answer crises in the modal,
lose three different ways, see the defeat screen name the cause, and watch the score —
years survived, lifetime extraction — on the way out. The game autosaves once a year
and on game over; the next launch resumes.

**Out of v1, deferred to polish passes:** district detail panel, map overlay selector,
lever previews, the teaching first-run scenario, full visual polish, the remaining
events to reach the design's "~30" v1 catalog, and packaging the Electron app for
distribution. The simulation core is sound; everything in the pipeline is unit-tested;
balance is now ready to be found by playing.
