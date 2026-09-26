import { describe, expect, it } from 'vitest';
import { computeGoalProgress, computeGoalStatus } from '../../src/calc/goals.js';

describe('computeGoalProgress', () => {
  it('spec example: target 100000, contributions 20000 + 30000 = 50000', () => {
    const result = computeGoalProgress(100000, 50000);
    expect(result).toEqual({ remainingAmount: 50000, progressPercent: 50, overfundedBy: 0 });
  });

  it('spec example: contributions (120000) exceed the target (100000)', () => {
    const result = computeGoalProgress(100000, 120000);
    // remaining must never go negative, and progress is capped at 100 for display.
    expect(result.remainingAmount).toBe(0);
    expect(result.progressPercent).toBe(100);
    // The actual contributed amount is preserved by the caller (goalService.js), not
    // clamped here - this function only reports how much it overshot by.
    expect(result.overfundedBy).toBe(20000);
  });

  it('zero contributions', () => {
    expect(computeGoalProgress(100000, 0)).toEqual({ remainingAmount: 100000, progressPercent: 0, overfundedBy: 0 });
  });

  it('a contribution exactly equal to the target', () => {
    expect(computeGoalProgress(100000, 100000)).toEqual({ remainingAmount: 0, progressPercent: 100, overfundedBy: 0 });
  });

  it('never divides by zero for a zero target', () => {
    expect(computeGoalProgress(0, 0)).toEqual({ remainingAmount: 0, progressPercent: 0, overfundedBy: 0 });
  });
});

describe('computeGoalStatus', () => {
  const today = '2026-06-15';

  it('is "completed" once contributions reach the target', () => {
    const status = computeGoalStatus({ contributedAmount: 100000, targetAmount: 100000, targetDate: null, today });
    expect(status).toBe('completed');
  });

  it('is "completed" even past its target date, if contributions exceed the target', () => {
    const status = computeGoalStatus({
      contributedAmount: 120000,
      targetAmount: 100000,
      targetDate: '2020-01-01',
      today,
    });
    expect(status).toBe('completed');
  });

  it('is "overdue" when the target date has passed and it is not yet completed', () => {
    const status = computeGoalStatus({ contributedAmount: 1000, targetAmount: 100000, targetDate: '2020-01-01', today });
    expect(status).toBe('overdue');
  });

  it('is "in_progress" with no target date set', () => {
    const status = computeGoalStatus({ contributedAmount: 1000, targetAmount: 100000, targetDate: null, today });
    expect(status).toBe('in_progress');
  });

  it('is "in_progress" when the target date is still in the future', () => {
    const status = computeGoalStatus({ contributedAmount: 1000, targetAmount: 100000, targetDate: '2030-01-01', today });
    expect(status).toBe('in_progress');
  });

  it('is "in_progress" (not "overdue") when the target date is exactly today', () => {
    const status = computeGoalStatus({ contributedAmount: 1000, targetAmount: 100000, targetDate: today, today });
    expect(status).toBe('in_progress');
  });
});
