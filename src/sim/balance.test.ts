import { describe, it, expect } from 'vitest';
import { runHeadless } from './harness';

describe('fiscal vise — structural balance', () => {
  it('a state that never taxes goes bankrupt quickly', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0 }), maxMonths: 600 });
    expect(r.lossCause).toBe('bankruptcy');
    expect(r.monthsSurvived).toBeLessThan(60);
  });

  it('a steady, moderate tax cannot outrun the bureaucracy forever — the vise always closes', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 2400 });
    expect(r.lossCause).toBe('bankruptcy');
  });

  it('a moderate tax still buys many years of rule before the vise closes', () => {
    const r = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 2400 });
    expect(r.monthsSurvived).toBeGreaterThan(60); // more than five years
  });

  it('printing money is a real, recorded extraction', () => {
    const taxed = runHeadless({ strategy: () => ({ taxRate: 0.3 }), maxMonths: 60 });
    const printed = runHeadless({
      strategy: () => ({ taxRate: 0.3, print: 500 }),
      maxMonths: 60,
    });
    expect(printed.lifetimeExtraction).toBeGreaterThan(taxed.lifetimeExtraction);
  });
});
