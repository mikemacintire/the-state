import { describe, it, expect } from 'vitest';
import { awarenessDrift, updateAwareness } from './awareness';
import { createInitialState } from './state';

describe('awarenessDrift', () => {
  // Signature: (wealth, awareness, inflation, educationLevel, propagandaBudget, nationalProsperity)
  it('rises when wealth is high and there is no suppression', () => {
    expect(awarenessDrift(80, 20, 0, 0, 0, 0)).toBeGreaterThan(0);
  });

  it('does not rise from prosperity alone at or below wealth 50', () => {
    expect(awarenessDrift(50, 20, 0, 0, 0, 0)).toBeLessThanOrEqual(0);
    expect(awarenessDrift(30, 20, 0, 0, 0, 0)).toBeLessThanOrEqual(0);
  });

  it('rises with inflation', () => {
    expect(awarenessDrift(50, 20, 10, 0, 0, 0)).toBeGreaterThan(
      awarenessDrift(50, 20, 0, 0, 0, 0),
    );
  });

  it('is held down by education and propaganda (against a low-awareness district)', () => {
    const unsuppressed = awarenessDrift(80, 20, 5, 0, 0, 0);
    const suppressed = awarenessDrift(80, 20, 5, 0.5, 5000, 0);
    expect(suppressed).toBeLessThan(unsuppressed);
  });

  it('education has Laffer-shaped diminishing returns — full monopoly is worse than partial', () => {
    // Same conditions, only education differs. Brittleness + sub-linear suppression
    // mean educationLevel 1.0 nets less suppression than 0.6.
    const partial = awarenessDrift(80, 20, 0, 0.6, 0, 0);
    const total = awarenessDrift(80, 20, 0, 1.0, 0, 0);
    expect(total).toBeGreaterThan(partial); // total monopoly suppresses less (or even pushes back)
  });

  it('propaganda is less effective on a highly-aware district', () => {
    const naive = awarenessDrift(80, 20, 0, 0, 5000, 0);
    const awake = awarenessDrift(80, 80, 0, 0, 5000, 0);
    // Both districts have the same drift inputs except awareness. Higher awareness
    // reduces propaganda effectiveness — so the awake district drifts MORE up.
    expect(awake).toBeGreaterThan(naive);
  });

  it('propaganda is less effective in a prosperous country', () => {
    const poor = awarenessDrift(80, 20, 0, 0, 5000, 0);
    const rich = awarenessDrift(80, 20, 0, 0, 5000, 80);
    expect(rich).toBeGreaterThan(poor);
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
