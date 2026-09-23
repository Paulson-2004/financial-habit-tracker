import { describe, expect, it } from 'vitest';
import {
  amountSchema,
  transactionBodySchema,
  transactionDateSchema,
  transactionListQuerySchema,
} from '../../src/validators/transactionValidators.js';

const VALID_CATEGORY_ID = '11111111-1111-4111-8111-111111111111';

describe('amountSchema', () => {
  it('accepts a positive amount with up to 2 decimals', () => {
    expect(amountSchema.safeParse(1200.5).success).toBe(true);
    expect(amountSchema.safeParse(50000).success).toBe(true);
  });

  it('rejects zero and negative amounts', () => {
    expect(amountSchema.safeParse(0).success).toBe(false);
    expect(amountSchema.safeParse(-100).success).toBe(false);
  });

  it('rejects more than 2 decimal places', () => {
    expect(amountSchema.safeParse(10.999).success).toBe(false);
  });

  it('rejects an absurdly large amount', () => {
    expect(amountSchema.safeParse(10_000_000_000).success).toBe(false);
  });
});

describe('transactionDateSchema', () => {
  it('accepts a well-formed past date', () => {
    expect(transactionDateSchema.safeParse('2026-01-15').success).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(transactionDateSchema.safeParse('15/01/2026').success).toBe(false);
  });

  it('rejects a date far in the future', () => {
    expect(transactionDateSchema.safeParse('2099-01-01').success).toBe(false);
  });
});

describe('transactionBodySchema', () => {
  const base = { type: 'expense', categoryId: VALID_CATEGORY_ID, amount: 100, transactionDate: '2026-01-15' };

  it('accepts a valid expense with no description', () => {
    expect(transactionBodySchema.safeParse(base).success).toBe(true);
  });

  it('accepts an optional description', () => {
    const result = transactionBodySchema.safeParse({ ...base, description: 'Groceries' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid transaction type', () => {
    const result = transactionBodySchema.safeParse({ ...base, type: 'transfer' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-UUID categoryId', () => {
    const result = transactionBodySchema.safeParse({ ...base, categoryId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field (mass-assignment guard)', () => {
    const result = transactionBodySchema.safeParse({ ...base, userId: 'someone-elses-id' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing required field', () => {
    const { amount, ...withoutAmount } = base;
    expect(transactionBodySchema.safeParse(withoutAmount).success).toBe(false);
  });
});

describe('transactionListQuerySchema', () => {
  it('defaults page and pageSize', () => {
    const result = transactionListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ page: 1, pageSize: 20 });
  });

  it('coerces page/pageSize from query-string values', () => {
    const result = transactionListQuerySchema.safeParse({ page: '2', pageSize: '10' });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ page: 2, pageSize: 10 });
  });

  it('rejects a pageSize above the max', () => {
    expect(transactionListQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
  });

  it('rejects a malformed month', () => {
    expect(transactionListQuerySchema.safeParse({ month: '2026-13' }).success).toBe(false);
  });
});
