import { describe, expect, it } from 'vitest';
import {
  calculateNetWorth,
  calculateNetWorthChange,
  calculateTotalAssets,
  calculateTotalLiabilities,
  computeAssetAllocation,
  computeLiabilityBreakdown,
} from '../../src/calc/netWorth.js';

describe('calculateTotalAssets', () => {
  it('sums the value of every asset', () => {
    expect(calculateTotalAssets([{ value: 5000 }, { value: 3000 }])).toBe(8000);
  });

  it('is 0 for an empty list', () => {
    expect(calculateTotalAssets([])).toBe(0);
  });
});

describe('calculateTotalLiabilities', () => {
  it('sums the amount of every liability', () => {
    expect(calculateTotalLiabilities([{ amount: 2000 }, { amount: 8000 }])).toBe(10000);
  });

  it('is 0 for an empty list', () => {
    expect(calculateTotalLiabilities([])).toBe(0);
  });
});

describe('calculateNetWorth', () => {
  it('is assets minus liabilities', () => {
    expect(calculateNetWorth(10000, 4000)).toBe(6000);
  });

  it('is 0 when assets equal liabilities', () => {
    expect(calculateNetWorth(10000, 10000)).toBe(0);
  });

  it('can be negative when liabilities exceed assets - never clamped', () => {
    expect(calculateNetWorth(4000, 10000)).toBe(-6000);
  });

  it('is 0 with no assets or liabilities at all', () => {
    expect(calculateNetWorth(0, 0)).toBe(0);
  });
});

describe('calculateNetWorthChange', () => {
  it('is null/null when there is no prior value to compare against', () => {
    expect(calculateNetWorthChange(6000, null)).toEqual({ amount: null, percent: null });
  });

  it('reports the amount but a null percent when the prior value was exactly 0', () => {
    // A percentage change FROM zero is undefined, not infinite or 0 - never divides by zero.
    expect(calculateNetWorthChange(6000, 0)).toEqual({ amount: 6000, percent: null });
  });

  it('computes a positive change', () => {
    expect(calculateNetWorthChange(6000, 5000)).toEqual({ amount: 1000, percent: 20 });
  });

  it('computes a negative change', () => {
    expect(calculateNetWorthChange(4000, 5000)).toEqual({ amount: -1000, percent: -20 });
  });

  it('uses the absolute prior value as the base, so a swing from a negative prior is meaningful', () => {
    expect(calculateNetWorthChange(0, -1000)).toEqual({ amount: 1000, percent: 100 });
  });
});

describe('computeAssetAllocation', () => {
  it('groups by category, ranked descending, with a percent of the total', () => {
    const assets = [{ category: 'cash', value: 2000 }, { category: 'stocks', value: 5000 }, { category: 'gold', value: 3000 }];
    expect(computeAssetAllocation(assets)).toEqual([
      { category: 'stocks', amount: 5000, percent: 50 },
      { category: 'gold', amount: 3000, percent: 30 },
      { category: 'cash', amount: 2000, percent: 20 },
    ]);
  });

  it('sums multiple assets in the same category', () => {
    const assets = [{ category: 'stocks', value: 3000 }, { category: 'stocks', value: 2000 }];
    expect(computeAssetAllocation(assets)).toEqual([{ category: 'stocks', amount: 5000, percent: 100 }]);
  });

  it('is an empty array with no assets', () => {
    expect(computeAssetAllocation([])).toEqual([]);
  });
});

describe('computeLiabilityBreakdown', () => {
  it('groups by category, ranked descending, with a percent of the total', () => {
    const liabilities = [{ category: 'credit_card', amount: 1000 }, { category: 'home_loan', amount: 9000 }];
    expect(computeLiabilityBreakdown(liabilities)).toEqual([
      { category: 'home_loan', amount: 9000, percent: 90 },
      { category: 'credit_card', amount: 1000, percent: 10 },
    ]);
  });

  it('is an empty array with no liabilities', () => {
    expect(computeLiabilityBreakdown([])).toEqual([]);
  });
});
