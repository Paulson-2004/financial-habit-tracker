import { describe, expect, it } from 'vitest';
import { feedbackFormSchema } from '../schemas/feedbackSchemas.js';

describe('feedbackFormSchema', () => {
  it('accepts a valid feedback submission', () => {
    const result = feedbackFormSchema.safeParse({
      type: 'feedback',
      subject: 'Love the app',
      message: 'The transaction tracker is really easy to use.',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown type', () => {
    const result = feedbackFormSchema.safeParse({
      type: 'praise',
      subject: 'Love the app',
      message: 'The transaction tracker is really easy to use.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short subject and a short message', () => {
    expect(feedbackFormSchema.safeParse({ type: 'complaint', subject: 'Hi', message: 'long enough message here' }).success).toBe(
      false,
    );
    expect(feedbackFormSchema.safeParse({ type: 'complaint', subject: 'Valid subject', message: 'short' }).success).toBe(
      false,
    );
  });
});
