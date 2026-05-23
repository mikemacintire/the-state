import type { GameState } from '../sim/types';

const KEY = 'the-state:save';

/** Persist the entire game state into localStorage (single-slot autosave). */
export function saveState(state: GameState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/** Load the saved state, or null if none / corrupt. */
export function loadState(): GameState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return localStorage.getItem(KEY) !== null;
}

export function clearSave(): void {
  localStorage.removeItem(KEY);
}
