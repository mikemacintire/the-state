import { describe, it, expect } from 'vitest';
import { tick } from './tick';
import { createInitialState } from './state';
import { EVENT_CATALOG } from '../content/event-catalog';

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

  it('drifts district happiness toward its equilibrium each tick', () => {
    const s = createInitialState();
    s.taxRate = 0;
    for (const d of s.districts) {
      d.wealth = 80;
      d.happiness = 30;
    }
    tick(s);
    for (const d of s.districts) {
      expect(d.happiness).toBeGreaterThan(30);
    }
  });

  it('decays national fear each tick', () => {
    const s = createInitialState();
    s.fear = 50;
    // Pass an empty catalog so an event firing (some incidents inject fear)
    // cannot mask the pure-decay assertion.
    tick(s, undefined, []);
    expect(s.fear).toBeLessThan(50);
  });

  it('computes national aggregates each tick', () => {
    const s = createInitialState();
    for (const d of s.districts) d.unrest = 30;
    tick(s);
    expect(s.nationalUnrest).toBeGreaterThan(0);
  });

  it('runs the emigration step (a deliberately-neglected district shrinks)', () => {
    const s = createInitialState();
    s.taxRate = 0;
    s.districts[0].awareness = 95;
    s.districts[0].happiness = 5;
    s.districts[0].population = 100_000;
    tick(s);
    expect(s.districts[0].population).toBeLessThan(100_000);
  });

  it('processes events in step 6 (eventLog grows when an event fires)', () => {
    const s = createInitialState();
    // ensure at least one event is eligible (the always-on park-opens event)
    const before = s.eventLog.length;
    tick(s);
    expect(s.eventLog.length).toBeGreaterThan(before);
  });

  it('advances the RNG via the events step even when no event fires effects', () => {
    const s = createInitialState();
    const beforeRng = s.rng;
    tick(s);
    expect(s.rng).not.toBe(beforeRng);
  });

  it('forwards an onCrisis handler to processEvents', () => {
    // Narrow the catalog to the one crisis we care about, so the handler is
    // only invoked for it and no other event muddies the assertion.
    const s = createInitialState();
    s.month = 0;
    s.pendingEvents.push({ eventId: 'cri-inflation-anger', fireMonth: 0 });
    s.inflation = 25;
    const narrow = [EVENT_CATALOG.find((e) => e.id === 'cri-inflation-anger')!];
    let chosen = -1;
    tick(
      s,
      (_st, ev) => {
        chosen = ev.id === 'cri-inflation-anger' ? 2 : 0;
        return chosen;
      },
      narrow,
    );
    expect(chosen).toBe(2);
  });
});
