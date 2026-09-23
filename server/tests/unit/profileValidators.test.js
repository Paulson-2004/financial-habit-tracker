import { describe, expect, it } from 'vitest';
import { currencySchema, updateProfileSchema } from '../../src/validators/profileValidators.js';

describe('currencySchema', () => {
  it('accepts and uppercases a 3-letter code', () => {
    const result = currencySchema.safeParse('usd');
    expect(result.success).toBe(true);
    expect(result.data).toBe('USD');
  });

  it('rejects a code that is not 3 letters', () => {
    expect(currencySchema.safeParse('US$').success).toBe(false);
    expect(currencySchema.safeParse('US').success).toBe(false);
  });
});

describe('updateProfileSchema', () => {
  it('accepts a partial update', () => {
    expect(updateProfileSchema.safeParse({ monthlyBudget: 2000 }).success).toBe(true);
  });

  it('rejects an empty body (at least one field required)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a negative budget', () => {
    expect(updateProfileSchema.safeParse({ monthlyBudget: -100 }).success).toBe(false);
  });

  it('rejects a negative savings target', () => {
    expect(updateProfileSchema.safeParse({ monthlySavingsTarget: -1 }).success).toBe(false);
  });

  it('allows explicitly clearing a field with null', () => {
    expect(updateProfileSchema.safeParse({ monthlyBudget: null }).success).toBe(true);
  });

  it('rejects an occupation over the length limit', () => {
    expect(updateProfileSchema.safeParse({ occupation: 'x'.repeat(81) }).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(updateProfileSchema.safeParse({ favoriteColor: 'blue' }).success).toBe(false);
  });
});
