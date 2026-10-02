// Presentation helpers only. All wealth CALCULATIONS (totals, net worth, allocation
// percentages, change) happen server-side in server/src/calc/netWorth.js and arrive
// ready to display - the client never recomputes them (AGENTS.md section 8).
import { formatSignedMoney } from './format.js';

/** Maps a server breakdown ([{ category, amount, percent }]) to labeled chart slices. */
export function toBreakdownSlices(breakdown, labels) {
  return breakdown.map((item) => ({
    key: item.category,
    name: labels[item.category] ?? item.category,
    value: item.amount,
    percent: item.percent,
  }));
}

/** 'positive' | 'negative' | 'neutral' - for coloring a signed amount. */
export function amountTone(amount) {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
}

/** "+20%" / "-20%" / "0%", or an em dash when the percent is undefined (null). */
export function formatSignedPercent(percent) {
  if (percent === null || percent === undefined) return '—';
  return `${percent > 0 ? '+' : ''}${percent}%`;
}

/** One-line description of the server's netWorthChange ({ amount, percent }). */
export function describeNetWorthChange(change, currency) {
  if (change.amount === null) return 'Record a snapshot to track changes';
  const parts = [formatSignedMoney(change.amount, currency)];
  if (change.percent !== null) parts.push(`(${formatSignedPercent(change.percent)})`);
  return `${parts.join(' ')} since last snapshot`;
}
