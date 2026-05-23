# The State - project notes for Claude

This file captures non-obvious things about working on this codebase that
aren't visible from the file tree or the design doc. Keep it short. Add an
entry when something burns 10+ minutes of debugging or surprises you.

## Running the app in this dev environment

The Vite dev server is configured via `.claude/launch.json` (name
"the-state-dev", port 5173). Start it with the Claude Preview MCP:
`preview_start` with name "the-state-dev". The server is reused if already
running.

`preview_screenshot` times out reliably on this app (the renderer doesn't
respond to the capture handshake within 30s, likely something about the
dark theme + SVG image + frequent re-renders). Use `preview_snapshot` for
the accessibility tree or `preview_eval` to read DOM state directly. Both
are fast and adequate for verification.

`window.theStateReset()` clears the autosave and reloads — handy when
Vite HMR leaves the loop in a stuck state after a code edit. The loop can
get into a weird state where the date stops advancing even with no modal
pending; reset fixes it.

## Event firing has two cooldown layers and a probability gate

`src/sim/events.ts` exposes three balance knobs that *all* influence how
often events surface:

- `COOLDOWN_MONTHS` — per-event-id anti-repeat. After a specific event
  fires, the same event id is ineligible for N months. Prevents the same
  line repeating back-to-back.
- `GLOBAL_KIND_COOLDOWN_MONTHS` — per-kind global throttle. After any
  event of a kind fires, *no event of that kind* is eligible for N months.
  Caps the frequency of the whole kind, not just one line.
- `MODAL_FIRE_PROBABILITY` — probability that a weighted pick of a *pause-
  causing* kind (crisis or self-provision) actually fires. Ambient and
  incident bypass this gate so the feed keeps breathing. This is the only
  layer that affects pause cadence specifically.

If you're tuning event pacing, touch the layer that matches the symptom:
"same event repeats" → COOLDOWN_MONTHS, "too many crises overall" →
GLOBAL_KIND_COOLDOWN_MONTHS.crisis, "too many modals interrupting play"
→ MODAL_FIRE_PROBABILITY.

## Loop pauses the tick on any pendingCrisis

`src/game/loop.ts` step() returns early when `pendingCrises.length > 0`,
which is why a modal freezes the simulation. The deferred-choice flow goes
fireEvent → onCrisis() returns -1 → pushes onto pendingCrises → loop sees
non-empty queue next tick → no tick. resolveCrisis(state, choiceIdx) pops
the head and applies the choice. So the modal is intentional but cadence
matters — see the event-firing knobs above.

## Event-catalog magic numbers are inline (deliberate-ish)

`src/content/event-catalog.ts` has treasury costs, awareness spikes,
inflationPressure additions, etc. as inline literals on the choice
effects. The earlier code-quality audit flagged this for extraction to
`constants.ts`. Not a blocker, just be aware: edit the catalog directly
for content tweaks, don't search constants.ts.

## Windows / Git

Git is configured locally for this repo only. Commits show CRLF/LF
warnings on every write — harmless, do not try to fix. Commit message
trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
