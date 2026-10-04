import { describe, expect, it } from 'vitest';
import { habitFormSchema } from '../schemas/habitSchemas.js';

describe('habitFormSchema', () => {
  const base = {
    name: 'Save daily',
    description: '',
    category: 'saving',
    frequency: 'daily',
    reminderEnabled: false,
    reminderTime: '20:00',
  };

  it('accepts a valid habit', () => {
    expect(habitFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts valid frequencies (daily, weekly, monthly)', () => {
    expect(habitFormSchema.safeParse({ ...base, frequency: 'daily' }).success).toBe(true);
    expect(habitFormSchema.safeParse({ ...base, frequency: 'weekly' }).success).toBe(true);
    expect(habitFormSchema.safeParse({ ...base, frequency: 'monthly' }).success).toBe(true);
  });

  it('rejects an invalid frequency', () => {
    expect(habitFormSchema.safeParse({ ...base, frequency: 'yearly' }).success).toBe(false);
  });

  it('accepts valid reminder settings', () => {
    expect(
      habitFormSchema.safeParse({ ...base, reminderEnabled: true, reminderTime: '08:30' }).success,
    ).toBe(true);
    expect(
      habitFormSchema.safeParse({ ...base, reminderEnabled: false, reminderTime: '' }).success,
    ).toBe(true);
  });

  it('rejects invalid reminder times', () => {
    expect(
      habitFormSchema.safeParse({ ...base, reminderEnabled: true, reminderTime: '25:00' }).success,
    ).toBe(false);
    expect(
      habitFormSchema.safeParse({ ...base, reminderEnabled: true, reminderTime: '9:00' }).success,
    ).toBe(false);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(habitFormSchema.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid category', () => {
    expect(habitFormSchema.safeParse({ ...base, category: 'trading' }).success).toBe(false);
  });
});
