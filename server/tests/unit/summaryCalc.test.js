import { describe, expect, it } from 'vitest';
import { computeCategoryPercent, computeNetSavings, computeSavingsRate } from '../../src/calc/summary.js';

// Exact cases from the Day 2 spec, plus the boundary/edge cases it calls out explicitly.
describe('computeNetSavings', () => {
  it('income 50000, expenses 12000 -> 38000', () => {
    expect(computeNetSavings(50000, 12000)).toBe(38000);
  });

  it('income 0, expenses 0 -> 0', () => {
    expect(computeNetSavings(0, 0)).toBe(0);
  });

  it('income 10000, expenses 10000 -> 0', () => {
    expect(computeNetSavings(10000, 10000)).toBe(0);
  });

  it('income 10000, expenses 15000 -> -5000 (a deficit, not clamped to 0)', () => {
    expect(computeNetSavings(10000, 15000)).toBe(-5000);
  });
});

describe('computeSavingsRate', () => {
  it('income 50000, netSavings 38000 -> 76', () => {
    expect(computeSavingsRate(50000, 38000)).toBe(76);
  });

  it('income 0 -> null (never divides by zero)', () => {
    expect(computeSavingsRate(0, 0)).toBeNull();
  });

  it('income 10000, netSavings 0 -> 0 (not null - there was income, the rate is genuinely 0)', () => {
    expect(computeSavingsRate(10000, 0)).toBe(0);
  });

  it('income 10000, netSavings -5000 -> -50 (negative rate for a deficit)', () => {
    expect(computeSavingsRate(10000, -5000)).toBe(-50);
  });

  it('rounds to 1 decimal place', () => {
    expect(computeSavingsRate(3, 1)).toBeCloseTo(33.3, 5);
  });
});

describe('computeCategoryPercent', () => {
  it('computes a share of the type total, rounded to 1 decimal', () => {
    expect(computeCategoryPercent(2500, 10000)).toBe(25);
    expect(computeCategoryPercent(1000, 3000)).toBeCloseTo(33.3, 5);
  });

  it('returns 0 when the type total is 0 (never divides by zero)', () => {
    expect(computeCategoryPercent(0, 0)).toBe(0);
  });
});
