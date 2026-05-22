import { describe, it, expect } from 'vitest';
import { clamp } from './util';

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps up to the minimum', () => {
    expect(clamp(-3, 0, 10)).toBe(0);
  });
  it('clamps down to the maximum', () => {
    expect(clamp(42, 0, 10)).toBe(10);
  });
});
