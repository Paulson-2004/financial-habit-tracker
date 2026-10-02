import { describe, expect, it } from 'vitest';
import { formatCompactMoney, formatDate, formatMoney, formatMonthLabel, formatShortDate, formatSignedMoney } from '../utils/format.js';

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

describe('formatSignedMoney', () => {
  it('prefixes a positive amount with +', () => {
    expect(formatSignedMoney(1000, 'INR').startsWith('+')).toBe(true);
  });

  it('keeps the existing - for a negative amount (no double sign)', () => {
    const result = formatSignedMoney(-1000, 'INR');
    expect(result.startsWith('+')).toBe(false);
    expect(result).toContain('-');
  });

  it('adds no sign for exactly 0', () => {
    expect(/^[+-]/.test(formatSignedMoney(0, 'INR'))).toBe(false);
  });
});

describe('formatCompactMoney', () => {
  it('produces a shorter string than formatMoney for a large amount', () => {
    const compact = formatCompactMoney(1500000, 'INR');
    const full = formatMoney(1500000, 'INR');
    expect(compact.length).toBeLessThan(full.length);
  });

  it('falls back to a plain string for a malformed currency code', () => {
    expect(formatCompactMoney(100, 'US$')).toBe('100 US$');
  });
});

describe('formatDate', () => {
  it('formats a YYYY-MM-DD string as "D MMM YYYY"', () => {
    expect(formatDate('2026-01-15')).toBe('15 Jan 2026');
  });
});

describe('formatShortDate', () => {
  it('formats a YYYY-MM-DD string as "D MMM YY"', () => {
    expect(formatShortDate('2026-01-15')).toBe('15 Jan 26');
  });
});

describe('formatMonthLabel', () => {
  it('formats a YYYY-MM string as "Month YYYY"', () => {
    expect(formatMonthLabel('2026-09')).toBe('September 2026');
  });
});
