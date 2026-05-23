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
