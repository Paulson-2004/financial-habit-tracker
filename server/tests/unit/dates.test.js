import { describe, expect, it } from 'vitest';
import {
  addDaysUTC,
  isValidCalendarDateString,
  isWithinTransactionDateRange,
  monthEnd,
  monthEndExclusive,
  monthStart,
} from '../../src/utils/dates.js';

describe('isValidCalendarDateString', () => {
  it('accepts a real date', () => {
    expect(isValidCalendarDateString('2026-01-15')).toBe(true);
  });

  it('rejects an out-of-range day (no Feb 30th)', () => {
    expect(isValidCalendarDateString('2026-02-30')).toBe(false);
  });

  it('rejects a malformed string', () => {
    expect(isValidCalendarDateString('15-01-2026')).toBe(false);
    expect(isValidCalendarDateString('not-a-date')).toBe(false);
  });

  it('accepts a leap day only in a leap year', () => {
    expect(isValidCalendarDateString('2024-02-29')).toBe(true);
    expect(isValidCalendarDateString('2023-02-29')).toBe(false);
  });
});

describe('isWithinTransactionDateRange', () => {
  const today = '2026-09-22';

  it('accepts today', () => {
    expect(isWithinTransactionDateRange('2026-09-22', today)).toBe(true);
  });

  it('accepts a past date', () => {
    expect(isWithinTransactionDateRange('2020-01-01', today)).toBe(true);
  });

  it('accepts tomorrow (one day of slack for timezones ahead of UTC)', () => {
    expect(isWithinTransactionDateRange('2026-09-23', today)).toBe(true);
  });

  it('rejects the day after tomorrow', () => {
    expect(isWithinTransactionDateRange('2026-09-24', today)).toBe(false);
  });

  it('rejects a date before the minimum', () => {
    expect(isWithinTransactionDateRange('1999-12-31', today)).toBe(false);
  });

  it('rejects an invalid calendar date even if in range', () => {
    expect(isWithinTransactionDateRange('2026-02-30', today)).toBe(false);
  });
});

describe('month helpers', () => {
  it('monthStart returns the first day of the month', () => {
    expect(monthStart('2026-09')).toBe('2026-09-01');
  });

  it('monthEndExclusive returns the first day of the next month', () => {
    expect(monthEndExclusive('2026-09')).toBe('2026-10-01');
  });

  it('monthEndExclusive rolls over the year at December', () => {
    expect(monthEndExclusive('2026-12')).toBe('2027-01-01');
  });

  it('monthEnd returns the inclusive last day of the month', () => {
    expect(monthEnd('2026-01')).toBe('2026-01-31');
    expect(monthEnd('2026-04')).toBe('2026-04-30');
  });

  it('monthEnd handles February correctly in leap and non-leap years', () => {
    expect(monthEnd('2024-02')).toBe('2024-02-29'); // 2024 is a leap year
    expect(monthEnd('2026-02')).toBe('2026-02-28'); // 2026 is not
  });

  it('monthEnd rolls over the year at December', () => {
    expect(monthEnd('2026-12')).toBe('2026-12-31');
  });
});

describe('addDaysUTC', () => {
  it('adds days within a month', () => {
    expect(addDaysUTC('2026-09-22', 1)).toBe('2026-09-23');
  });

  it('rolls over a month boundary', () => {
    expect(addDaysUTC('2026-09-30', 1)).toBe('2026-10-01');
  });
});
