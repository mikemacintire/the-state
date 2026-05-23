import { describe, it, expect } from 'vitest';
import {
  pickEvent,
  fireEvent,
  processEvents,
  resolveCrisis,
  COOLDOWN_MONTHS,
  GLOBAL_KIND_COOLDOWN_MONTHS,
  MODAL_FIRE_PROBABILITY,
} from './events';
import { createInitialState } from './state';
import { EVENT_CATALOG } from '../content/event-catalog';
import type { Event, EventKind } from './types';

function noopEffects(): void {}

function evt(id: string, weight: number, kind: EventKind = 'ambient'): Event {
  return {
    id,
    kind,
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

  describe('anti-repeat cooldown', () => {
    it('excludes an event from the pool if it fired within its kind cooldown', () => {
      const s = createInitialState();
      s.month = 3;
      s.eventLog.push({ month: 1, eventId: 'park', text: 'park' });
      // park is ambient → 6-month cooldown; only 2 months have passed
      const cat = [evt('park', 10, 'ambient'), evt('other', 1, 'ambient')];
      const r = pickEvent(s, cat);
      expect(r.event?.id).toBe('other');
    });

    it('lets the event return to the pool once its cooldown expires', () => {
      const s = createInitialState();
      s.month = 10;
      s.eventLog.push({ month: 1, eventId: 'park', text: 'park' });
      // 9 months passed > 6 ambient cooldown
      const cat = [evt('park', 10, 'ambient'), evt('other', 1, 'ambient')];
      const r = pickEvent(s, cat);
      expect(r.event?.id).toBe('park'); // weighted 10 vs 1, easy win
    });

    it('uses the longer 12-month cooldown for crises and self-provision', () => {
      const s = createInitialState();
      s.month = 9;
      s.eventLog.push({ month: 1, eventId: 'leak', text: 'leak' });
      // 8 months passed: still inside the 12-month crisis cooldown
      const cat = [evt('leak', 10, 'crisis'), evt('other', 1, 'crisis')];
      const r = pickEvent(s, cat);
      expect(r.event?.id).toBe('other');
    });

    it('exposes COOLDOWN_MONTHS so balance can be tuned in one place', () => {
      expect(COOLDOWN_MONTHS.ambient).toBe(6);
      expect(COOLDOWN_MONTHS.incident).toBe(6);
      expect(COOLDOWN_MONTHS.crisis).toBe(12);
      expect(COOLDOWN_MONTHS['self-provision']).toBe(12);
    });
  });

  describe('global kind cooldown', () => {
    it('excludes every crisis event while any crisis fired within the global crisis cooldown', () => {
      const s = createInitialState();
      s.month = 5;
      // A different crisis event fired 2 months ago — that should lock out
      // *all* crises from the picker (not just this specific event id).
      s.eventLog.push({ month: 3, eventId: 'first', text: 'first' });
      const cat: Event[] = [evt('first', 0, 'crisis'), evt('second', 10, 'crisis')];
      const r = pickEvent(s, cat);
      expect(r.event).toBeNull();
    });

    it('lets a crisis fire once the global kind cooldown expires', () => {
      const s = createInitialState();
      s.month = 30;
      s.eventLog.push({ month: 1, eventId: 'first', text: 'first' });
      const cat: Event[] = [evt('first', 0, 'crisis'), evt('second', 10, 'crisis')];
      const r = pickEvent(s, cat);
      expect(r.event?.id).toBe('second');
    });

    it('does not let a recent crisis suppress an ambient event', () => {
      const s = createInitialState();
      s.month = 5;
      s.eventLog.push({ month: 3, eventId: 'shock', text: 'shock' });
      const cat: Event[] = [
        evt('shock', 0, 'crisis'), // recent crisis
        evt('flavor', 10, 'ambient'), // ambient is independent of crisis cooldown
      ];
      const r = pickEvent(s, cat);
      expect(r.event?.id).toBe('flavor');
    });

    it('exposes GLOBAL_KIND_COOLDOWN_MONTHS so balance can be tuned in one place', () => {
      expect(GLOBAL_KIND_COOLDOWN_MONTHS.ambient).toBeGreaterThanOrEqual(0);
      expect(GLOBAL_KIND_COOLDOWN_MONTHS.incident).toBeGreaterThan(0);
      expect(GLOBAL_KIND_COOLDOWN_MONTHS.crisis).toBeGreaterThan(0);
      expect(GLOBAL_KIND_COOLDOWN_MONTHS['self-provision']).toBeGreaterThan(0);
    });
  });

  describe('modal fire probability gate', () => {
    it('does not gate ambient events — they fire whenever weighted-eligible', () => {
      const cat: Event[] = [evt('amb', 1, 'ambient')];
      let fires = 0;
      let rng = 7;
      const N = 200;
      for (let i = 0; i < N; i++) {
        const s = createInitialState();
        s.rng = rng;
        const r = pickEvent(s, cat);
        if (r.event) fires++;
        rng = r.rngState;
      }
      expect(fires).toBe(N);
    });

    it('does not gate incident events either', () => {
      const cat: Event[] = [evt('inc', 1, 'incident')];
      let fires = 0;
      let rng = 7;
      const N = 200;
      for (let i = 0; i < N; i++) {
        const s = createInitialState();
        s.rng = rng;
        const r = pickEvent(s, cat);
        if (r.event) fires++;
        rng = r.rngState;
      }
      expect(fires).toBe(N);
    });

    it('throttles crisis fires to roughly MODAL_FIRE_PROBABILITY', () => {
      const cat: Event[] = [evt('cri', 1, 'crisis')];
      let fires = 0;
      let rng = 7;
      const N = 1000;
      for (let i = 0; i < N; i++) {
        const s = createInitialState();
        s.rng = rng;
        const r = pickEvent(s, cat);
        if (r.event) fires++;
        rng = r.rngState;
      }
      const expected = MODAL_FIRE_PROBABILITY * N;
      // ±30% tolerance — statistical, not exact
      expect(fires).toBeGreaterThan(expected * 0.7);
      expect(fires).toBeLessThan(expected * 1.3);
    });

    it('throttles self-provision fires the same way', () => {
      const cat: Event[] = [evt('sp', 1, 'self-provision')];
      let fires = 0;
      let rng = 7;
      const N = 1000;
      for (let i = 0; i < N; i++) {
        const s = createInitialState();
        s.rng = rng;
        const r = pickEvent(s, cat);
        if (r.event) fires++;
        rng = r.rngState;
      }
      const expected = MODAL_FIRE_PROBABILITY * N;
      expect(fires).toBeGreaterThan(expected * 0.7);
      expect(fires).toBeLessThan(expected * 1.3);
    });

    it('exposes MODAL_FIRE_PROBABILITY so balance can be tuned in one place', () => {
      expect(MODAL_FIRE_PROBABILITY).toBeGreaterThan(0);
      expect(MODAL_FIRE_PROBABILITY).toBeLessThan(1);
    });
  });

  describe('pacing under the real catalog (regression for BUG 1)', () => {
    it('fires a modest number of modal events across 60 ticks when many qualify', () => {
      const s = createInitialState();
      // Configure the state so most self-provision and several crises qualify.
      s.educationLevel = 0.4;
      s.inflation = 28;
      for (const d of s.districts) {
        d.wealth = 25;
        d.happiness = 30;
        d.awareness = 40;
      }
      let modalCount = 0;
      for (let i = 0; i < 60; i++) {
        processEvents(s, EVENT_CATALOG, () => {
          modalCount++;
          return 0;
        });
        s.month += 1;
      }
      // Before the fix: ~30 modals in 60 ticks. After: should be much lower.
      expect(modalCount).toBeLessThan(15);
    });
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

describe('deferred crisis resolution', () => {
  it('skips choice effects when onCrisis returns -1 and pushes to pendingCrises', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const event: Event = {
      id: 'leak',
      kind: 'crisis',
      text: 'An archivist leaks documents.',
      weight: () => 1,
      effects: () => {},
      choices: [
        { label: 'Suppress', effects: (st) => { st.treasury -= 500; } },
        { label: 'Let it run', effects: (st) => { st.fear += 5; } },
      ],
    };
    fireEvent(s, event, () => -1);
    expect(s.treasury).toBe(1000); // no choice applied
    expect(s.fear).toBe(0);
    expect(s.pendingCrises).toHaveLength(1);
    expect(s.pendingCrises[0].eventId).toBe('leak');
    expect(s.pendingCrises[0].text).toBe('An archivist leaks documents.');
    expect(s.pendingCrises[0].choices).toHaveLength(2);
  });

  it('still applies base effects and schedules even when deferred', () => {
    const s = createInitialState();
    s.month = 3;
    const event: Event = {
      id: 'false-flag',
      kind: 'crisis',
      text: '...',
      weight: () => 1,
      effects: (st) => { st.fear += 1; }, // base effect
      choices: [{ label: 'A', effects: () => {} }],
      schedule: (st) => [{ eventId: 'followup', fireMonth: st.month + 1 }],
    };
    fireEvent(s, event, () => -1);
    expect(s.fear).toBe(1);
    expect(s.pendingEvents).toEqual([{ eventId: 'followup', fireMonth: 4 }]);
  });

  it('still appends a log entry for the deferred crisis (without chosenOption)', () => {
    const s = createInitialState();
    const event: Event = {
      id: 'x',
      kind: 'crisis',
      text: 'pick',
      weight: () => 1,
      effects: () => {},
      choices: [{ label: 'A', effects: () => {} }],
    };
    fireEvent(s, event, () => -1);
    expect(s.eventLog).toHaveLength(1);
    expect(s.eventLog[0].eventId).toBe('x');
    expect(s.eventLog[0].chosenOption).toBeUndefined();
  });
});

describe('resolveCrisis', () => {
  it('applies the chosen option and removes from pendingCrises', () => {
    const s = createInitialState();
    s.treasury = 1000;
    const choices = [
      { label: 'A', effects: (st: typeof s) => { st.treasury -= 100; } },
      { label: 'B', effects: (st: typeof s) => { st.fear += 7; } },
    ];
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 1);
    expect(s.fear).toBe(7);
    expect(s.treasury).toBe(1000); // A was not chosen
    expect(s.pendingCrises).toHaveLength(0);
  });

  it('clamps an out-of-range choice index to the last option', () => {
    const s = createInitialState();
    const choices = [
      { label: 'A', effects: () => {} },
      { label: 'B', effects: (st: typeof s) => { st.fear = 5; } },
    ];
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 99);
    expect(s.fear).toBe(5);
    expect(s.pendingCrises).toHaveLength(0);
  });

  it('updates the matching event-log entry with the chosen option', () => {
    const s = createInitialState();
    s.month = 4;
    const choices = [
      { label: 'A', effects: () => {} },
      { label: 'B', effects: () => {} },
    ];
    // Simulate having fired the crisis earlier (one log entry with no chosenOption)
    s.eventLog.push({ month: 4, eventId: 'x', text: 'pick' });
    s.pendingCrises.push({ eventId: 'x', text: 'pick', choices });
    resolveCrisis(s, 1);
    expect(s.eventLog[0].chosenOption).toBe('B');
  });

  it('no-ops when pendingCrises is empty', () => {
    const s = createInitialState();
    const before = { ...s };
    resolveCrisis(s, 0);
    expect(s.fear).toBe(before.fear);
    expect(s.treasury).toBe(before.treasury);
  });
});
