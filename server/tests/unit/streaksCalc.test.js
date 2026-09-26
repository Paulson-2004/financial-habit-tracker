import { describe, expect, it } from 'vitest';
import { computeCurrentStreak, computeLongestStreak, isCompletedToday } from '../../src/calc/streaks.js';

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

describe('isCompletedToday', () => {
  it('is true when today is in the completion list', () => {
    expect(isCompletedToday(['2026-03-04', '2026-03-05'], '2026-03-05')).toBe(true);
  });

  it('is false when today is not in the completion list', () => {
    expect(isCompletedToday(['2026-03-04'], '2026-03-05')).toBe(false);
  });

  it('is false for an empty completion list', () => {
    expect(isCompletedToday([], '2026-03-05')).toBe(false);
  });
});
