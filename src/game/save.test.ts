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
});
