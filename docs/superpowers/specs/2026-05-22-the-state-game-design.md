# The State — Game Design Document

**Status:** Design draft complete — all sections revised 2026-05-22 following a
three-agent design audit. Pending final review.
**Date:** 2026-05-22
**Type:** Design specification

---

## 1. Concept

*The State* is a satirical real-time management game — an inverted city-builder. The
player **is** the state, governing a population across a map of districts. The job is the
job of any state: stay solvent, stay in power, keep order. But the game is built so that
the things that keep a state alive — extraction, fear, control — are the same things that
grind the population down.

Unlike a city-builder, where a thriving city is success, here **a thriving population is a
loss condition**: a prosperous, unafraid people stop needing the state and stop believing
its story, and the state becomes irrelevant.

Nothing in the game tells the player to immiserate anyone. The player is simply trying to
keep the state alive — and discovers, move by move, that survival *is* immiseration. The
horror is emergent; the game never states its own conclusion. Left genuinely alone, the
population thrives — that is the tragedy, and the joke.

The game is built from an Austrian-economics / anarcho-capitalist perspective. Its thesis
emerges through honestly-modelled mechanics, not lectures: the state produces nothing and
survives only by extraction and coercion, and its incentives are structurally misaligned
with the people's flourishing. Every lever has a real, plausible justification — the
satire is the gap between the justification and the result.

### Tone

Grounded dark satire. Presentation is realistic and restrained — a believable
government/bureaucratic aesthetic, not cartoon. The satire is **deadpan**: the game
describes monstrous actions in the calm, euphemistic language a real state uses
("Strategic Awareness Campaign," "Preventive Stability Operation"). Comedy and critique
come from accuracy and from the escalating extremity of what the player is allowed to do —
the way GTA renders its world straight and lets the systems carry the satire.

---

## 2. Settled decisions

| Decision | Choice |
|---|---|
| Core format | Hybrid: clickable district map + policy dashboard |
| Platform | Desktop application (Electron) |
| Game loop | Real-time, pausable — a continuous-optimization loop (see §5.1) |
| v1 scope | Full single era: six levers, one map |
| Win condition | Endless — survive and score (no victory screen) |
| Simulation model | Approach A: aggregate district simulation (9 districts) |

**The six levers:** taxation, money printing, propaganda, education monopoly, repression,
and manufactured threats & war (see §4).

**Score:** two separate ladders — *Longest Reign* (years survived) and *Biggest Haul*
(lifetime extraction). See §5.3.

**Planned expansions (out of v1 scope):** Legislation + the Overton window (Expansion 1),
plus further expansions — see §7.

---

## 3. The core simulation model

### 3.1 Districts

The map is one country of **9 districts**, each with a distinct character (e.g., a wealthy
Capital, an Industrial Belt, poor Outer Wards, a Port, farmland). Districts start with
different wealth and population so the map has texture and each district is a different
problem. Districts drift independently — the player is always triaging the worst one.

### 3.2 Per-district meters

Each district carries four meters (0–100) plus a population count:

- **Wealth** — economic prosperity. Grows in a free economy; shrinks under heavy tax,
  inflation, and war.
- **Happiness** — quality of life. Driven by wealth; crushed by inflation and war.
- **Awareness** — *the political awakening.* How clearly citizens see the state itself as
  the source of their misery. Rises with prosperity, education, inflation, exposed lies,
  and heavy-handed repression. Falls under an education monopoly and sustained propaganda.
  Drives unrest conversion and exposure risk.
- **Unrest** — active anger at the regime. Rises when people are miserable *and* aware.
  Suppressed by propaganda, repression, and external scapegoats.
- **Population** — the number of citizens, and the base of the district's taxable wealth.
  Changes through emigration (see §3.9).

### 3.3 National values

- **Treasury** — the state's money on hand. A survival resource, constantly spent and
  refilled. Not a loss meter — but its exhaustion is fatal (see §3.6).
- **Lifetime Extraction** — running total of all wealth ever extracted. One of the two
  score axes (see §5.3).
- **Inflation** — driven up by money printing. Erodes wealth and happiness, raises
  awareness, and devalues the Treasury itself.
- **Perceived Threat (Fear)** — how dangerous the population believes the world is. The
  keystone meter (see §3.5).
- **Apparatus Upkeep** — the recurring cost of the state's own machinery (enforcers,
  officials, bureaucracy). It grows when the player builds new control — *and on its own,
  year after year* (see §3.6).

### 3.4 The two loss meters

The player must keep **both** below their thresholds, forever:

- **Unrest → Revolt.** Population-weighted aggregate of district unrest. At the threshold,
  the people violently overthrow the state. Game over.
- **Prosperity → "The Spell Breaks."** National aggregate of Wealth and Happiness. Rising
  Prosperity erodes the effectiveness of the Propaganda and Fear levers. At the threshold,
  narrative control fails completely — people stop believing, stop fearing, and quietly
  drift out of the state's grip. The state is not overthrown; it is tuned out. Game over —
  and the game continues in a special epilogue (see §5.3).

The cruel joke: the state loses when the people win.

### 3.5 The keystone — Fear

**Perceived Threat (Fear)** is the player's master tool. High Fear pushes *both* loss
meters down at once:

- Suppresses **Prosperity's** grip-erosion and keeps the narrative alive — frightened
  people accept the state.
- Suppresses **Unrest** and **Awareness** — frightened people aim anger at the threat, not
  the state, and don't question taxes.
- Licenses extraction — taxes and coercion meet less backlash when framed as protection.

The game's lesson emerges on its own: the state's incentive is to keep the people afraid.

**Fear's catches** (preventing it from being a dominant strategy):

- **Decay** — fear fades; it must be continually re-manufactured (a permanent recurring
  cost).
- **Cost** — every fear tool spends Treasury (see §4.6).
- **Real harm ≠ perceived harm** — the player wants scary headlines with managed reality.
  Real war damage or real unchecked crime craters Happiness, and the people may conclude
  the state is failing its one job → Unrest.
- **Exposure** — a manufactured threat can be uncovered (chance rises with Awareness),
  causing a catastrophic Awareness + Unrest spike.
- **Fatigue** — repeated scares lose potency; fresher, bigger threats are needed over time.

### 3.6 The fiscal vise — money, and the bureaucracy that eats it

The state produces nothing. Every coin is extracted — taxed from the productive economy or
printed (quiet theft via inflation). There is no other income.

- **Everything costs money, forever** — every lever is a recurring drain, on top of
  Apparatus Upkeep.
- **The bureaucracy grows on its own.** This is the engine of the vise. The state's
  apparatus expands year after year whether or not the player builds anything — offices
  beget offices. Each year a little more of the population works *for* the state instead
  of *paying* it, so Upkeep rises while the taxable base quietly shrinks. (The deadpan
  end-state of the trend: a government of nearly everyone, funded by the last remaining
  taxpayer.)
- **The vise** — costs climb on their own; income comes from a productive economy the
  player is simultaneously strangling to hold Prosperity down. The jaws close. The decline
  is *slow* — a regime can feel stable, even comfortable, for a long stretch — but it is
  always there and it never reverses on its own. (The historical pattern: the USSR
  collapsed not with a bang but a budget.)
- **Two bad ways to raise cash** — Tax (shrinks the economy, raises Unrest) or Print
  (instant, but inflation devalues all money including the Treasury, forcing more
  printing — the inflationary spiral).
- **Bankruptcy = cascade.** Treasury at zero means propaganda and enforcers go unpaid →
  Unrest surges → Revolt. Bankruptcy doesn't end the state directly; it pries the player's
  hands off the controls. The defeat screen names the true cause.

### 3.7 The strategic core — the squeeze

The squeeze is the trap the incentives spring; the player is never told to aim for it.
To hold **Prosperity** down, the state's tools keep people poor (tax, inflation, war,
neglect). But poverty breeds **Unrest** → revolt. Simply making people happy loses the
other way. So the only way the state survives is to **suppress unrest without granting
prosperity** — and the population that produces, move by honest move, is one that is
miserable but compliant. The player does not choose that outcome; the incentive structure
does.

**Awareness** governs how hard this is: low awareness means misery doesn't convert to
unrest and propaganda is cheap and effective; high awareness means misery converts fast
and propaganda fails.

**Propaganda is squeezed from both ends:** a too-aware population sees through it
(political awakening); a too-prosperous population ignores it (lived reality contradicts
it). Propaganda works best on an ignorant, struggling population — precisely the
population the incentives push the state to cultivate.

### 3.8 Self-Provision events

Periodically, voluntary solutions emerge that make people genuinely safer or more
self-sufficient without the state — private security, mutual aid, private arbitration,
sound money, independent schooling, charity outperforming state welfare. The player must
respond — ban, tax, discredit, co-opt, or raid — each costing money and risking Awareness.

Left un-crushed, a Self-Provision solution **visibly takes root**: its district's Wealth
and Happiness climb and its Unrest falls — a small, working picture of life without the
state, on the map, in plain sight (and a direct push toward The Spell Breaks).

This dramatizes the game's central thought experiment: the state will oppose even
something that helps everyone, *because* it helps everyone. Each event's strength varies;
weak ones are cheap to ignore, strong ones force an ugly, expensive choice. (Full events
system: §5.2.)

### 3.9 Emigration — voting with their feet

People can leave. A district with sustained high Unrest and high Awareness loses
population — citizens emigrate, taking their taxable wealth with them. Emigration is the
purest market signal in the game: it punishes the "miserable but compliant" sweet spot
directly, because a population kept miserable long enough simply drains away — shrinking
the tax base from a third direction, alongside the strangled economy and the swelling
bureaucracy of §3.6. The most productive citizens leave first.

---

## 4. The levers

Six levers. The first two raise money; the other four spend it to keep control. Each
carries a catch — every tool the state owns also bites the hand that holds it. Each also
has a real, plausible justification: the levers are not modelled as cartoon evil, and the
player can genuinely *try* to use them well. The model below is fixed in direction; the
numbers (costs, rates, thresholds) are tunable (see §8).

### 4.1 Taxation — the income dial

- **Control:** a tax-rate slider (0–100%), adjustable at any time.
- **Effect:** each tick, extracts Treasury ≈ rate × the population's taxable wealth; also
  feeds Lifetime Extraction.
- **Catches:**
  - Higher rates suppress Wealth growth — the economy, and so the future tax base, shrinks.
    Past a point, a wrecked economy yields *less* revenue (the Laffer curve in practice).
  - Higher felt taxation raises Unrest — sharper when Awareness is high, softer when Fear
    is high ("for your protection").
  - Low tax lets Wealth boom, which pushes Prosperity toward The Spell Breaks.
  - There is no safe setting, only tradeoffs.

### 4.2 Money printing — the emergency tap

- **Control:** a "print" action — choose an amount; Treasury rises instantly.
- **Effect:** immediate cash.
- **Catches:**
  - Raises Inflation, which has momentum — it keeps climbing after printing and is slow to
    bring down, so the real cost lands long after the cash does.
  - Inflation erodes Wealth and Happiness across all districts.
  - Inflation raises Awareness — people notice their money vanishing.
  - Inflation devalues the Treasury itself and future tax revenue, forcing still more
    printing: the inflationary spiral.
  - Perverse upside: by keeping people poorer, inflation eases the Prosperity side — a
    deliberately tempting trap.

### 4.3 Propaganda — the rented lid

- **Control:** a spending budget the player allocates — a baseline level plus targeted
  campaigns directed at specific districts or specific awareness-sources.
- **Effect:** suppresses Unrest and slows Awareness growth; more spend = more suppression,
  with diminishing returns.
- **Apologists.** Part of the budget can fund an *apologist class* — credentialed experts
  and institutions that produce respectable-looking cover for the state. When a true and
  damaging claim gains traction (say, that the state is printing money recklessly), the
  player can commission, e.g., a university study that concludes otherwise. Apologists are
  more credible than raw propaganda — their output is believed — but a discredited
  apologist (an exposed study) backfires hard.
- **Catches:**
  - A continuous drain — stop paying and Unrest snaps back. It is a lid rented, never owned.
  - Effectiveness decays as Awareness rises (people see through it) and as Prosperity rises
    (comfortable people tune it out).
  - It works cheaply and powerfully only on an ignorant, struggling population.

### 4.4 Education monopoly — the long game

- **Control:** a level the player invests to raise (free/private schooling → total state
  monopoly).
- **Effect:** slows, and at high levels reverses, Awareness growth — structural,
  generational control of the population's mind.
- **Catches:**
  - Costly to build, and adds permanent Apparatus Upkeep.
  - Slow-acting — it shapes the next generation, not today's crisis.
  - An indoctrinated, incurious population is less productive, so a high monopoly suppresses
    Wealth growth — trading a smaller tax base for a more docile one.
  - **Diminishing, then negative, returns.** A monopoly cannot drive Awareness to zero;
    the last increment is the most expensive, and a *total*, heavy-handed monopoly breeds
    its own slow resentment — a brittle population that spikes Awareness if the
    indoctrination ever visibly slips. Education is a foundation, not an off-switch.

### 4.5 Repression — the use of force

- **Control:** direct-force actions — deploy police, send in the military, break up a
  protest, impose censorship, declare a curfew.
- **Effect:** cuts Unrest *fast and directly* — the only lever that does. The panic button.
- **Catches:**
  - Spikes **Awareness** sharply — visible boots in the street are the moment the mask
    slips; force is the state at its least deniable.
  - Costs Treasury and adds Apparatus Upkeep (a standing security apparatus is permanent
    weight).
  - It treats the symptom, never the cause — unrest suppressed by force rebuilds, and the
    Awareness it generates makes the *next* suppression more expensive.
- Repression is what makes a deliberate **race to totalitarianism** possible: lean on force
  and the run can be brutal, dramatic, and short — a high *Biggest Haul*, a low *Longest
  Reign*.

### 4.6 Manufactured threats & war — the fear engine

- **Control:** an Operations panel offering escalating ways to manufacture Fear:
  - **False-flag incident** — stage a domestic attack or plot. Moderate cost, sharp Fear
    spike, contained harm — but exposable.
  - **Foreign fear campaign** — exaggerate the menace of a real foreign power. Cheap,
    deniable, no real harm; the most sustainable fear tool.
  - **Provoke an adversary** — needle a real foreign power into genuine hostility. This
    manufactures a *real* threat, so it cannot be "exposed" as fake — but the danger is
    then real.
  - **War** — heavy ongoing cost, large sustained Fear, plus an "emergency powers" window
    where control is cheaper and taxation bites less.
- **Effect:** manufactures **Fear** — the keystone that suppresses Unrest, Awareness, and
  Prosperity at once.
- **Catches:**
  - The rally fades as Fear decays — a war that drags on inverts into "why are we still
    poor?", causing an Unrest rebound.
  - False flags can be exposed (chance scales with Awareness and overuse) → catastrophic
    Awareness + Unrest spike. Foreign campaigns carry less exposure risk — but provocation
    and war do *real* harm instead.
  - Wars do real harm — too much, and the people decide the state failed its one job →
    Unrest.
  - Fatigue: repeated scares lose potency; each lands softer than the last.

### 4.7 How the levers interlock

Education monopoly (slow) holds Awareness down → which makes Propaganda cheap and
effective, false flags safe to run, and Repression less self-defeating. Fear makes
everything cheaper. Repression buys time *now* but raises Awareness, taxing every other
lever's future; money printing buys time too, and likewise raises Awareness. The skill of
the game is sequencing: build the slow foundations before they are needed, spend the fast,
cheap fixes last, and never let Awareness outrun your ability to pay for it.

---

## 5. Game loop, events, and score

### 5.1 The loop — continuous optimization

Time runs as a monthly calendar — the simulation advances one tick per in-game month,
twelve months to a year. Speed controls: **Pause · 1× · 2× · 3×**.

The game is real-time because the player should **always have something worth doing.**
The nine districts drift independently every tick; the budget is always tight and always
shifting; Fear always decays; Awareness always creeps; incidents always surface. There is
always a worthwhile adjustment available — re-target propaganda to the district waking up,
top up Fear before a rally fades, shift the budget, decide whether a flare-up is worth the
Awareness cost of force. The player is never just watching a bar fill.

Three rules keep real-time meaningful rather than stressful:

- **The player may pause and adjust any lever at any time.**
- **Auto-pause is reserved for genuine crises** — the major choice modals (§5.2), not
  every minor incident. Small problems do *not* stop the clock, so attention has value: a
  watchful player catches a district sliding early; an inattentive one pays for it.
- **Speed is a risk dial.** 3× covers ground fast but a crisis can bloom between glances;
  1× is safe but slow. Choosing a speed is itself a decision.

Each tick resolves in a fixed order:

1. **Economy** — each district's Wealth grows or shrinks (tax, inflation, education
   monopoly, war).
2. **Meters** — Happiness, Awareness, Unrest recompute per district; Fear decays;
   Inflation drifts on its momentum.
3. **Population** — emigration moves people out of miserable, awakened districts (§3.9).
4. **Treasury** — tax collected; Apparatus Upkeep (including its autonomous growth) and
   active lever costs deducted; Lifetime Extraction updated.
5. **Aggregates** — National Unrest and Prosperity recomputed.
6. **Events** — the event engine rolls (see §5.2).
7. **Loss check** — Revolt, The Spell Breaks, or bankruptcy cascade.
8. **Render** — the map recolors, the HUD updates, the events feed appends.

### 5.2 The events system

Events are both the dynamic pressure and the satirical voice. Four kinds:

- **Ambient news** — deadpan one-liners in the feed, no choice, reacting to game state
  (*"The Bureau of Statistics confirms inflation remains transitory for the ninth
  consecutive year."*). The satire lives here.
- **Incidents** — things that happen to the player, sometimes with a small mechanical
  effect, sometimes a quick choice; often consequences of the player's own actions. These
  do not pause the game.
- **Crises** — the major choice modals. The game pauses; a situation appears with 2–4
  options, each with costs and consequences (*"An archivist has leaked documents proving
  the Harbor Attack was staged. [Suppress the story — $$$, may fail] [Discredit the
  leaker — $$] [Let it run — severe Awareness + Unrest]."*). The meaty decisions live here.
- **Self-Provision events** (§3.8) — the recurring thesis-in-action: a private, voluntary
  solution emerges; the player bans / taxes / discredits / co-opts / raids / ignores it.

Events are **weighted by game state** — high inflation surfaces inflation events; a
fear-heavy reign surfaces exposure risks; a prosperous country surfaces Self-Provision
events; a boiling district surfaces riots. The feed always reflects what the player is
doing. Actions also **plant future events** — a false flag seeds a possible investigation
months later, which can chain into an exposure crisis.

**v1 content scope:** a curated set of **~30 events**, weighted toward a strong core of
8–12 full Crises with the rest cheaper Ambient and Incident lines. Event chaining is a
small number of hand-scripted chains, not a general engine. The satirical voice is a
top-tier project risk — 8–10 events should be written and play-tested early to prove the
tone before the full set is authored.

### 5.3 Score, defeat, and the epilogue

Every run ends. There is no victory screen; the score is the achievement, and it is kept
on **two separate ladders** so the two playstyles each have their own goal:

- **Longest Reign** — years survived. The patient operator's ladder.
- **Biggest Haul** — Lifetime Extraction. The smash-and-grab kleptocrat's ladder.

A run records to both. There are three ways it can end:

- **Revolt** (Unrest) and **Bankruptcy** (the §3.6 cascade) each end the run on a deadpan
  defeat screen — the cause named, an epitaph for the regime, the final stats.
- **The Spell Breaks** (Prosperity) ends the state differently, and the game says so. The
  state dissolves, and the simulation **keeps running without it** — no levers, no upkeep,
  no extraction, no fear. The player watches the freed country's Wealth and Happiness climb
  on their own. The player cannot act and cannot found a new state; it is over. This
  epilogue is the game's quiet thesis made literal: left alone, the people simply
  flourish, and all the player can do is watch the country they can no longer feed on.

v1 uses one designed starting scenario; randomized event timing keeps each run different.

---

## 6. UI and technical architecture

### 6.1 Screen layout — one main screen, four zones

- **HUD bar (top)** — date (month/year), Treasury (with a live income/expense reading),
  Inflation, Perceived Threat, and — most prominent — the two loss meters, **Unrest** and
  **Prosperity**, each with its danger zone marked. Speed controls (Pause · 1× · 2× · 3×)
  live here.
- **District map (center-left)** — the 9 districts as clickable regions, color-coded by a
  selectable overlay: Wealth / Happiness / Awareness / Unrest. Districts recolor live; a
  district in crisis is flagged. Click one → its detail panel.
- **Control dashboard (right)** — the six levers, each showing its cost and a one-line
  effect readout.
- **Events feed (bottom)** — the scrolling deadpan news log. Crisis events interrupt with
  a modal and auto-pause.

Two overlays: the **district detail panel** (a district's meters, population, and what is
driving them — the diagnostic view) and **modals** (crisis choices, the defeat screen).

### 6.2 Legibility and onboarding — the hardest design problem

The game inverts every city-builder instinct the player arrives with, on top of a web of
interacting meters. If the player cannot feel whether a move helps or hurts, the game is
noise. Legibility is therefore a first-class design requirement, not UI polish:

- **Show distance and trajectory, not just values.** Each loss meter displays how much
  headroom remains *and* which way it is heading. The player must always be able to answer
  "how close am I to losing, and am I getting closer?"
- **Every lever previews its effect.** Before committing a change, the player sees its
  projected consequences across the meters — cause and effect must never be a mystery.
- **Progressive reveal.** A new run surfaces only Treasury and the two loss meters at
  first; Awareness, Fear, and Inflation appear as the levers that drive them come online.
- **A teaching first run.** The opening scenario introduces the inversion by example — an
  early beat lets prosperity rise and frames it as a *threat* — so the player learns the
  premise by playing it, not by reading it.
- **Color language built around the inversion**, applied consistently so the player's eye
  is trained to this game's rules rather than a city-builder's.

### 6.3 Visual style

A real, serious piece of government software — a ministry "situation room." Restrained and
official; a sober, slightly cold palette; a clean administrative map; institutional
typography; a dark UI (easy on the eyes for a long session, and it sells the
operations-console feel). No cartoon, no wackiness — the satire is carried entirely by the
words. The game *looks* like it takes itself completely seriously. That is the joke.

### 6.4 Technical architecture

**Stack:** Electron (desktop shell) + TypeScript + Vite. The map renders as **SVG** (9
paths, trivial to click and recolor); HUD, dashboard, feed, and modals are plain DOM. **No
UI framework** — the dashboard is a fixed set of controls refreshed each tick; vanilla
TypeScript keeps dependencies minimal. TypeScript because the simulation is a web of
interacting numbers and types catch real bugs.

**Module boundaries** — units understood and tested independently:

- **`src/sim/`** — the simulation core. Pure TypeScript: no DOM, no Electron. Holds game
  state; `tick()` advances one month; functions apply each lever. Deterministic (seeded
  RNG) → fully unit-testable. The heart of the game.
- **`src/content/`** — data separate from logic: district definitions, the event catalog,
  lever configs, and every tunable constant (the numbers §8 leaves open).
- **`src/ui/`** — rendering: map, HUD, dashboard, feed, detail panel, modals. Reads sim
  state, emits player actions. No simulation logic.
- **`src/game/`** — orchestration: the real-time loop, sim↔UI wiring, save/load.
- **`electron/`** — the Electron main process (window, lifecycle).

The crucial line: **the sim core knows nothing about rendering or Electron** — the whole
simulation runs headless in a test.

**Build the simulation headless first.** Because balance across six interacting levers is
the single biggest risk to the project, the sim core is built and proven *before* any UI:
a headless harness runs many automated games to map the strategy space, confirm no
dominant strategy, and verify the fiscal vise always eventually closes. UI work begins
only once the core is demonstrably sound.

**Save/load:** the sim state is one serializable object → a single autosave slot on disk,
with "Continue" on the menu.

**Testing:** the pure sim core is built test-first with unit tests (Vitest) — tax/income
math, inflation dynamics, bureaucratic growth, meter rules, each lever's effects,
emigration, loss-condition triggers, event weighting. The UI gets light manual + smoke
testing.

---

## 7. Planned expansions  *(designed or noted, out of v1 scope)*

Expansions are fully intended but deliberately excluded from the first playable version,
so the core game can be built and balanced on a stable base first.

### 7.1 Expansion 1 — Legislation and the Overton window

**Legislation.** The player enacts **bills** — laws with euphemistic, Orwellian names
whose stated purpose is a lie about their mechanics. The "Food for Kids Act" raises $1B in
new taxes and routes 1% to actual child nutrition; the remainder flows to the general
fund. The satire is the gap between the marketed name and the real effect; the bill modal
shows the deadpan breakdown plainly — *"Projected revenue: $1.0B. Allocation: 1% child
nutrition, 99% general fund."* — so the player sees the lie being told.

A bill's euphemistic **name softens public reception** — a well-named bill raises less
Unrest than its real effect warrants. But the wider the gap between the name and what the
bill actually does, the higher the **Awareness / exposure risk**: if the public discovers
the "Food for Kids Act" fed no kids, backlash follows — a sharp Awareness + Unrest spike,
reusing the existing exposure mechanic.

Bills are **sticky**: once on the books they keep applying their effect, a ratchet like
the apparatus — easy to pass, costly to undo.

**The Overton window.** Every policy sits on a spectrum from a free society to a total
state. The **Overton window** is the band of that spectrum currently passable — the range
of state action the population will presently accept.

- **Fear widens the window toward the statist end.** Frightened people accept, even
  demand, state expansion; with Fear high enough, UBI (dependency dressed as compassion),
  surveillance, emergency powers, and conscription all become passable.
- **Prosperity and Awareness pull the window back toward freedom.** Comfortable,
  clear-eyed people withhold consent; authoritarian bills become un-passable — visibly
  locked.

**The timing game.** A crisis flings the window open, but Fear decays, so the window
drifts shut again. Each crisis is therefore a scramble: while the window is open, what
does the player ram through before it closes? This makes "never let a crisis go to waste"
a literal mechanic — the player manufactures fear precisely to manufacture consent.

**Auto-repeal.** Any law left sitting outside the current window erodes on its own —
institutional and public pressure quietly unwinds it over time. An idle, prospering
society dismantles the authoritarian apparatus by itself; to keep the state they have
built, the player must keep manufacturing the conditions that justify it. Repeal cost
follows the window: tearing down a law still inside the window (still popular) costs
Unrest; once the window has drifted past a law, repeal is free, or automatic. Prosperity
thus bites twice — it does not merely threaten the Spell Breaks loss, it actively repeals
the player's power.

### 7.2 Further expansions

Noted, not yet designed in detail (rough priority order):

- **Corruption within the apparatus** — the state's own machinery as a self-interested
  actor that skims, misreports, and must be managed. The natural next system after
  Expansion 1.
- **Surveillance** — an information layer feeding the Overton and Awareness systems.
- **The ruler and succession** — a named regime, internal legitimacy, succession crises.
- **Foreign powers as active agents** — rival states that act *on* the player (invasion,
  sanctions) rather than serving only as war targets.
- **Regulatory capture** — selling regulation and licensing cartels: extraction that
  raises Treasury without visible, tax-style Unrest.
- **The Austrian business cycle** — a genuine credit-expansion → malinvestment → boom →
  bust model, deeper than v1's inflation-as-erosion.
- **Multiple historical eras** — additional maps, each a different era with a distinct
  starting state.
- **Population-cohort modeling** (Approach B) — social classes layered over districts,
  each reacting differently to each lever.

---

## 8. Iteration notes

- All meter and lever names are provisional.
- The specification locks the *model* — what affects what, and in which direction — but
  deliberately leaves the *numbers* (rates, thresholds, weights) as tunable constants in
  `src/content/`.
- Balance is found by **headless simulation first** (automated runs across the strategy
  space) and then by playtesting. The core must be shown to have no dominant strategy and
  no safe idle equilibrium before UI work begins.
- This document was revised on 2026-05-22 following a three-agent design audit (MVP
  completeness, ideological fidelity, and a holistic red-team).
