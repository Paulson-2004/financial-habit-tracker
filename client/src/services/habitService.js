import { api } from '../lib/axios.js';

export async function fetchHabits(today) {
  const { data } = await api.get('/habits', { params: { today } });
  return data.data;
}

export async function createHabit(payload) {
  const { data } = await api.post('/habits', payload);
  return data.data;
}

export async function updateHabit(id, payload) {
  const { data } = await api.put(`/habits/${id}`, payload);
  return data.data;
}

export async function deleteHabit(id) {
  await api.delete(`/habits/${id}`);
}

export async function markCompletion(id, date, today) {
  const { data } = await api.post(`/habits/${id}/completions`, { date }, { params: { today } });
  return data.data;
}

export async function undoCompletion(id, date, today) {
  const { data } = await api.delete(`/habits/${id}/completions/${date}`, { params: { today } });
  return data.data;
}
