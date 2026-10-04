import { describe, expect, it } from 'vitest';
import {
  computeCurrentStreak,
  computeLongestStreak,
  isCompletedCurrentPeriod,
  isCompletedToday,
} from '../../src/calc/streaks.js';

describe('computeCurrentStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeCurrentStreak([], '2026-03-05')).toBe(0);
  });

  it('is 1 with a single completion on today', () => {
    expect(computeCurrentStreak(['2026-03-05'], '2026-03-05')).toBe(1);
  });

  it('is 0 for a single completion that is not today or yesterday', () => {
    expect(computeCurrentStreak(['2026-02-01'], '2026-03-05')).toBe(0);
  });

  it('counts a consecutive 2-day streak ending today', () => {
    expect(computeCurrentStreak(['2026-03-01', '2026-03-02'], '2026-03-02')).toBe(2);
  });

  it('counts a consecutive multi-day streak (spec example: 3 days)', () => {
    expect(computeCurrentStreak(['2026-03-01', '2026-03-02', '2026-03-03'], '2026-03-03')).toBe(3);
  });

  it('gives the same result regardless of input date ordering', () => {
    const forward = computeCurrentStreak(['2026-03-01', '2026-03-02', '2026-03-03'], '2026-03-03');
    const shuffled = computeCurrentStreak(['2026-03-03', '2026-03-01', '2026-03-02'], '2026-03-03');
    expect(shuffled).toBe(forward);
  });

  it('an incomplete "today" does not break the streak - yesterday still counts', () => {
    expect(computeCurrentStreak(['2026-03-01', '2026-03-02'], '2026-03-03')).toBe(2);
  });

  it('a missing day breaks the current streak (spec broken-streak example)', () => {
    expect(computeCurrentStreak(['2026-03-01', '2026-03-02', '2026-03-04'], '2026-03-04')).toBe(1);
  });

  it('the streak is fully lapsed once more than a day has passed since the last completion', () => {
    expect(computeCurrentStreak(['2026-03-01', '2026-03-02', '2026-03-04'], '2026-03-06')).toBe(0);
  });
});

describe('computeLongestStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeLongestStreak([])).toBe(0);
  });

  it('is 1 with a single completion', () => {
    expect(computeLongestStreak(['2026-03-05'])).toBe(1);
  });

  it('finds a consecutive multi-day run', () => {
    expect(computeLongestStreak(['2026-03-01', '2026-03-02', '2026-03-03'])).toBe(3);
  });

  it('remains after the current streak breaks (spec broken-streak example)', () => {
    expect(computeLongestStreak(['2026-03-01', '2026-03-02', '2026-03-04'])).toBe(2);
  });

  it('gives the same result regardless of input date ordering', () => {
    expect(computeLongestStreak(['2026-03-04', '2026-03-01', '2026-03-02'])).toBe(2);
  });

  it('ignores duplicate dates', () => {
    expect(computeLongestStreak(['2026-03-01', '2026-03-01', '2026-03-02'])).toBe(2);
  });

  it('picks the longest of several runs', () => {
    const dates = ['2026-01-01', '2026-01-02', '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04'];
    expect(computeLongestStreak(dates)).toBe(4);
  });
});

describe('isCompletedToday and isCompletedCurrentPeriod', () => {
  it('is true when today is in the completion list for daily', () => {
    expect(isCompletedToday(['2026-03-04', '2026-03-05'], '2026-03-05')).toBe(true);
  });

  it('is false when today is not in the completion list for daily', () => {
    expect(isCompletedToday(['2026-03-04'], '2026-03-05')).toBe(false);
  });

  it('is false for an empty completion list', () => {
    expect(isCompletedToday([], '2026-03-05')).toBe(false);
  });

  it('detects weekly completion anywhere in the current week (Monday-Sunday)', () => {
    // 2026-03-02 is Monday, 2026-03-04 is Wednesday, 2026-03-08 is Sunday
    expect(isCompletedCurrentPeriod(['2026-03-02'], '2026-03-05', 'weekly')).toBe(true);
    expect(isCompletedCurrentPeriod(['2026-03-04'], '2026-03-08', 'weekly')).toBe(true);
    expect(isCompletedCurrentPeriod(['2026-02-28'], '2026-03-05', 'weekly')).toBe(false);
  });

  it('detects monthly completion anywhere in the current calendar month', () => {
    expect(isCompletedCurrentPeriod(['2026-03-01'], '2026-03-25', 'monthly')).toBe(true);
    expect(isCompletedCurrentPeriod(['2026-03-15'], '2026-03-01', 'monthly')).toBe(true);
    expect(isCompletedCurrentPeriod(['2026-02-28'], '2026-03-01', 'monthly')).toBe(false);
  });
});

describe('Weekly streaks', () => {
  // Monday dates: 2026-02-16, 2026-02-23, 2026-03-02, 2026-03-09
  it('is 0 with no completions', () => {
    expect(computeCurrentStreak([], '2026-03-05', 'weekly')).toBe(0);
    expect(computeLongestStreak([], 'weekly')).toBe(0);
  });

  it('counts 1 for completion in the current week', () => {
    expect(computeCurrentStreak(['2026-03-04'], '2026-03-05', 'weekly')).toBe(1);
    expect(computeLongestStreak(['2026-03-04'], 'weekly')).toBe(1);
  });

  it('preserves streak of 1 if current week is incomplete but previous week was completed', () => {
    // 2026-03-05 is in the week of 2026-03-02. Completed on 2026-02-25 (previous week).
    expect(computeCurrentStreak(['2026-02-25'], '2026-03-05', 'weekly')).toBe(1);
  });

  it('builds a multi-week streak across consecutive weeks', () => {
    // Weeks of Feb 16, Feb 23, Mar 02
    const dates = ['2026-02-18', '2026-02-24', '2026-03-03'];
    expect(computeCurrentStreak(dates, '2026-03-05', 'weekly')).toBe(3);
    expect(computeLongestStreak(dates, 'weekly')).toBe(3);
  });

  it('collapses multiple completions within the same week into a single streak count', () => {
    const dates = ['2026-03-02', '2026-03-04', '2026-03-06']; // All same week
    expect(computeCurrentStreak(dates, '2026-03-06', 'weekly')).toBe(1);
    expect(computeLongestStreak(dates, 'weekly')).toBe(1);
  });

  it('breaks current streak when a week is missed', () => {
    // Weeks of Feb 16, Mar 02 (missed week of Feb 23)
    const dates = ['2026-02-18', '2026-03-03'];
    expect(computeCurrentStreak(dates, '2026-03-05', 'weekly')).toBe(1);
    expect(computeLongestStreak(dates, 'weekly')).toBe(1);
  });

  it('crosses year boundaries correctly for weekly streaks', () => {
    // Mondays: 2025-12-22, 2025-12-29, 2026-01-05
    const dates = ['2025-12-24', '2025-12-30', '2026-01-07'];
    expect(computeCurrentStreak(dates, '2026-01-08', 'weekly')).toBe(3);
    expect(computeLongestStreak(dates, 'weekly')).toBe(3);
  });

  it('computes longest streak when current streak has lapsed', () => {
    // 3 consecutive weeks in Jan, nothing in Feb/Mar
    const dates = ['2026-01-05', '2026-01-12', '2026-01-19'];
    expect(computeCurrentStreak(dates, '2026-03-05', 'weekly')).toBe(0);
    expect(computeLongestStreak(dates, 'weekly')).toBe(3);
  });
});

describe('Monthly streaks', () => {
  it('is 0 with no completions', () => {
    expect(computeCurrentStreak([], '2026-03-15', 'monthly')).toBe(0);
    expect(computeLongestStreak([], 'monthly')).toBe(0);
  });

  it('counts 1 for completion in the current month', () => {
    expect(computeCurrentStreak(['2026-03-01'], '2026-03-15', 'monthly')).toBe(1);
    expect(computeLongestStreak(['2026-03-01'], 'monthly')).toBe(1);
  });

  it('preserves streak if current month is incomplete but previous month was completed', () => {
    expect(computeCurrentStreak(['2026-02-10'], '2026-03-15', 'monthly')).toBe(1);
  });

  it('builds a multi-month streak', () => {
    const dates = ['2026-01-15', '2026-02-10', '2026-03-02'];
    expect(computeCurrentStreak(dates, '2026-03-15', 'monthly')).toBe(3);
    expect(computeLongestStreak(dates, 'monthly')).toBe(3);
  });

  it('collapses multiple completions in the same month', () => {
    const dates = ['2026-03-02', '2026-03-15', '2026-03-28'];
    expect(computeCurrentStreak(dates, '2026-03-29', 'monthly')).toBe(1);
    expect(computeLongestStreak(dates, 'monthly')).toBe(1);
  });

  it('handles year boundary (December -> January)', () => {
    const dates = ['2025-11-20', '2025-12-15', '2026-01-10'];
    expect(computeCurrentStreak(dates, '2026-01-20', 'monthly')).toBe(3);
    expect(computeLongestStreak(dates, 'monthly')).toBe(3);
  });

  it('breaks streak when a month is missed', () => {
    // Jan 2026, Mar 2026 (Feb missed)
    const dates = ['2026-01-10', '2026-03-05'];
    expect(computeCurrentStreak(dates, '2026-03-10', 'monthly')).toBe(1);
    expect(computeLongestStreak(dates, 'monthly')).toBe(1);
  });

  it('computes longest streak when current streak has lapsed', () => {
    const dates = ['2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01'];
    expect(computeCurrentStreak(dates, '2026-03-15', 'monthly')).toBe(0);
    expect(computeLongestStreak(dates, 'monthly')).toBe(4);
  });
});

