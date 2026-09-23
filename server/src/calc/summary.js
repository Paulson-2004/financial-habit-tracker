// Pure functions only - no pg/Express imports (see AGENTS.md section 4 and 8). These are
// the definitions behind /api/transactions/summary; see docs/business-rules.md.

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  // Guards against binary floating-point artifacts (e.g. 0.1 + 0.2) before rounding.
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Net savings = total income - total expenses. Can be negative (a deficit). */
export function computeNetSavings(income, expenses) {
  return roundTo(income - expenses, 2);
}

/**
 * Savings rate = netSavings / income * 100, as a percentage. Undefined when there is no
 * income to take a rate of - returns null rather than dividing by zero (see
 * docs/business-rules.md). Income is never negative by construction (transaction amounts
 * are constrained > 0 at the database level), but the <= 0 check is defensive.
 */
export function computeSavingsRate(income, netSavings) {
  if (income <= 0) return null;
  return roundTo((netSavings / income) * 100, 1);
}

/** One category's share of its type's total, as a percentage. 0 when the total is 0. */
export function computeCategoryPercent(categoryAmount, typeTotal) {
  if (!typeTotal) return 0;
  return roundTo((categoryAmount / typeTotal) * 100, 1);
}
