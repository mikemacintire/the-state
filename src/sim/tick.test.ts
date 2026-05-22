import { describe, it, expect } from 'vitest';
import { tick } from './tick';
import { createInitialState } from './state';

describe('tick', () => {
  it('advances the calendar by one month', () => {
    const s = createInitialState();
    tick(s);
    expect(s.month).toBe(1);
  });

  it('runs the economy — district wealth moves', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.districts[0].wealth;
    tick(s);
    expect(s.districts[0].wealth).not.toBe(before);
  });

  it('settles the treasury — upkeep is paid', () => {
    const s = createInitialState();
    s.taxRate = 0;
    const before = s.treasury;
    tick(s);
    expect(s.treasury).toBeLessThan(before);
  });

  it('grows the bureaucracy each tick', () => {
    const s = createInitialState();
    const before = s.apparatusUpkeep;
    tick(s);
    expect(s.apparatusUpkeep).toBeGreaterThan(before);
  });

  it('does not advance a run that is already over', () => {
    const s = createInitialState();
    s.lossCause = 'bankruptcy';
    tick(s);
    expect(s.month).toBe(0);
  });
});
