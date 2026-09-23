import { api } from '../lib/axios.js';

export async function fetchCategories(type) {
  const { data } = await api.get('/transactions/categories', { params: type ? { type } : undefined });
  return data.data;
}

export async function fetchTransactions(filters) {
  const { data } = await api.get('/transactions', { params: filters });
  return data; // { data, meta, totals }
}

export async function fetchTransactionSummary(month) {
  const { data } = await api.get('/transactions/summary', { params: month ? { month } : undefined });
  return data.data;
}

export async function createTransaction(payload) {
  const { data } = await api.post('/transactions', payload);
  return data.data;
}

export async function updateTransaction(id, payload) {
  const { data } = await api.put(`/transactions/${id}`, payload);
  return data.data;
}

export async function deleteTransaction(id) {
  await api.delete(`/transactions/${id}`);
}
