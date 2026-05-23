import { describe, it, expect } from 'vitest';
import { pickEvent } from './events';
import { createInitialState } from './state';
import type { Event } from './types';

function noopEffects(): void {}

function evt(id: string, weight: number): Event {
  return {
    id,
    kind: 'ambient',
    text: id,
    weight: () => weight,
    effects: noopEffects,
  };
}

describe('pickEvent', () => {
  it('returns null when the catalog is empty', () => {
    const s = createInitialState();
    const r = pickEvent(s, []);
    expect(r.event).toBeNull();
  });

  it('returns null when every catalog entry weighs zero', () => {
    const s = createInitialState();
    const r = pickEvent(s, [evt('a', 0), evt('b', 0)]);
    expect(r.event).toBeNull();
  });

  it('returns the only eligible event when one exists', () => {
    const s = createInitialState();
    const r = pickEvent(s, [evt('cold', 0), evt('hot', 5), evt('frozen', 0)]);
    expect(r.event?.id).toBe('hot');
  });

  it('advances the RNG state', () => {
    const s = createInitialState();
    const before = s.rng;
    const r = pickEvent(s, [evt('a', 1)]);
    expect(r.rngState).not.toBe(before);
  });

  it('is deterministic for the same RNG state and catalog', () => {
    const s1 = createInitialState(99);
    const s2 = createInitialState(99);
    const cat = [evt('a', 1), evt('b', 1), evt('c', 1)];
    const r1 = pickEvent(s1, cat);
    const r2 = pickEvent(s2, cat);
    expect(r1.event?.id).toBe(r2.event?.id);
    expect(r1.rngState).toBe(r2.rngState);
  });

  it('draws weighted — a heavily-weighted event dominates over many trials', () => {
    const cat = [evt('rare', 1), evt('common', 99)];
    let rng = 1;
    let commonCount = 0;
    for (let i = 0; i < 200; i++) {
      const s = createInitialState();
      s.rng = rng;
      const r = pickEvent(s, cat);
      if (r.event?.id === 'common') commonCount++;
      rng = r.rngState;
    }
    expect(commonCount).toBeGreaterThan(150); // ~99% of 200
  });
});
