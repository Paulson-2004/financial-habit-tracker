import { api } from '../lib/axios.js';

export async function fetchGoals() {
  const { data } = await api.get('/goals');
  return data.data;
}

export async function createGoal(payload) {
  const { data } = await api.post('/goals', payload);
  return data.data;
}

export async function updateGoal(id, payload) {
  const { data } = await api.put(`/goals/${id}`, payload);
  return data.data;
}

export async function deleteGoal(id) {
  await api.delete(`/goals/${id}`);
}

export async function fetchContributions(goalId) {
  const { data } = await api.get(`/goals/${goalId}/contributions`);
  return data.data;
}

export async function addContribution(goalId, payload) {
  const { data } = await api.post(`/goals/${goalId}/contributions`, payload);
  return data.data; // { contribution, goal }
}

export async function deleteContribution(goalId, contributionId) {
  const { data } = await api.delete(`/goals/${goalId}/contributions/${contributionId}`);
  return data.data; // { goal }
}
