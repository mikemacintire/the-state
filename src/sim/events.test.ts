import { describe, it, expect } from 'vitest';
import { pickEvent, fireEvent, processEvents } from './events';
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

describe('fireEvent', () => {
  it('applies the base effects and appends an event-log entry', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'tax-hike',
      kind: 'incident',
      text: 'Quietly raises the wartime surcharge.',
      weight: () => 1,
      effects: (st) => {
        st.treasury += 500;
      },
    };
    s.month = 7;
    const before = s.treasury;
    fireEvent(s, event);
    expect(s.treasury).toBe(before + 500);
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0]).toEqual({ month: 7, eventId: 'tax-hike', text: event.text });
  });

  it('resolves a crisis by calling onCrisis and applying the chosen option', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {}, // no base effects
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 200; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    const onCrisis = () => 1; // pick "Let it run"
    fireEvent(s, event, onCrisis);
    expect(s.treasury).toBe(1000); // 'Suppress' was not chosen
    expect(s.fear).toBe(5);
    expect(s.eventLog[0].chosenOption).toBe('Let it run');
  });

  it('defaults to choice 0 when no onCrisis handler is provided', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 200; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    fireEvent(s, event); // no onCrisis
    expect(s.treasury).toBe(800); // 'Suppress' was chosen
    expect(s.eventLog[0].chosenOption).toBe('Suppress');
  });

  it('queues scheduled follow-up events into pendingEvents', () => {
    const s = createInitialState();
    s.month = 3;
    const event: Event = {
      id: 'false-flag',
      kind: 'incident',
      text: 'Foreign-orchestrated incident in the Port.',
      weight: () => 1,
      effects: () => {},
      schedule: (st) => [{ eventId: 'investigation', fireMonth: st.month + 6 }],
    };
    fireEvent(s, event);
    expect(s.pendingEvents).toEqual([{ eventId: 'investigation', fireMonth: 9 }]);
  });

  it('clamps a too-large choice index to the last option', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: '...',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'A', effects: () => {} },
        { label: 'B', effects: (st) => { st.fear += 1; } },
      ],
    };
    fireEvent(s, event, () => 99);
    expect(s.fear).toBe(1);
    expect(s.eventLog[0].chosenOption).toBe('B');
  });
});

describe('processEvents', () => {
  it('fires every pending event whose fireMonth matches the current month', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [
      {
        id: 'investigation',
        kind: 'incident',
        text: 'A magazine prints awkward questions.',
        weight: () => 0,
        effects: (st) => { st.fear -= 3; },
      },
    ];
    s.pendingEvents.push({ eventId: 'investigation', fireMonth: 5 });
    s.fear = 50;
    processEvents(s, catalog);
    expect(s.fear).toBe(47);
    expect(s.pendingEvents).toEqual([]);
    expect(s.eventLog.some((e) => e.eventId === 'investigation')).toBe(true);
  });

  it('leaves pending events whose fireMonth is in the future', () => {
    const s = createInitialState();
    s.month = 5;
    const catalog: Event[] = [];
    s.pendingEvents.push({ eventId: 'later', fireMonth: 12 });
    processEvents(s, catalog);
    expect(s.pendingEvents).toEqual([{ eventId: 'later', fireMonth: 12 }]);
  });

  it('also fires any pending events whose fireMonth has already passed (catch-up)', () => {
    const s = createInitialState();
    s.month = 9;
    const catalog: Event[] = [
      { id: 'late', kind: 'ambient', text: 'late', weight: () => 0, effects: (st) => { st.fear = 1; } },
    ];
    s.pendingEvents.push({ eventId: 'late', fireMonth: 3 });
    processEvents(s, catalog);
    expect(s.fear).toBe(1);
    expect(s.pendingEvents).toEqual([]);
  });

  it('picks one eligible catalog event each tick when the catalog is non-empty', () => {
    const s = createInitialState();
    s.rng = 12345;
    const catalog: Event[] = [
      { id: 'parade', kind: 'ambient', text: 'parade', weight: () => 1, effects: () => {} },
    ];
    processEvents(s, catalog);
    // exactly one entry from the catalog (no pending events were scheduled)
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0].eventId).toBe('parade');
  });

  it('advances the RNG state when picking from the catalog', () => {
    const s = createInitialState();
    s.rng = 7;
    const catalog: Event[] = [
      { id: 'a', kind: 'ambient', text: 'a', weight: () => 1, effects: () => {} },
    ];
    processEvents(s, catalog);
    expect(s.rng).not.toBe(7);
  });

  it('still advances the RNG state when no eligible event exists', () => {
    const s = createInitialState();
    s.rng = 7;
    const catalog: Event[] = [
      { id: 'a', kind: 'ambient', text: 'a', weight: () => 0, effects: () => {} },
    ];
    processEvents(s, catalog);
    expect(s.rng).not.toBe(7);
    expect(s.eventLog).toEqual([]);
  });

  it('passes the onCrisis handler through to fireEvent', () => {
    const s = createInitialState();
    s.month = 4;
    const catalog: Event[] = [
      {
        id: 'choose',
        kind: 'crisis',
        text: 'pick one',
        weight: () => 1,
        effects: () => {},
        choices: [
          { label: 'A', effects: (st) => { st.fear = 1; } },
          { label: 'B', effects: (st) => { st.fear = 9; } },
        ],
      },
    ];
    processEvents(s, catalog, () => 1);
    expect(s.fear).toBe(9);
  });
});
