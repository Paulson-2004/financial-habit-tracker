// Pure functions only - no pg/Express imports (see AGENTS.md section 4 and 8). These back
// GET /api/habits' completedToday/currentStreak/longestStreak fields; see docs/business-rules.md.
import {
  addDaysUTC,
  getNextMonth,
  getPeriodKey,
  getPreviousMonth,
  getWeekStartUTC,
  isNextCalendarDay,
} from '../utils/dates.js';

/**
 * True if `completionDates` contains a completion for the period containing `today`.
 * Works across 'daily', 'weekly', and 'monthly'.
 */
export function isCompletedCurrentPeriod(completionDates, today, frequency = 'daily') {
  const targetPeriod = getPeriodKey(today, frequency);
  const completedPeriods = new Set(completionDates.map((d) => getPeriodKey(d, frequency)));
  return completedPeriods.has(targetPeriod);
}

/** Backward-compatible alias for daily habits. */
export function isCompletedToday(completionDates, today) {
  return isCompletedCurrentPeriod(completionDates, today, 'daily');
}

/**
 * Current streak = consecutive completed periods ending at current period (if completed)
 * or the immediately preceding period (if current is not completed).
 * An incomplete current period never breaks a streak by itself.
 */
export function computeCurrentStreak(completionDates, today, frequency = 'daily') {
  if (frequency === 'weekly') {
    const completedWeeks = new Set(completionDates.map((d) => getWeekStartUTC(d)));
    const thisWeek = getWeekStartUTC(today);
    const lastWeek = addDaysUTC(thisWeek, -7);

    let cursor = completedWeeks.has(thisWeek) ? thisWeek : lastWeek;
    let streak = 0;
    while (completedWeeks.has(cursor)) {
      streak += 1;
      cursor = addDaysUTC(cursor, -7);
    }
    return streak;
  }

  if (frequency === 'monthly') {
    const completedMonths = new Set(completionDates.map((d) => d.slice(0, 7)));
    const thisMonth = today.slice(0, 7);
    const lastMonth = getPreviousMonth(thisMonth);

    let cursor = completedMonths.has(thisMonth) ? thisMonth : lastMonth;
    let streak = 0;
    while (completedMonths.has(cursor)) {
      streak += 1;
      cursor = getPreviousMonth(cursor);
    }
    return streak;
  }

  // Daily (default)
  const completedDays = new Set(completionDates);
  let cursor = completedDays.has(today) ? today : addDaysUTC(today, -1);
  let streak = 0;
  while (completedDays.has(cursor)) {
    streak += 1;
    cursor = addDaysUTC(cursor, -1);
  }
  return streak;
}

/**
 * Longest streak = longest run of consecutive periods anywhere in completion history.
 * Duplicates within the same period are collapsed.
 */
export function computeLongestStreak(completionDates, frequency = 'daily') {
  if (frequency === 'weekly') {
    const sortedUniqueWeeks = [...new Set(completionDates.map((d) => getWeekStartUTC(d)))].sort();
    if (sortedUniqueWeeks.length === 0) return 0;

    let longest = 1;
    let current = 1;
    for (let i = 1; i < sortedUniqueWeeks.length; i += 1) {
      const prevWeek = sortedUniqueWeeks[i - 1];
      const nextExpected = addDaysUTC(prevWeek, 7);
      current = sortedUniqueWeeks[i] === nextExpected ? current + 1 : 1;
      longest = Math.max(longest, current);
    }
    return longest;
  }

  if (frequency === 'monthly') {
    const sortedUniqueMonths = [...new Set(completionDates.map((d) => d.slice(0, 7)))].sort();
    if (sortedUniqueMonths.length === 0) return 0;

    let longest = 1;
    let current = 1;
    for (let i = 1; i < sortedUniqueMonths.length; i += 1) {
      const prevMonth = sortedUniqueMonths[i - 1];
      const nextExpected = getNextMonth(prevMonth);
      current = sortedUniqueMonths[i] === nextExpected ? current + 1 : 1;
      longest = Math.max(longest, current);
    }
    return longest;
  }

  // Daily (default)
  const sortedUnique = [...new Set(completionDates)].sort();
  if (sortedUnique.length === 0) return 0;

  let longest = 1;
  let current = 1;
  for (let i = 1; i < sortedUnique.length; i += 1) {
    current = isNextCalendarDay(sortedUnique[i - 1], sortedUnique[i]) ? current + 1 : 1;
    longest = Math.max(longest, current);
  }
  return longest;
}

