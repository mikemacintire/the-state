import { describe, it, expect } from 'vitest';
import { EVENT_CATALOG } from './event-catalog';
import { createInitialState } from '../sim/state';

describe('EVENT_CATALOG', () => {
  it('defines a non-trivial v1 catalog', () => {
    expect(EVENT_CATALOG.length).toBeGreaterThanOrEqual(10);
  });

  it('gives every event a unique id', () => {
    const ids = EVENT_CATALOG.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes at least one event of every kind', () => {
    const kinds = new Set(EVENT_CATALOG.map((e) => e.kind));
    for (const k of ['ambient', 'incident', 'crisis', 'self-provision'] as const) {
      expect(kinds.has(k)).toBe(true);
    }
  });

  it('returns non-negative weights for the initial state', () => {
    const s = createInitialState();
    for (const e of EVENT_CATALOG) {
      expect(e.weight(s)).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every crisis a non-empty choices array', () => {
    for (const e of EVENT_CATALOG) {
      if (e.kind === 'crisis') {
        expect(e.choices).toBeDefined();
        expect((e.choices ?? []).length).toBeGreaterThan(0);
      }
    }
  });

  describe('event anchoring (spatial surface)', () => {
    it('gives every event an anchor function returning a district id', () => {
      const s = createInitialState();
      const districtIds = new Set(s.districts.map((d) => d.id));
      for (const e of EVENT_CATALOG) {
        expect(e.anchor, `event ${e.id} has no anchor`).toBeDefined();
        const id = e.anchor!(s);
        expect(districtIds.has(id), `event ${e.id} returned ${id}, not a valid district`).toBe(true);
      }
    });

    it('anchors port-themed events to the port', () => {
      const s = createInitialState();
      for (const id of ['cri-false-flag', 'cri-foreign-coin', 'inc-trade-retaliation']) {
        const e = EVENT_CATALOG.find((x) => x.id === id)!;
        expect(e.anchor!(s)).toBe('port');
      }
    });

    it('anchors academy-themed events to the university', () => {
      const s = createInitialState();
      for (const id of ['sp-samizdat-pamphlet', 'sp-private-school', 'amb-curriculum-update']) {
        const e = EVENT_CATALOG.find((x) => x.id === id)!;
        expect(e.anchor!(s)).toBe('university');
      }
    });

    it('anchors border-themed events to the garrison', () => {
      const s = createInitialState();
      const e = EVENT_CATALOG.find((x) => x.id === 'inc-border-flare')!;
      expect(e.anchor!(s)).toBe('garrison');
    });

    it('anchors the small-protest incident to the district with the highest unrest', () => {
      const s = createInitialState();
      const target = s.districts.find((d) => d.id === 'outerwards')!;
      target.unrest = 80;
      target.awareness = 60;
      const e = EVENT_CATALOG.find((x) => x.id === 'inc-small-protest')!;
      expect(e.anchor!(s)).toBe('outerwards');
    });

    it('anchors the unlicensed-clinic self-provision to the lowest-happiness district', () => {
      const s = createInitialState();
      const target = s.districts.find((d) => d.id === 'farmland')!;
      target.happiness = 5;
      const e = EVENT_CATALOG.find((x) => x.id === 'sp-unlicensed-clinic')!;
      expect(e.anchor!(s)).toBe('farmland');
    });

    it('anchors mutual-aid to the poorest district', () => {
      const s = createInitialState();
      // outerwards starts at wealth 25 — already poorest. Confirm.
      const e = EVENT_CATALOG.find((x) => x.id === 'sp-mutual-aid')!;
      expect(e.anchor!(s)).toBe('outerwards');
    });
  });
});
