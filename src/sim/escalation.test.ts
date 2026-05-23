import { describe, it, expect } from 'vitest';
import { applyViolentSuppression, injectFearWithFatigue } from './escalation';
import { createInitialState } from './state';

describe('applyViolentSuppression', () => {
  it('tracks per-event-id uses in state.suppressionUses', () => {
    const s = createInitialState();
    applyViolentSuppression(s, 'sp-mutual-aid', 4);
    expect(s.suppressionUses['sp-mutual-aid']).toBe(1);
    applyViolentSuppression(s, 'sp-mutual-aid', 4);
    expect(s.suppressionUses['sp-mutual-aid']).toBe(2);
    applyViolentSuppression(s, 'sp-private-school', 6);
    expect(s.suppressionUses['sp-private-school']).toBe(1);
  });

  it('escalates the awareness spike on repeated use of the same eventId', () => {
    const s = createInitialState();
    const base = s.districts[0].awareness;
    applyViolentSuppression(s, 'x', 4);
    const firstSpike = s.districts[0].awareness - base;
    for (const d of s.districts) d.awareness = base;
    applyViolentSuppression(s, 'x', 4);
    const secondSpike = s.districts[0].awareness - base;
    expect(secondSpike).toBeGreaterThan(firstSpike);
  });

  it('escalations are per-eventId — banning A does not raise B-bans', () => {
    const s = createInitialState();
    const base = s.districts[0].awareness;
    // Pile up uses on event A
    for (let i = 0; i < 5; i++) {
      for (const d of s.districts) d.awareness = base;
      applyViolentSuppression(s, 'A', 4);
    }
    // First use on event B should be the base spike
    for (const d of s.districts) d.awareness = base;
    applyViolentSuppression(s, 'B', 4);
    const bSpike = s.districts[0].awareness - base;
    expect(bSpike).toBeCloseTo(4); // unscaled
  });

  it('clamps awareness to the ceiling', () => {
    const s = createInitialState();
    for (const d of s.districts) d.awareness = 95;
    applyViolentSuppression(s, 'x', 50);
    for (const d of s.districts) expect(d.awareness).toBeLessThanOrEqual(100);
  });
});

describe('injectFearWithFatigue', () => {
  it('with zero fatigue, raw fear lands fully', () => {
    const s = createInitialState();
    injectFearWithFatigue(s, 10);
    expect(s.fear).toBe(10);
  });

  it('raises fearFatigue after each injection', () => {
    const s = createInitialState();
    injectFearWithFatigue(s, 20);
    expect(s.fearFatigue).toBeGreaterThan(0);
  });

  it('lands less fear per call as fatigue accumulates', () => {
    const s = createInitialState();
    injectFearWithFatigue(s, 20);
    const first = s.fear;
    injectFearWithFatigue(s, 20);
    const second = s.fear - first;
    expect(second).toBeLessThan(first);
  });

  it('clamps fear to the ceiling', () => {
    const s = createInitialState();
    s.fear = 99;
    injectFearWithFatigue(s, 100);
    expect(s.fear).toBeLessThanOrEqual(100);
  });

  it('ignores non-positive amounts', () => {
    const s = createInitialState();
    injectFearWithFatigue(s, 0);
    injectFearWithFatigue(s, -5);
    expect(s.fear).toBe(0);
    expect(s.fearFatigue).toBe(0);
  });
});
