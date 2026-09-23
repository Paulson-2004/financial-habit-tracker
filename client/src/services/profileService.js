import { api } from '../lib/axios.js';

export async function fetchProfile() {
  const { data } = await api.get('/users/me');
  return data.data.profile;
}

export async function updateProfileRequest(payload) {
  const { data } = await api.patch('/users/me', payload);
  return data.data.profile;
}
