import { describe, expect, it } from 'vitest';
import { createLiabilitySchema, updateLiabilitySchema } from '../../src/validators/liabilityValidators.js';

describe('createLiabilitySchema', () => {
  const base = { name: 'Car loan', category: 'vehicle_loan', amount: 200000 };

  it('accepts a valid liability', () => {
    expect(createLiabilitySchema.safeParse(base).success).toBe(true);
  });

  it('accepts an omitted category (defaults server-side to "other")', () => {
    const { category, ...withoutCategory } = base;
    expect(createLiabilitySchema.safeParse(withoutCategory).success).toBe(true);
  });

  it('rejects an invalid category', () => {
    expect(createLiabilitySchema.safeParse({ ...base, category: 'overdraft' }).success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(createLiabilitySchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(createLiabilitySchema.safeParse({ ...base, amount: -500 }).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(createLiabilitySchema.safeParse({ ...base, status: 'paid' }).success).toBe(false);
  });
});

describe('updateLiabilitySchema', () => {
  it('accepts a single-field partial update', () => {
    expect(updateLiabilitySchema.safeParse({ amount: 150000 }).success).toBe(true);
  });

  it('rejects an empty body (at least one field required)', () => {
    expect(updateLiabilitySchema.safeParse({}).success).toBe(false);
  });
});
