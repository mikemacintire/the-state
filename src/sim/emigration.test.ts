import { describe, it, expect } from 'vitest';
import { emigrationPressure, updateEmigration } from './emigration';
import { createInitialState } from './state';

describe('emigrationPressure', () => {
  it('is zero in a contented, oblivious district', () => {
    expect(emigrationPressure(10, 80)).toBe(0);
  });

  it('is zero in a contented but awakened district', () => {
    expect(emigrationPressure(90, 80)).toBe(0);
  });

  it('is zero in a miserable but oblivious district', () => {
    expect(emigrationPressure(10, 10)).toBe(0);
  });

  it('is positive in a miserable, awakened district', () => {
    expect(emigrationPressure(90, 10)).toBeGreaterThan(0);
  });
});

describe('updateEmigration', () => {
  it('reduces population in a miserable, awakened district', () => {
    const s = createInitialState();
    s.districts[0].awareness = 90;
    s.districts[0].happiness = 10;
    s.districts[0].population = 10_000;
    updateEmigration(s);
    expect(s.districts[0].population).toBeLessThan(10_000);
  });

  it('leaves a contented district alone', () => {
    const s = createInitialState();
    s.districts[0].awareness = 20;
    s.districts[0].happiness = 80;
    const before = s.districts[0].population;
    updateEmigration(s);
    expect(s.districts[0].population).toBe(before);
  });

  it('never lets population go below zero', () => {
    const s = createInitialState();
    s.districts[0].awareness = 100;
    s.districts[0].happiness = 0;
    s.districts[0].population = 1;
    for (let i = 0; i < 1000; i++) updateEmigration(s);
    expect(s.districts[0].population).toBeGreaterThanOrEqual(0);
  });
});
