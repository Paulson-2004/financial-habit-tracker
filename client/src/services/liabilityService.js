import { api } from '../lib/axios.js';

export async function fetchLiabilities() {
  const { data } = await api.get('/liabilities');
  return data.data;
}

export async function createLiability(payload) {
  const { data } = await api.post('/liabilities', payload);
  return data.data;
}

export async function updateLiability(id, payload) {
  const { data } = await api.patch(`/liabilities/${id}`, payload);
  return data.data;
}

export async function deleteLiability(id) {
  await api.delete(`/liabilities/${id}`);
}
