import { describe, expect, it } from 'vitest';
import { habitFormSchema } from '../schemas/habitSchemas.js';

describe('habitFormSchema', () => {
  const base = { name: 'Save daily', description: '', category: 'saving' };

  it('accepts a valid habit', () => {
    expect(habitFormSchema.safeParse(base).success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(habitFormSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid category', () => {
    expect(habitFormSchema.safeParse({ ...base, category: 'trading' }).success).toBe(false);
  });
});
