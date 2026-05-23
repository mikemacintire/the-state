import { describe, it, expect } from 'vitest';
import {
  formatMonth,
  formatMoney,
  meterClass,
  deltaArrow,
  formatMeterDelta,
  formatMoneyDelta,
} from './format';

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

describe('deltaArrow', () => {
  it('uses ↑ for positive change', () => {
    expect(deltaArrow(0.5)).toBe('↑');
  });
  it('uses ↓ for negative change', () => {
    expect(deltaArrow(-0.5)).toBe('↓');
  });
  it('uses → for ~zero change (avoids jitter)', () => {
    expect(deltaArrow(0)).toBe('→');
    expect(deltaArrow(0.01)).toBe('→');
    expect(deltaArrow(-0.04)).toBe('→');
  });
});

describe('formatMeterDelta', () => {
  it('formats positive with sign and units', () => {
    expect(formatMeterDelta(1.234)).toBe('+1.2/mo');
  });
  it('formats negative with sign and units', () => {
    expect(formatMeterDelta(-2.7)).toBe('-2.7/mo');
  });
  it('shows 0.0/mo for ~zero (avoids "+0.0" noise)', () => {
    expect(formatMeterDelta(0)).toBe('0.0/mo');
    expect(formatMeterDelta(0.02)).toBe('0.0/mo');
  });
});

describe('formatMoneyDelta', () => {
  it('formats positive with sign', () => {
    expect(formatMoneyDelta(420)).toBe('+$420/mo');
  });
  it('formats negative with sign baked into formatMoney', () => {
    expect(formatMoneyDelta(-180)).toBe('-$180/mo');
  });
  it('shows $0/mo for ~zero', () => {
    expect(formatMoneyDelta(0)).toBe('$0/mo');
  });
});
