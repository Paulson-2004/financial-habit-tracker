import { describe, expect, it } from 'vitest';
import { contributionFormSchema, goalFormSchema } from '../schemas/goalSchemas.js';

describe('goalFormSchema', () => {
  const base = { name: 'Emergency fund', description: '', targetAmount: '100000', targetDate: '' };

  it('accepts a valid goal with no target date', () => {
    expect(goalFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a zero or non-numeric target amount', () => {
    expect(goalFormSchema.safeParse({ ...base, targetAmount: '0' }).success).toBe(false);
    expect(goalFormSchema.safeParse({ ...base, targetAmount: 'abc' }).success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(goalFormSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });
});

describe('contributionFormSchema', () => {
  const base = { amount: '5000', contributionDate: '2026-01-15', note: '' };

  it('accepts a valid contribution', () => {
    expect(contributionFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(contributionFormSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(contributionFormSchema.safeParse({ ...base, amount: '-5' }).success).toBe(false);
  });

  it('rejects a missing date', () => {
    expect(contributionFormSchema.safeParse({ ...base, contributionDate: '' }).success).toBe(false);
  });
});
