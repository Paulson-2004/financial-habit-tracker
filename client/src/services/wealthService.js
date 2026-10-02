import { api } from '../lib/axios.js';

export async function fetchWealthSummary() {
  const { data } = await api.get('/wealth/summary');
  return data.data;
}

/** Takes no body: the server records TODAY's totals from your current assets/liabilities. */
export async function recordSnapshot() {
  const { data } = await api.post('/wealth/snapshots');
  return data.data;
}
