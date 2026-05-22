import { describe, it, expect } from 'vitest';
import { awarenessDrift, updateAwareness } from './awareness';
import { createInitialState } from './state';

describe('awarenessDrift', () => {
  it('rises when wealth is high and there is no suppression', () => {
    expect(awarenessDrift(80, 0, 0, 0)).toBeGreaterThan(0);
  });

  it('does not rise from prosperity alone at or below wealth 50', () => {
    expect(awarenessDrift(50, 0, 0, 0)).toBeLessThanOrEqual(0);
    expect(awarenessDrift(30, 0, 0, 0)).toBeLessThanOrEqual(0);
  });

  it('rises with inflation', () => {
    expect(awarenessDrift(50, 10, 0, 0)).toBeGreaterThan(awarenessDrift(50, 0, 0, 0));
  });

  it('is held down by education and propaganda', () => {
    const unsuppressed = awarenessDrift(80, 5, 0, 0);
    const suppressed = awarenessDrift(80, 5, 1, 5000);
    expect(suppressed).toBeLessThan(unsuppressed);
  });
});

describe('updateAwareness', () => {
  it('raises awareness in a prosperous, unsuppressed country', () => {
    const s = createInitialState();
    for (const d of s.districts) {
      d.wealth = 80;
      d.awareness = 20;
    }
    s.inflation = 0;
    s.educationLevel = 0;
    s.propagandaBudget = 0;
    updateAwareness(s);
    for (const d of s.districts) {
      expect(d.awareness).toBeGreaterThan(20);
    }
  });

  it('keeps awareness within 0..100 under extreme suppression', () => {
    const s = createInitialState();
    s.educationLevel = 1;
    s.propagandaBudget = 1_000_000;
    updateAwareness(s);
    for (const d of s.districts) {
      expect(d.awareness).toBeGreaterThanOrEqual(0);
      expect(d.awareness).toBeLessThanOrEqual(100);
    }
  });
});
