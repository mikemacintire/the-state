import { describe, it, expect } from 'vitest';
import { setTaxRate, printMoney } from './levers';
import { createInitialState } from './state';

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
