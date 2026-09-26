// Pure functions only - no pg/Express imports (see AGENTS.md section 4 and 8). See
// docs/business-rules.md for the exact definitions these implement.

function roundTo(value, decimals) {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * remainingAmount is never negative (an overfunded goal has nothing left to save, not a
 * negative requirement) and progressPercent is capped at 100 for display, while the
 * actual contributed amount is always reported separately, unclamped, by the caller -
 * see overfundedBy below for how much a goal has been overfunded by.
 */
export function computeGoalProgress(targetAmount, contributedAmount) {
  const remainingAmount = roundTo(Math.max(0, targetAmount - contributedAmount), 2);
  const progressPercent = targetAmount > 0 ? roundTo(Math.min(100, (contributedAmount / targetAmount) * 100), 1) : 0;
  const overfundedBy = roundTo(Math.max(0, contributedAmount - targetAmount), 2);
  return { remainingAmount, progressPercent, overfundedBy };
}

/**
 * 'completed' once contributions reach the target, regardless of the target date.
 * 'overdue' if a target date is set, has passed, and the goal isn't completed.
 * 'in_progress' otherwise. Order matters: completion is checked first, so a goal
 * completed after its target date is 'completed', not 'overdue'.
 */
export function computeGoalStatus({ contributedAmount, targetAmount, targetDate, today }) {
  if (contributedAmount >= targetAmount) return 'completed';
  if (targetDate && targetDate < today) return 'overdue';
  return 'in_progress';
}
