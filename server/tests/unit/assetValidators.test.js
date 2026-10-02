import { describe, expect, it } from 'vitest';
import { createAssetSchema, updateAssetSchema } from '../../src/validators/assetValidators.js';

describe('createAssetSchema', () => {
  const base = { name: 'Savings account', category: 'bank_account', value: 50000 };

  it('accepts a valid asset', () => {
    expect(createAssetSchema.safeParse(base).success).toBe(true);
  });

  it('accepts an omitted category (defaults server-side to "other")', () => {
    const { category, ...withoutCategory } = base;
    expect(createAssetSchema.safeParse(withoutCategory).success).toBe(true);
  });

  it('rejects an invalid category', () => {
    expect(createAssetSchema.safeParse({ ...base, category: 'crypto' }).success).toBe(false);
  });

  it('rejects a zero or negative value', () => {
    expect(createAssetSchema.safeParse({ ...base, value: 0 }).success).toBe(false);
    expect(createAssetSchema.safeParse({ ...base, value: -100 }).success).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(createAssetSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('rejects an unknown field, e.g. a client-supplied userId', () => {
    expect(createAssetSchema.safeParse({ ...base, userId: 'someone-elses-id' }).success).toBe(false);
  });

  it('rejects more than 2 decimal places', () => {
    expect(createAssetSchema.safeParse({ ...base, value: 100.999 }).success).toBe(false);
  });
});

describe('updateAssetSchema', () => {
  it('accepts a single-field partial update', () => {
    expect(updateAssetSchema.safeParse({ value: 60000 }).success).toBe(true);
  });

  it('rejects an empty body (at least one field required)', () => {
    expect(updateAssetSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a negative value even as a partial update', () => {
    expect(updateAssetSchema.safeParse({ value: -1 }).success).toBe(false);
  });
});
