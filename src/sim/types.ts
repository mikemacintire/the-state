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
  /**
   * District id that this event surfaces on. The map UI uses this to place a
   * callout (and, for choice events, to float the modal near the source).
   * Static anchors (e.g., "capital") encode the event's narrative location;
   * dynamic anchors pick the district where the condition lives now (e.g.,
   * poorest, lowest-happiness, worst-unrest). Optional on the type so test
   * fixtures stay terse; the catalog test in event-catalog.test.ts asserts
   * every shipped catalog entry actually defines one.
   */
  anchor?: (state: GameState) => string;
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
  /**
   * Diminishing-returns counter for fear ops. Each `spawnFearOp` (and the
   * fear-injecting event choices) raise fatigue; with fatigue f, injecting N
   * raw fear points actually adds `N / (1 + f)`. Decays slowly via
   * `updateFear`. Design doc §3.5 fatigue catch.
   */
  fearFatigue: number;
  nationalUnrest: number;
  nationalProsperity: number;
  eventLog: EventLogEntry[];
  pendingEvents: PendingEvent[];
  pendingCrises: PendingCrisis[];
  districts: District[];
  /**
   * Lifetime count of `doRepression` calls. Each call escalates the awareness
   * spike: spike = base × (1 + uses × `repressionEscalationPerUse`). The mask
   * slips harder every time (design doc §4.5).
   */
  repressionUses: number;
  /**
   * Lifetime count of "Authorise" picks on cri-false-flag. Drives both the
   * picker weight of cri-leaked-files (more flags → higher leak chance) and
   * future operation costs. Design doc §4.6 exposure-risk-scales-with-overuse.
   */
  falseFlagsUsed: number;
  /**
   * Per-event-id count of "crush / ban / shut down" picks. Each pick of the
   * same violent option escalates that event's awareness spike via
   * `applyViolentSuppression` in `escalation.ts`. Design doc §3.8.
   */
  suppressionUses: Record<string, number>;
  /**
   * Month at which the treasury first went non-positive, or null if the
   * state is solvent. Once set, the §3.6 cascade engages: propaganda and
   * education become ineffective, and the run ends in `bankruptcy` once
   * unrest crosses revoltThreshold OR `bankruptcyGraceMonths` elapse.
   */
  bankruptSince: number | null;
  lossCause: LossCause | null;
}

export interface RunResult {
  monthsSurvived: number;
  lifetimeExtraction: number;
  lossCause: LossCause | null;
}
