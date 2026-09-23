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
