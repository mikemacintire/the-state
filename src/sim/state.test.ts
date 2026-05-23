import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';
import { INITIAL_DISTRICTS } from '../content/districts';

describe('createInitialState', () => {
  it('starts at month 0, not yet lost, with the starting treasury', () => {
    const s = createInitialState();
    expect(s.month).toBe(0);
    expect(s.lossCause).toBeNull();
    expect(s.treasury).toBe(CONSTANTS.startingTreasury);
    expect(s.taxRate).toBe(CONSTANTS.startingTaxRate);
    expect(s.apparatusUpkeep).toBe(CONSTANTS.initialUpkeep);
  });

  it('copies the nine districts so the simulation never mutates content data', () => {
    const s = createInitialState();
    expect(s.districts).toHaveLength(9);
    s.districts[0].wealth = 0;
    expect(INITIAL_DISTRICTS[0].wealth).not.toBe(0);
  });

  it('is deterministic for a given seed', () => {
    expect(createInitialState(7)).toEqual(createInitialState(7));
  });

  it('initialises Plan 2 national fields to neutral starting values', () => {
    const s = createInitialState();
    expect(s.fear).toBe(0);
    expect(s.nationalUnrest).toBe(0);
    expect(s.nationalProsperity).toBe(0);
    expect(s.propagandaBudget).toBe(0);
    expect(s.educationLevel).toBe(0);
  });

  it('gives every district initial happiness, awareness, and unrest in valid range', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThanOrEqual(0);
      expect(d.happiness).toBeLessThanOrEqual(100);
      expect(d.awareness).toBeGreaterThanOrEqual(0);
      expect(d.awareness).toBeLessThanOrEqual(100);
      expect(d.unrest).toBeGreaterThanOrEqual(0);
      expect(d.unrest).toBeLessThanOrEqual(100);
    }
  });

  it('initialises Plan 3 event tracking arrays to empty', () => {
    const s = createInitialState();
    expect(s.eventLog).toEqual([]);
    expect(s.pendingEvents).toEqual([]);
  });
});
