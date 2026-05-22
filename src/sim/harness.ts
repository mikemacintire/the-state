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
