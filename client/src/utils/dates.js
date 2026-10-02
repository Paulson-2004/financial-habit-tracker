/**
 * The browser's LOCAL calendar date, as 'YYYY-MM-DD' - NOT UTC (unlike
 * Date#toISOString, which is UTC and can be a day off from the user's own calendar day).
 * Sent to the server as ?today= for habits, so streaks are computed relative to the
 * user's own calendar day rather than the server's - see server/src/utils/dates.js and
 * docs/business-rules.md.
 */
export function localToday() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** The browser's LOCAL calendar month as 'YYYY-MM' (see localToday for why local, not UTC). */
export function currentLocalMonth() {
  return localToday().slice(0, 7);
}
