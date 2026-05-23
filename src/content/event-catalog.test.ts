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
});
