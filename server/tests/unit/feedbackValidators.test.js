import { describe, expect, it } from 'vitest';
import { createFeedbackSchema } from '../../src/validators/feedbackValidators.js';

describe('createFeedbackSchema', () => {
  const base = { type: 'feedback', subject: 'Great app', message: 'I really like the dashboard so far.' };

  it('accepts a valid submission', () => {
    expect(createFeedbackSchema.safeParse(base).success).toBe(true);
  });

  it('accepts type "complaint"', () => {
    expect(createFeedbackSchema.safeParse({ ...base, type: 'complaint' }).success).toBe(true);
  });

  it('rejects an invalid type', () => {
    expect(createFeedbackSchema.safeParse({ ...base, type: 'bug_report' }).success).toBe(false);
  });

  it('rejects a message shorter than 10 characters', () => {
    expect(createFeedbackSchema.safeParse({ ...base, message: 'too short' }).success).toBe(false);
  });

  it('rejects a subject shorter than 3 characters', () => {
    expect(createFeedbackSchema.safeParse({ ...base, subject: 'Hi' }).success).toBe(false);
  });

  it('rejects a message over 2000 characters', () => {
    expect(createFeedbackSchema.safeParse({ ...base, message: 'x'.repeat(2001) }).success).toBe(false);
  });

  it('rejects an unknown field, e.g. a client-supplied status', () => {
    expect(createFeedbackSchema.safeParse({ ...base, status: 'resolved' }).success).toBe(false);
  });
});
