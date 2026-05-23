const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Year N, Mon" from a 0-based monthIndex. */
export function formatMonth(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12) + 1;
  const m = MONTHS[((monthIndex % 12) + 12) % 12];
  return `Year ${year}, ${m}`;
}

/** "$1,234" with thousands separators, rounded to a whole unit. */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? '-' : '';
  const n = Math.abs(rounded).toLocaleString('en-US');
  return `${sign}$${n}`;
}

/**
 * CSS class for a meter value approaching a danger threshold:
 *   < 60% of threshold → ''
 *   60–85%             → 'warn'
 *   >= 85%             → 'danger'
 */
export function meterClass(value: number, threshold: number): string {
  if (threshold <= 0) return '';
  const r = value / threshold;
  if (r >= 0.85) return 'danger';
  if (r >= 0.6) return 'warn';
  return '';
}

/**
 * Arrow glyph for a per-month delta. Threshold is 0.05 to keep tiny drift
 * showing as flat instead of jittering ↑/↓ on noise.
 */
export function deltaArrow(delta: number): '↑' | '↓' | '→' {
  if (delta > 0.05) return '↑';
  if (delta < -0.05) return '↓';
  return '→';
}

/**
 * Human-readable per-month delta for a meter, e.g. `+0.6/mo`, `-1.2/mo`, `0.0/mo`.
 */
export function formatMeterDelta(delta: number): string {
  if (Math.abs(delta) < 0.05) return '0.0/mo';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}/mo`;
}

/**
 * Human-readable per-month treasury delta, e.g. `+$420/mo`, `-$180/mo`.
 * Uses the `formatMoney` sign convention so negative deltas render as `-$180`.
 */
export function formatMoneyDelta(delta: number): string {
  if (Math.abs(delta) < 0.5) return '$0/mo';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatMoney(delta)}/mo`;
}
