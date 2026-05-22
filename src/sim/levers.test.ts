import { describe, it, expect } from 'vitest';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
} from './levers';
import { createInitialState } from './state';
import { CONSTANTS } from '../content/constants';

describe('setTaxRate', () => {
  it('sets a rate that is within range', () => {
    const s = createInitialState();
    setTaxRate(s, 0.45);
    expect(s.taxRate).toBe(0.45);
  });

  it('clamps rates outside 0..1', () => {
    const s = createInitialState();
    setTaxRate(s, 1.8);
    expect(s.taxRate).toBe(1);
    setTaxRate(s, -0.5);
    expect(s.taxRate).toBe(0);
  });
});

describe('printMoney', () => {
  it('adds cash to the treasury and to lifetime extraction', () => {
    const s = createInitialState();
    const before = s.treasury;
    printMoney(s, 2000);
    expect(s.treasury).toBe(before + 2000);
    expect(s.lifetimeExtraction).toBe(2000);
  });

  it('raises inflation pressure — the hidden cost', () => {
    const s = createInitialState();
    printMoney(s, 5000);
    expect(s.inflationPressure).toBeGreaterThan(0);
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    const before = s.treasury;
    printMoney(s, -100);
    printMoney(s, 0);
    expect(s.treasury).toBe(before);
  });
});

describe('setPropagandaBudget', () => {
  it('sets a non-negative monthly budget', () => {
    const s = createInitialState();
    setPropagandaBudget(s, 1500);
    expect(s.propagandaBudget).toBe(1500);
  });

  it('clamps negative inputs to zero', () => {
    const s = createInitialState();
    setPropagandaBudget(s, -50);
    expect(s.propagandaBudget).toBe(0);
  });
});

describe('setEducationLevel', () => {
  it('sets a level within 0..1', () => {
    const s = createInitialState();
    setEducationLevel(s, 0.6);
    expect(s.educationLevel).toBe(0.6);
  });

  it('clamps inputs outside 0..1', () => {
    const s = createInitialState();
    setEducationLevel(s, 2);
    expect(s.educationLevel).toBe(1);
    setEducationLevel(s, -0.3);
    expect(s.educationLevel).toBe(0);
  });
});

describe('doRepression', () => {
  it('deducts the action cost from the treasury', () => {
    const s = createInitialState();
    s.treasury = 5000;
    doRepression(s);
    expect(s.treasury).toBe(5000 - CONSTANTS.repressionCost);
  });

  it('cuts unrest across every district', () => {
    const s = createInitialState();
    s.treasury = 5000;
    for (const d of s.districts) d.unrest = 60;
    doRepression(s);
    for (const d of s.districts) {
      expect(d.unrest).toBeLessThan(60);
    }
  });

  it('spikes awareness across every district', () => {
    const s = createInitialState();
    s.treasury = 5000;
    const before = s.districts.map((d) => d.awareness);
    doRepression(s);
    for (let i = 0; i < s.districts.length; i++) {
      expect(s.districts[i].awareness).toBeGreaterThan(before[i]);
    }
  });

  it('does nothing when the state cannot afford it', () => {
    const s = createInitialState();
    s.treasury = CONSTANTS.repressionCost - 1;
    const treasuryBefore = s.treasury;
    const unrestBefore = s.districts[0].unrest;
    doRepression(s);
    expect(s.treasury).toBe(treasuryBefore);
    expect(s.districts[0].unrest).toBe(unrestBefore);
  });
});
