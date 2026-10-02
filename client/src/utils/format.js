import { format, parseISO } from 'date-fns';

/** Falls back to a plain "amount CUR" string if `currency` isn't a currency Intl recognizes. */
export function formatMoney(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${Number(amount).toFixed(2)} ${currency}`;
  }
}

/** `dateStr` is a 'YYYY-MM-DD' string (see server/src/utils/dates.js for why no Date object). */
export function formatDate(dateStr) {
  return format(parseISO(dateStr), 'd MMM yyyy');
}

/** Compact form for chart axes, e.g. 150000 -> "₹150K" (locale-dependent). Same fallback as formatMoney. */
export function formatCompactMoney(amount, currency = 'INR') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return `${Number(amount)} ${currency}`;
  }
}

/** Like formatMoney but always shows a sign, e.g. "+₹1,000.00" / "-₹1,000.00" (0 has no sign). */
export function formatSignedMoney(amount, currency = 'INR') {
  const formatted = formatMoney(amount, currency);
  return amount > 0 ? `+${formatted}` : formatted;
}

/** Short date for chart axes: '2026-03-05' -> '5 Mar 26'. */
export function formatShortDate(dateStr) {
  return format(parseISO(dateStr), 'd MMM yy');
}

/** 'YYYY-MM' -> 'September 2026'. */
export function formatMonthLabel(month) {
  return format(parseISO(`${month}-01`), 'MMMM yyyy');
}
