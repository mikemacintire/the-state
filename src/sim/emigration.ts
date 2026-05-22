import type { GameState } from './types';
import { CONSTANTS } from '../content/constants';

/**
 * Voting with their feet (design doc §3.9). A district whose awareness exceeds
 * a threshold AND whose happiness sits below a threshold loses population each
 * month — citizens emigrate, taking their taxable wealth with them. The most
 * productive citizens leave first; this plan models only the aggregate loss,
 * not which kind of citizen left.
 */
export function emigrationPressure(awareness: number, happiness: number): number {
  const aware = Math.max(0, awareness - CONSTANTS.emigrationAwarenessThreshold);
  const miserable = Math.max(0, CONSTANTS.emigrationHappinessThreshold - happiness);
  return (aware / 100) * (miserable / 100);
}

/** Advance every district's population by one month of emigration. */
export function updateEmigration(state: GameState): void {
  for (const d of state.districts) {
    const pressure = emigrationPressure(d.awareness, d.happiness);
    if (pressure <= 0) continue;
    const loss = d.population * CONSTANTS.emigrationRate * pressure;
    d.population = Math.max(0, Math.floor(d.population - loss));
  }
}
