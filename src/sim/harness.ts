import type { GameState, RunResult } from './types';
import { createInitialState } from './state';
import { tick } from './tick';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
} from './levers';

/**
 * A Strategy is an automated "player": each month it inspects the state and
 * returns the decisions to apply before the tick. This is how balance is
 * explored without a UI (design doc §6.4). Plan 2 widens the decision type to
 * cover all six levers.
 */
export interface Strategy {
  (state: GameState): {
    taxRate?: number;
    print?: number;
    propagandaBudget?: number;
    educationLevel?: number;
    repression?: boolean;
    fearOp?: number;
  };
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
    if (decision.propagandaBudget !== undefined) setPropagandaBudget(state, decision.propagandaBudget);
    if (decision.educationLevel !== undefined) setEducationLevel(state, decision.educationLevel);
    if (decision.repression) doRepression(state);
    if (decision.fearOp !== undefined && decision.fearOp > 0) spawnFearOp(state, decision.fearOp);
    tick(state);
  }
  return {
    monthsSurvived: state.month,
    lifetimeExtraction: state.lifetimeExtraction,
    lossCause: state.lossCause,
  };
}
