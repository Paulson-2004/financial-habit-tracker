import { api } from '../lib/axios.js';

export async function fetchAdminOverview() {
  const { data } = await api.get('/admin/overview');
  return data.data;
}

export async function fetchAdminUsers(params) {
  const { data } = await api.get('/admin/users', { params });
  return data; // { data, meta }
}

export async function setUserActive(id, isActive) {
  const { data } = await api.patch(`/admin/users/${id}`, { isActive });
  return data.data;
}

export async function fetchAdminFeedback(params) {
  const { data } = await api.get('/admin/feedback', { params });
  return data; // { data, meta }
}

export async function fetchAdminFeedbackItem(id) {
  const { data } = await api.get(`/admin/feedback/${id}`);
  return data.data;
}

export async function updateAdminFeedback(id, payload) {
  const { data } = await api.patch(`/admin/feedback/${id}`, payload);
  return data.data;
}
