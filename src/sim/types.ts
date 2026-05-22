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
