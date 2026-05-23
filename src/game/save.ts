import type { GameState } from '../sim/types';

const KEY = 'the-state:save';

/** Persist the entire game state into localStorage (single-slot autosave). */
export function saveState(state: GameState): void {
  localStorage.setItem(KEY, JSON.stringify(state));
}

/**
 * Backfill defaults for fields that may be missing on a save from an earlier
 * schema. Without this, a save written before Phase 1D loads with undefined
 * `suppressionUses`/`fearFatigue`/etc., and the next tick crashes when the
 * escalation helpers index into them. This is forgiving by design — losing a
 * good run to a schema bump would be cruel.
 */
function fillDefaults(loaded: GameState): GameState {
  return {
    ...loaded,
    fearFatigue: loaded.fearFatigue ?? 0,
    repressionUses: loaded.repressionUses ?? 0,
    falseFlagsUsed: loaded.falseFlagsUsed ?? 0,
    suppressionUses: loaded.suppressionUses ?? {},
    bankruptSince: loaded.bankruptSince ?? null,
  };
}

/** Load the saved state, or null if none / corrupt. */
export function loadState(): GameState | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return fillDefaults(JSON.parse(raw) as GameState);
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
