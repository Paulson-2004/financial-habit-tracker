import { describe, expect, it } from 'vitest';
import { transactionFormSchema } from '../schemas/transactionSchemas.js';

describe('transactionFormSchema', () => {
  const base = {
    type: 'expense',
    categoryId: 'some-category-id',
    amount: '100.50',
    transactionDate: '2026-01-15',
    description: '',
  };

  it('accepts a valid expense', () => {
    expect(transactionFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty category', () => {
    const result = transactionFormSchema.safeParse({ ...base, categoryId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(transactionFormSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...base, amount: '-5' }).success).toBe(false);
  });

  it('rejects a non-numeric amount', () => {
    expect(transactionFormSchema.safeParse({ ...base, amount: 'abc' }).success).toBe(false);
  });

  it('rejects a missing date', () => {
    expect(transactionFormSchema.safeParse({ ...base, transactionDate: '' }).success).toBe(false);
  });
});
