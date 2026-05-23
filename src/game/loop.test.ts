import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Loop } from './loop';
import { createInitialState } from '../sim/state';

describe('Loop', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not tick while paused (speed=0)', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(0);
    loop.start();
    vi.advanceTimersByTime(5000);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('ticks every period when running at speed 1', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 3 + 1);
    expect(s.month).toBe(3);
    loop.stop();
  });

  it('ticks faster at higher speeds', () => {
    const s = createInitialState();
    const loop = new Loop(s, () => {});
    loop.setSpeed(3);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 3 + 1);
    expect(s.month).toBeGreaterThan(3); // 3× speed in the same real-time window
    loop.stop();
  });

  it('stops ticking when pendingCrises has an entry', () => {
    const s = createInitialState();
    s.pendingCrises.push({ eventId: 'x', text: '...', choices: [{ label: 'A', effects: () => {} }] });
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 5 + 1);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('stops ticking when lossCause is set', () => {
    const s = createInitialState();
    s.lossCause = 'revolt';
    const loop = new Loop(s, () => {});
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 5 + 1);
    expect(s.month).toBe(0);
    loop.stop();
  });

  it('calls the onTick callback after each tick', () => {
    const s = createInitialState();
    let calls = 0;
    const loop = new Loop(s, () => { calls++; });
    loop.setSpeed(1);
    loop.start();
    vi.advanceTimersByTime(loop.periodFor(1) * 2 + 1);
    expect(calls).toBe(2);
    loop.stop();
  });
});
