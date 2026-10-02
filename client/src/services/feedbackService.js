import { api } from '../lib/axios.js';

export async function fetchMyFeedback(params) {
  const { data } = await api.get('/feedback/mine', { params });
  return data; // { data, meta }
}

export async function createFeedback(payload) {
  const { data } = await api.post('/feedback', payload);
  return data.data;
}
