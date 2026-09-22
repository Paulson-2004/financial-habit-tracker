import { api } from '../lib/axios.js';

export async function registerRequest(payload) {
  const { data } = await api.post('/auth/register', payload);
  return data.data; // { token, user }
}

export async function loginRequest(payload) {
  const { data } = await api.post('/auth/login', payload);
  return data.data; // { token, user }
}

export async function fetchCurrentUser() {
  const { data } = await api.get('/auth/me');
  return data.data.user;
}
