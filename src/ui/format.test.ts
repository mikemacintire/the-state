import { describe, it, expect } from 'vitest';
import { formatMonth, formatMoney, meterClass } from './format';

describe('formatMonth', () => {
  it('formats month 0 as Year 1, Jan', () => {
    expect(formatMonth(0)).toBe('Year 1, Jan');
  });
  it('formats month 11 as Year 1, Dec', () => {
    expect(formatMonth(11)).toBe('Year 1, Dec');
  });
  it('rolls into Year 2 at month 12', () => {
    expect(formatMonth(12)).toBe('Year 2, Jan');
  });
});

describe('formatMoney', () => {
  it('groups thousands and prepends a currency mark', () => {
    expect(formatMoney(5000)).toBe('$5,000');
    expect(formatMoney(1234567)).toBe('$1,234,567');
  });
  it('rounds to whole units', () => {
    expect(formatMoney(123.4)).toBe('$123');
    expect(formatMoney(123.7)).toBe('$124');
  });
  it('handles negatives', () => {
    expect(formatMoney(-200)).toBe('-$200');
  });
});

describe('meterClass', () => {
  it('returns "" when the value is well below the threshold', () => {
    expect(meterClass(10, 100)).toBe('');
  });
  it('returns "warn" when value is past 60% of threshold', () => {
    expect(meterClass(70, 100)).toBe('warn');
  });
  it('returns "danger" when value is past 85% of threshold', () => {
    expect(meterClass(90, 100)).toBe('danger');
  });
});
