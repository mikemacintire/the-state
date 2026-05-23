import { describe, it, expect } from 'vitest';
import {
  setTaxRate,
  printMoney,
  setPropagandaBudget,
  setEducationLevel,
  doRepression,
  spawnFearOp,
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

  it('increments state.repressionUses and escalates the awareness spike per use', () => {
    const s = createInitialState();
    s.treasury = 10_000;
    const baselineAwareness = s.districts[0].awareness;
    doRepression(s);
    expect(s.repressionUses).toBe(1);
    const firstSpike = s.districts[0].awareness - baselineAwareness;
    // Reset awareness, run again — the second hit should sting harder.
    for (const d of s.districts) d.awareness = baselineAwareness;
    doRepression(s);
    expect(s.repressionUses).toBe(2);
    const secondSpike = s.districts[0].awareness - baselineAwareness;
    expect(secondSpike).toBeGreaterThan(firstSpike);
  });
});

describe('spawnFearOp', () => {
  it('adds fear and deducts the per-unit cost', () => {
    const s = createInitialState();
    s.treasury = 5000;
    spawnFearOp(s, 10);
    // First op with zero fatigue lands at full strength.
    expect(s.fear).toBe(10);
    expect(s.treasury).toBe(5000 - 10 * CONSTANTS.fearOpCostPerUnit);
  });

  it('lands less fear per dollar as fearFatigue accumulates', () => {
    const s = createInitialState();
    s.treasury = 100_000;
    spawnFearOp(s, 20);
    const firstFear = s.fear;
    const firstFatigue = s.fearFatigue;
    expect(firstFatigue).toBeGreaterThan(0);
    spawnFearOp(s, 20);
    const secondDelta = s.fear - firstFear;
    expect(secondDelta).toBeLessThan(firstFear); // second 20-unit op landed less than first
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    s.treasury = 5000;
    const before = s.treasury;
    spawnFearOp(s, 0);
    spawnFearOp(s, -5);
    expect(s.treasury).toBe(before);
    expect(s.fear).toBe(0);
  });

  it('does nothing when the state cannot afford the op', () => {
    const s = createInitialState();
    s.treasury = 100;
    spawnFearOp(s, 100); // would cost 100 * fearOpCostPerUnit, far more than 100
    expect(s.treasury).toBe(100);
    expect(s.fear).toBe(0);
  });

  it('clamps fear to the ceiling', () => {
    const s = createInitialState();
    s.treasury = 1_000_000;
    spawnFearOp(s, 500);
    expect(s.fear).toBe(CONSTANTS.fearCeiling);
  });
});
