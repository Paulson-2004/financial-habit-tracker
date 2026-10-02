import { api } from '../lib/axios.js';

export async function fetchAssets() {
  const { data } = await api.get('/assets');
  return data.data;
}

export async function createAsset(payload) {
  const { data } = await api.post('/assets', payload);
  return data.data;
}

export async function updateAsset(id, payload) {
  const { data } = await api.patch(`/assets/${id}`, payload);
  return data.data;
}

export async function deleteAsset(id) {
  await api.delete(`/assets/${id}`);
}
