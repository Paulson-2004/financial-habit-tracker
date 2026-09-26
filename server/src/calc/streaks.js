// Pure functions only - no pg/Express imports (see AGENTS.md section 4 and 8). These back
// GET /api/habits' completedToday/currentStreak/longestStreak fields; see docs/business-rules.md.
import { addDaysUTC, isNextCalendarDay } from '../utils/dates.js';

/** True if `completionDates` contains `today`. */
export function isCompletedToday(completionDates, today) {
  return completionDates.includes(today);
}

/**
 * Current streak = the number of consecutive completed days ending at "today" if today
 * is completed, otherwise ending at "yesterday." An incomplete "today" never breaks a
 * streak by itself - it simply isn't counted yet. If neither today nor yesterday is
 * completed, the streak is 0 (it has lapsed). Order of `completionDates` doesn't matter.
 */
export function computeCurrentStreak(completionDates, today) {
  const completed = new Set(completionDates);
  let cursor = completed.has(today) ? today : addDaysUTC(today, -1);
  let streak = 0;

  while (completed.has(cursor)) {
    streak += 1;
    cursor = addDaysUTC(cursor, -1);
  }
  return streak;
}

/**
 * Longest streak = the longest run of consecutive calendar dates anywhere in the
 * completion history (not just the run touching "today"). Duplicate dates are ignored.
 * Order of `completionDates` doesn't matter.
 */
export function computeLongestStreak(completionDates) {
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
