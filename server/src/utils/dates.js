// Calendar-day helpers for 'YYYY-MM-DD' strings (never JS Date objects - see the DATE
// type-parser comment in db/pool.js for why). Lexical string comparison of zero-padded
// ISO dates is the same as chronological comparison, so these stay simple string ops.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Transactions predating this are almost certainly a typo (wrong century, etc).
export const MIN_TRANSACTION_DATE = '2000-01-01';

/** True only for a real calendar date in 'YYYY-MM-DD' form (rejects e.g. 2024-02-30). */
export function isValidCalendarDateString(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Today's date in the server's UTC calendar, as 'YYYY-MM-DD'. */
export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

/** Adds (or subtracts, with a negative value) whole days to a 'YYYY-MM-DD' string. */
export function addDaysUTC(dateStr, days) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/**
 * Business rule: a transaction date must be a real calendar date, on or after
 * MIN_TRANSACTION_DATE, and at most one day ahead of the server's UTC "today" - the one
 * day of slack tolerates a client whose local calendar day (in a timezone ahead of UTC)
 * is already "tomorrow" in UTC. See docs/business-rules.md.
 */
export function isWithinTransactionDateRange(value, today = todayUTC()) {
  if (!isValidCalendarDateString(value)) return false;
  if (value < MIN_TRANSACTION_DATE) return false;
  return value <= addDaysUTC(today, 1);
}

/** First day of a 'YYYY-MM' month, as 'YYYY-MM-DD'. */
export function monthStart(month) {
  return `${month}-01`;
}

/** First day of the month AFTER a 'YYYY-MM' month (the exclusive end of a half-open range). */
export function monthEndExclusive(month) {
  const [year, m] = month.split('-').map(Number);
  const nextMonth = m === 12 ? 1 : m + 1;
  const nextYear = m === 12 ? year + 1 : year;
  return `${String(nextYear).padStart(4, '0')}-${String(nextMonth).padStart(2, '0')}-01`;
}

/**
 * Last calendar day of a 'YYYY-MM' month (inclusive), e.g. '2026-02' -> '2026-02-28'.
 * Use this (not monthEndExclusive) anywhere a filter compares with <= rather than < -
 * see the listTransactions callers in services/transactionService.js.
 */
export function monthEnd(month) {
  return addDaysUTC(monthEndExclusive(month), -1);
}

/** The current month as 'YYYY-MM', in the server's UTC calendar. */
export function currentMonth() {
  return todayUTC().slice(0, 7);
}
