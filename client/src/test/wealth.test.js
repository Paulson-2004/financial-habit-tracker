import { describe, expect, it } from 'vitest';
import { amountTone, describeNetWorthChange, formatSignedPercent, toBreakdownSlices } from '../utils/wealth.js';

describe('amountTone', () => {
  it('is positive for a positive amount', () => {
    expect(amountTone(5)).toBe('positive');
  });
  it('is negative for a negative amount', () => {
    expect(amountTone(-5)).toBe('negative');
  });
  it('is neutral for exactly 0', () => {
    expect(amountTone(0)).toBe('neutral');
  });
});

describe('formatSignedPercent', () => {
  it('prefixes a positive percent with +', () => {
    expect(formatSignedPercent(20)).toBe('+20%');
  });
  it('keeps the - for a negative percent (no double sign)', () => {
    expect(formatSignedPercent(-20)).toBe('-20%');
  });
  it('shows 0% for exactly 0 (a real, meaningful rate - not treated as missing)', () => {
    expect(formatSignedPercent(0)).toBe('0%');
  });
  it('shows an em dash for a null percent (undefined, not zero)', () => {
    expect(formatSignedPercent(null)).toBe('—');
  });
});

describe('toBreakdownSlices', () => {
  it('maps server breakdown rows to labeled chart slices', () => {
    const result = toBreakdownSlices(
      [{ category: 'stocks', amount: 5000, percent: 50 }],
      { stocks: 'Stocks' },
    );
    expect(result).toEqual([{ key: 'stocks', name: 'Stocks', value: 5000, percent: 50 }]);
  });

  it('falls back to the raw category as the name when no label is provided', () => {
    const result = toBreakdownSlices([{ category: 'unknown_thing', amount: 1, percent: 0 }], {});
    expect(result[0].name).toBe('unknown_thing');
  });

  it('is an empty array for an empty breakdown', () => {
    expect(toBreakdownSlices([], {})).toEqual([]);
  });
});

describe('describeNetWorthChange', () => {
  it('prompts recording a snapshot when there is no prior value', () => {
    expect(describeNetWorthChange({ amount: null, percent: null }, 'INR')).toBe('Record a snapshot to track changes');
  });

  it('includes both the amount and percent when both are available', () => {
    const result = describeNetWorthChange({ amount: 1000, percent: 20 }, 'INR');
    expect(result).toContain('(+20%)');
    expect(result).toContain('since last snapshot');
  });

  it('omits the percent when the prior value was 0 (percent is null, amount is not)', () => {
    const result = describeNetWorthChange({ amount: 6000, percent: null }, 'INR');
    expect(result).not.toContain('(');
    expect(result).toContain('since last snapshot');
  });
});
