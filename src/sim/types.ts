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
