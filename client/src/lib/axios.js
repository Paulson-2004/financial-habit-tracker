import axios from 'axios';

// In dev, Vite proxies /api to the backend (see vite.config.js). In production,
// VITE_API_URL points straight at the deployed API (see .env.example).
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL, timeout: 15_000 });

const TOKEN_KEY = 'wealth_tracker_token';
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Normalizes every error to { status, code, message, fieldErrors } so components
// never have to know axios's or the API's response shape.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const body = error.response?.data?.error;

    if (status === 401) {
      tokenStorage.clear();
      // A full reload clears all in-memory auth/query state along with the stale token.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    const fieldErrors = {};
    for (const detail of body?.details ?? []) {
      if (detail.field) fieldErrors[detail.field] = detail.message;
    }

    return Promise.reject({
      status: status ?? 0,
      code: body?.code ?? (status ? 'UNKNOWN_ERROR' : 'NETWORK_ERROR'),
      message: body?.message ?? (status ? 'Something went wrong.' : 'Network error. Please check your connection.'),
      fieldErrors,
    });
  },
);
