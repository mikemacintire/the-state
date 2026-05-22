# The State — Game Design Document

**Status:** In progress — core model and levers locked; game loop/events and UI/tech pending.
**Date:** 2026-05-22
**Type:** Design specification

---

## 1. Concept

*The State* is a satirical real-time management game — an inverted city-builder. The
player **is** the state, governing a population across a map of districts. Unlike a
city-builder, where a thriving city is success, here **a thriving population is a loss
condition**: a prosperous, unafraid people stop believing the state's narrative and the
state becomes irrelevant. The player's task is to keep the population miserable but
compliant — extracting wealth, manufacturing fear, and suppressing dissent — for as long
as possible.

The game is built from an Austrian-economics / anarcho-capitalist perspective. Its thesis
emerges through mechanics rather than lectures: the state produces nothing and survives
only by extraction and coercion; its incentives are fundamentally misaligned with the
people's flourishing.

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
| Game loop | Real-time, pausable |
| v1 scope | Full single era: core loop + 4 control levers, one map |
| Win condition | Endless — survive and score (no victory screen) |
| Simulation model | Approach A: aggregate district simulation (~9 districts) |

**v1 control levers:** money printing / inflation, propaganda, education monopoly,
false flags & wars.

**Score:** years survived + Lifetime Extraction (total wealth ever looted).

**Explicitly deferred to later versions:** multiple historical-era maps;
population-cohort / social-class modeling (Approach B).

---

## 3. The core simulation model  *(LOCKED)*

### 3.1 Districts

The map is one country of **9 districts**, each with a distinct character (e.g., a wealthy
Capital, an Industrial Belt, poor Outer Wards, a Port, farmland). Districts start with
different wealth and population so the map has texture and each district is a different
problem.

### 3.2 Per-district meters

Each district carries four meters (0–100):

- **Wealth** — economic prosperity. Grows in a free economy; shrinks under heavy tax,
  inflation, and war.
- **Happiness** — quality of life. Driven by wealth; crushed by inflation and war.
- **Awareness** — *the political awakening.* How clearly citizens see the state itself as
  the source of their misery. Rises with prosperity, education, inflation, exposed lies,
  and heavy-handed repression. Falls under an education monopoly and sustained propaganda.
  Drives unrest conversion and false-flag exposure risk.
- **Unrest** — active anger at the regime. Rises when people are miserable *and* aware.
  Suppressed by propaganda and external scapegoats.

### 3.3 National values

- **Treasury** — the state's money on hand. A survival resource, constantly spent and
  refilled. Not a loss meter.
- **Lifetime Extraction** — running total of all wealth ever extracted. The player's score.
- **Inflation** — driven up by money printing. Erodes wealth and happiness, raises
  awareness, and devalues the Treasury itself.
- **Perceived Threat (Fear)** — how dangerous the population believes the world is. The
  keystone meter (see 3.5).
- **Apparatus Upkeep** — the recurring cost of the state's own machinery (enforcers,
  officials, bureaucracy). Grows with every piece of control the player builds.

### 3.4 The two loss meters

The player must keep **both** below their thresholds, forever:

- **Unrest → Revolt.** Population-weighted aggregate of district unrest. At the threshold,
  the people violently overthrow the state. Game over.
- **Prosperity → "The Spell Breaks."** National aggregate of Wealth and Happiness. Rising
  Prosperity erodes the effectiveness of the Propaganda and Fear levers. At the threshold,
  narrative control fails completely — people stop believing, stop fearing, and quietly
  drift out of the state's grip. The state is not overthrown; it is tuned out. Game over.

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
- **Cost** — false flags, wars, and fear campaigns all spend Treasury.
- **Real harm ≠ perceived harm** — the player wants scary headlines with managed reality.
  Real war damage or real unchecked crime craters Happiness, and the people may conclude
  the state is failing its one job → Unrest.
- **Exposure** — false flags can be uncovered (chance rises with Awareness), causing a
  catastrophic Awareness + Unrest spike.
- **Fatigue** — repeated scares lose potency; fresher, bigger threats are needed over time.

### 3.6 The fiscal vise — money as the second pillar

The state produces nothing. Every coin is extracted — taxed from the productive economy or
printed (quiet theft via inflation). There is no other income.

- **Everything costs money, forever** — every lever is a recurring drain, plus Apparatus
  Upkeep, which grows with the size of the control apparatus. The apparatus is a ratchet:
  easy to grow, painful to cut (cutting means losing grip).
- **The vise** — costs only climb; income comes from an economy the player is deliberately
  strangling to hold Prosperity down. The jaws close. (The historical pattern — e.g., the
  USSR collapsed not with a bang but a budget.)
- **Two bad ways to raise cash** — Tax (shrinks the economy, raises Unrest) or Print
  (instant, but inflation devalues all money including the Treasury, forcing more
  printing — the inflationary spiral).
- **Bankruptcy = cascade** — Treasury at zero means propaganda and enforcers go unpaid →
  Unrest surges → Revolt. Bankruptcy doesn't end the state directly; it pries the player's
  hands off the controls. The defeat screen names the true cause.

### 3.7 The strategic core — the squeeze

To hold **Prosperity** down, keep people poor (tax, inflation, war, neglect). But poverty
breeds **Unrest** → revolt. Making people happy loses the other way. The player survives
only by using the control levers to **suppress unrest without granting prosperity** —
keeping the population miserable but compliant.

**Awareness** governs how hard this is: low awareness means misery doesn't convert to
unrest and propaganda is cheap and effective; high awareness means misery converts fast
and propaganda fails.

**Propaganda is squeezed from both ends:** a too-aware population sees through it
(political awakening); a too-prosperous population ignores it (lived reality contradicts
it). Propaganda works best on an ignorant, struggling population — precisely the
population the state is incentivized to cultivate.

### 3.8 Self-Provision events

Periodically, voluntary solutions emerge that make people genuinely safer or more
self-sufficient without the state — private security, mutual aid, private arbitration,
sound money, independent schooling, charity outperforming state welfare. Left alone, each
drains Perceived Threat and/or raises Prosperity, pushing the player toward loss. The
player must respond — ban, tax, discredit, co-opt, or raid — each costing money and
risking Awareness.

This dramatizes the game's central thought experiment: the state will oppose even
something that helps everyone, *because* it threatens the state. Each event's strength
varies; weak ones are cheap to ignore, strong ones force an ugly, expensive choice.
(Full events system: §5.)

---

## 4. The levers  *(LOCKED)*

Five levers. The first two raise money; the last three spend it to keep control. Each
carries a catch — every tool the state owns also bites the hand that holds it. The model
below is fixed in direction; the numbers (costs, rates, thresholds) are tunable (see §7).

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
  - There is no safe setting, only tradeoffs. This dial is the engine of the fiscal vise.

### 4.2 Money printing — the emergency tap

- **Control:** a "print" action — choose an amount; Treasury rises instantly.
- **Effect:** immediate cash.
- **Catches:**
  - Raises Inflation, which has momentum — it keeps climbing after printing and is slow to
    bring down (a delayed, boom-bust crisis).
  - Inflation erodes Wealth and Happiness across all districts.
  - Inflation raises Awareness — people notice their money vanishing.
  - Inflation devalues the Treasury itself and future tax revenue, forcing still more
    printing: the inflationary spiral.
  - Perverse upside: by keeping people poorer, inflation eases the Prosperity side — a
    deliberately tempting trap.

### 4.3 Propaganda — the rented lid

- **Control:** a spending slider (Treasury per tick).
- **Effect:** directly suppresses Unrest and slows Awareness growth; more spend = more
  suppression, with diminishing returns.
- **Catches:**
  - A continuous drain — stop paying and Unrest snaps back. It is a lid rented, never owned.
  - Effectiveness decays as Awareness rises (people see through it) and as Prosperity rises
    (comfortable people tune it out).
  - It works cheaply and powerfully only on an ignorant, struggling population.

### 4.4 Education monopoly — the long game

- **Control:** a level the player invests to raise (free/private schooling → total state
  monopoly).
- **Effect:** slows, and eventually reverses, Awareness growth — structural, generational
  control of the population's mind.
- **Catches:**
  - Costly to build, and adds permanent Apparatus Upkeep (part of the fiscal ratchet).
  - Slow-acting — it shapes the next generation, not today's crisis.
  - An indoctrinated, incurious population is less productive, so a high monopoly suppresses
    Wealth growth — trading a smaller tax base for a more docile one.

### 4.5 False flags & wars — the fear engine

- **Control:** an Operations panel — stage a **false flag** (moderate cost, instant Fear
  spike, contained harm) or start a **war** (heavy ongoing cost, large sustained Fear, plus
  an "emergency powers" window where control is cheaper and taxation bites less).
- **Effect:** manufactures Perceived Threat (Fear) — the keystone that suppresses Unrest,
  Awareness, and Prosperity at once.
- **Catches:**
  - The rally fades as Fear decays — a war that drags on inverts into "why are we still
    poor?", causing an Unrest rebound.
  - False flags can be exposed (chance scales with Awareness and with overuse) →
    catastrophic Awareness + Unrest spike.
  - Wars do real harm — too much, and the people decide the state failed its one job →
    Unrest.
  - Fatigue: repeated scares lose potency; each lands softer than the last.

### 4.6 How the levers interlock

Education monopoly (slow) holds Awareness down → which makes Propaganda cheap and effective
and false flags safe to run. Fear makes everything cheaper. Money printing buys time but
raises Awareness, eroding all of the above. The skill of the game is sequencing: invest in
the slow foundations before they are needed, and never let the fast, cheap fixes outrun
Awareness.

---

## 5. Game loop, events, and score  *(pending — to be designed)*

Will cover: the real-time tick structure and speed/pause controls; the events system
(random events, crises, player-choice modals, and the Self-Provision events from §3.8);
scoring and the defeat screen.

---

## 6. UI and technical architecture  *(pending — to be designed)*

Will cover: screen layout (district map, policy dashboard, HUD, events feed); the
grounded-dark-satire visual style; tech stack, module structure, and testing approach.

---

## 7. Iteration notes

- All meter names are provisional.
- The specification will lock the *model* — what affects what, and in which direction —
  but deliberately leaves the *numbers* (rates, thresholds, weights) as tunable constants.
  Balance is found by playtesting.
