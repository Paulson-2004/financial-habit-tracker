import { describe, expect, it } from 'vitest';
import { habitBodySchema, habitTodayQuerySchema, markCompletionBodySchema } from '../../src/validators/habitValidators.js';

describe('habitBodySchema', () => {
  it('accepts a minimal valid habit', () => {
    expect(habitBodySchema.safeParse({ name: 'Save daily' }).success).toBe(true);
  });

  it('accepts an optional description and category', () => {
    const result = habitBodySchema.safeParse({ name: 'Save daily', description: 'Put aside $5', category: 'saving' });
    expect(result.success).toBe(true);
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(habitBodySchema.safeParse({ name: 'A' }).success).toBe(false);
  });

  it('rejects an invalid category', () => {
    expect(habitBodySchema.safeParse({ name: 'Save daily', category: 'trading' }).success).toBe(false);
  });

  it('accepts valid frequencies (daily, weekly, monthly)', () => {
    expect(habitBodySchema.safeParse({ name: 'Save daily', frequency: 'daily' }).success).toBe(true);
    expect(habitBodySchema.safeParse({ name: 'Save daily', frequency: 'weekly' }).success).toBe(true);
    expect(habitBodySchema.safeParse({ name: 'Save daily', frequency: 'monthly' }).success).toBe(true);
  });

  it('rejects an invalid frequency', () => {
    expect(habitBodySchema.safeParse({ name: 'Save daily', frequency: 'yearly' }).success).toBe(false);
    expect(habitBodySchema.safeParse({ name: 'Save daily', frequency: 'hourly' }).success).toBe(false);
  });

  it('accepts optional reminder settings', () => {
    expect(
      habitBodySchema.safeParse({ name: 'Save daily', reminderEnabled: true, reminderTime: '09:00' }).success,
    ).toBe(true);
    expect(
      habitBodySchema.safeParse({ name: 'Save daily', reminderEnabled: false, reminderTime: null }).success,
    ).toBe(true);
  });

  it('rejects an invalid reminder time format', () => {
    expect(
      habitBodySchema.safeParse({ name: 'Save daily', reminderEnabled: true, reminderTime: '25:00' }).success,
    ).toBe(false);
    expect(
      habitBodySchema.safeParse({ name: 'Save daily', reminderEnabled: true, reminderTime: '9:00' }).success,
    ).toBe(false);
  });

  it('rejects an unknown field, e.g. a client-supplied isActive', () => {
    expect(habitBodySchema.safeParse({ name: 'Save daily', isActive: false }).success).toBe(false);
    expect(habitBodySchema.safeParse({ name: 'Save daily', foo: 'bar' }).success).toBe(false);
  });
});

describe('habitTodayQuerySchema', () => {
  it('accepts an omitted today', () => {
    expect(habitTodayQuerySchema.safeParse({}).success).toBe(true);
  });

  it('accepts a well-formed date', () => {
    expect(habitTodayQuerySchema.safeParse({ today: '2026-03-05' }).success).toBe(true);
  });

  it('rejects a malformed date', () => {
    expect(habitTodayQuerySchema.safeParse({ today: '03/05/2026' }).success).toBe(false);
  });
});

describe('markCompletionBodySchema', () => {
  it('accepts a valid recent date', () => {
    expect(markCompletionBodySchema.safeParse({ date: '2026-01-15' }).success).toBe(true);
  });

  it('rejects a date far in the future', () => {
    expect(markCompletionBodySchema.safeParse({ date: '2099-01-01' }).success).toBe(false);
  });

  it('rejects a missing date', () => {
    expect(markCompletionBodySchema.safeParse({}).success).toBe(false);
  });
});
