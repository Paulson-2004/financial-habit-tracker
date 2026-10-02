import { describe, expect, it } from 'vitest';
import { assetFormSchema, liabilityFormSchema } from '../schemas/wealthSchemas.js';

describe('assetFormSchema', () => {
  const base = { name: 'Savings account', category: 'bank_account', value: '50000', description: '' };

  it('accepts a valid asset', () => {
    expect(assetFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty category', () => {
    expect(assetFormSchema.safeParse({ ...base, category: '' }).success).toBe(false);
  });

  it('rejects a zero or negative value', () => {
    expect(assetFormSchema.safeParse({ ...base, value: '0' }).success).toBe(false);
    expect(assetFormSchema.safeParse({ ...base, value: '-100' }).success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(assetFormSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });
});

describe('liabilityFormSchema', () => {
  const base = { name: 'Car loan', category: 'vehicle_loan', amount: '200000', description: '' };

  it('accepts a valid liability', () => {
    expect(liabilityFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty category', () => {
    expect(liabilityFormSchema.safeParse({ ...base, category: '' }).success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(liabilityFormSchema.safeParse({ ...base, amount: '0' }).success).toBe(false);
  });
});
