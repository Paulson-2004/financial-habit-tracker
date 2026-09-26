import { describe, expect, it } from 'vitest';
import { createContributionSchema, createGoalSchema, updateGoalSchema } from '../../src/validators/goalValidators.js';

describe('createGoalSchema', () => {
  it('accepts a valid goal with no target date', () => {
    expect(createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: 100000 }).success).toBe(true);
  });

  it('accepts a valid goal with a future target date', () => {
    const result = createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: 100000, targetDate: '2099-01-01' });
    expect(result.success).toBe(true);
  });

  it('rejects a target date in the past', () => {
    const result = createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: 100000, targetDate: '2000-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero or negative target amount', () => {
    expect(createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: 0 }).success).toBe(false);
    expect(createGoalSchema.safeParse({ name: 'Emergency fund', targetAmount: -500 }).success).toBe(false);
  });

  it('rejects an unknown field, e.g. a client-supplied status', () => {
    const result = createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, status: 'completed' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed calendar date even if it matches the YYYY-MM-DD shape', () => {
    const result = createGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, targetDate: '2099-02-30' });
    expect(result.success).toBe(false);
  });
});

describe('updateGoalSchema', () => {
  it('allows a target date in the past (an existing goal may already be overdue)', () => {
    const result = updateGoalSchema.safeParse({ name: 'Fund', targetAmount: 100, targetDate: '2020-01-01' });
    expect(result.success).toBe(true);
  });

  it('still requires targetAmount to be positive', () => {
    expect(updateGoalSchema.safeParse({ name: 'Fund', targetAmount: -1 }).success).toBe(false);
  });
});

describe('createContributionSchema', () => {
  it('accepts a valid contribution', () => {
    expect(createContributionSchema.safeParse({ amount: 5000, contributionDate: '2026-01-15' }).success).toBe(true);
  });

  it('accepts an optional note', () => {
    const result = createContributionSchema.safeParse({ amount: 5000, contributionDate: '2026-01-15', note: 'Bonus' });
    expect(result.success).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(createContributionSchema.safeParse({ amount: 0, contributionDate: '2026-01-15' }).success).toBe(false);
    expect(createContributionSchema.safeParse({ amount: -100, contributionDate: '2026-01-15' }).success).toBe(false);
  });

  it('rejects a future-dated contribution beyond the allowance', () => {
    expect(createContributionSchema.safeParse({ amount: 100, contributionDate: '2099-01-01' }).success).toBe(false);
  });
});
