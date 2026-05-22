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
