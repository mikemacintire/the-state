import { describe, it, expect, beforeEach } from 'vitest';
import { saveState, loadState, hasSave, clearSave } from './save';
import { createInitialState } from '../sim/state';

describe('save / load', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round-trips an initial state', () => {
    const original = createInitialState(7);
    saveState(original);
    const loaded = loadState();
    expect(loaded).toEqual(original);
  });

  it('hasSave reflects whether a save exists', () => {
    expect(hasSave()).toBe(false);
    saveState(createInitialState());
    expect(hasSave()).toBe(true);
  });

  it('clearSave removes the save', () => {
    saveState(createInitialState());
    clearSave();
    expect(hasSave()).toBe(false);
    expect(loadState()).toBeNull();
  });

  it('loadState returns null when no save exists', () => {
    expect(loadState()).toBeNull();
  });

  it('returns null when the save is corrupt', () => {
    localStorage.setItem('the-state:save', 'not-json');
    expect(loadState()).toBeNull();
  });

  it('fills defaults for missing fields on an older-schema save', () => {
    // Simulate a save written before Phase 1D — no fearFatigue,
    // repressionUses, falseFlagsUsed, or suppressionUses.
    const oldSave = {
      month: 5, rng: 1, treasury: 1000, lifetimeExtraction: 0,
      inflation: 0, inflationPressure: 0, taxRate: 0.2,
      apparatusUpkeep: 450, propagandaBudget: 0, educationLevel: 0,
      fear: 0, nationalUnrest: 0, nationalProsperity: 0,
      eventLog: [], pendingEvents: [], pendingCrises: [],
      districts: [], lossCause: null,
    };
    localStorage.setItem('the-state:save', JSON.stringify(oldSave));
    const loaded = loadState();
    expect(loaded?.fearFatigue).toBe(0);
    expect(loaded?.repressionUses).toBe(0);
    expect(loaded?.falseFlagsUsed).toBe(0);
    expect(loaded?.suppressionUses).toEqual({});
  });
});
