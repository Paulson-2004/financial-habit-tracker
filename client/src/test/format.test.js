import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from '../utils/format.js';

describe('formatMoney', () => {
  it('formats a positive amount with the given currency', () => {
    expect(formatMoney(1234.5, 'INR')).toContain('1,234.50');
  });

  it('falls back to a plain string for a malformed currency code', () => {
    // 'ZZZ' is well-formed (Intl accepts any 3-letter code without throwing) but a
    // symbol like 'US$' is not valid ISO 4217 shape and does throw - that's the case
    // formatMoney's fallback exists for.
    expect(formatMoney(100, 'US$')).toBe('100.00 US$');
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string as "D MMM YYYY"', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
  });
});
