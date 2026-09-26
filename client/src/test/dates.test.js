import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { localToday } from '../utils/dates.js';

describe('localToday', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the local calendar date as YYYY-MM-DD', () => {
    vi.setSystemTime(new Date(2026, 2, 5, 10, 0, 0)); // local: 5 Mar 2026, 10:00 (month is 0-indexed)
    expect(localToday()).toBe('2026-03-05');
  });

  it('pads single-digit months and days', () => {
    vi.setSystemTime(new Date(2026, 0, 9, 23, 59, 0)); // local: 9 Jan 2026, 23:59
    expect(localToday()).toBe('2026-01-09');
  });
});
