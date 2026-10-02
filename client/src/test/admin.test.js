import { describe, expect, it } from 'vitest';
import { feedbackStatusLabel, feedbackStatusTone, userStatusLabel, userStatusTone } from '../utils/admin.js';

describe('feedbackStatusLabel', () => {
  it('labels every known status', () => {
    expect(feedbackStatusLabel('open')).toBe('Open');
    expect(feedbackStatusLabel('in_review')).toBe('In review');
    expect(feedbackStatusLabel('resolved')).toBe('Resolved');
  });

  it('falls back to the raw value for an unknown status', () => {
    expect(feedbackStatusLabel('archived')).toBe('archived');
  });
});

describe('feedbackStatusTone', () => {
  it('returns a distinct badge class per status', () => {
    const tones = new Set([feedbackStatusTone('open'), feedbackStatusTone('in_review'), feedbackStatusTone('resolved')]);
    expect(tones.size).toBe(3);
  });

  it('falls back to a neutral class for an unknown status', () => {
    expect(feedbackStatusTone('archived')).toContain('slate');
  });
});

describe('userStatusLabel / userStatusTone', () => {
  it('distinguishes active from disabled accounts', () => {
    expect(userStatusLabel(true)).toBe('Active');
    expect(userStatusLabel(false)).toBe('Disabled');
    expect(userStatusTone(true)).not.toBe(userStatusTone(false));
  });
});
