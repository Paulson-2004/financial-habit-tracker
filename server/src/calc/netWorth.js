// Pure functions only - no pg/Express imports (see AGENTS.md section 4 and 8). See
// docs/business-rules.md for the exact definitions these implement. Net worth is derived
// only from assets/liabilities - never from transactions or goal_contributions (see the
// three-ledger model, docs/business-rules.md section 1).
import { computeCategoryPercent } from './summary.js';

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  // Guards against binary floating-point artifacts (e.g. 0.1 + 0.2) before rounding.
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function sumBy(rows, key) {
  return rows.reduce((sum, row) => sum + row[key], 0);
}

/** Total value of a list of assets (each `{ value, ... }`). 0 for an empty list. */
export function calculateTotalAssets(assets) {
  return roundTo(sumBy(assets, 'value'), 2);
}

/** Total outstanding balance of a list of liabilities (each `{ amount, ... }`). 0 for an empty list. */
export function calculateTotalLiabilities(liabilities) {
  return roundTo(sumBy(liabilities, 'amount'), 2);
}

/** Net worth = total assets - total liabilities. Can be negative - never clamped to 0. */
export function calculateNetWorth(totalAssets, totalLiabilities) {
  return roundTo(totalAssets - totalLiabilities, 2);
}

/**
 * Change vs a prior net worth value (typically the most recent snapshot). `percent` is
 * `null` when there is no prior value to compare against, or the prior value is exactly
 * 0 - a percentage change *from* zero is undefined, not infinite or 0, so this never
 * divides by zero. `amount` can still be reported (and can be negative) even when
 * `percent` is null.
 */
export function calculateNetWorthChange(currentNetWorth, previousNetWorth) {
  if (previousNetWorth === null || previousNetWorth === undefined) {
    return { amount: null, percent: null };
  }
  const amount = roundTo(currentNetWorth - previousNetWorth, 2);
  const percent = previousNetWorth === 0 ? null : roundTo((amount / Math.abs(previousNetWorth)) * 100, 1);
  return { amount, percent };
}

function rankedBreakdown(rows, amountKey, total) {
  const totals = new Map();
  for (const row of rows) {
    totals.set(row.category, (totals.get(row.category) ?? 0) + row[amountKey]);
  }
  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      amount: roundTo(amount, 2),
      percent: computeCategoryPercent(amount, total),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/** Assets grouped by category, ranked by value descending, each with its % of total assets. */
export function computeAssetAllocation(assets) {
  return rankedBreakdown(assets, 'value', calculateTotalAssets(assets));
}

/** Liabilities grouped by category, ranked by amount descending, each with its % of total liabilities. */
export function computeLiabilityBreakdown(liabilities) {
  return rankedBreakdown(liabilities, 'amount', calculateTotalLiabilities(liabilities));
}
