import axios from 'axios';

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

/*
 * The access token lives only in memory (never localStorage), so an XSS payload
 * cannot read a long-lived credential. Sessions survive reloads through the
 * httpOnly refresh-token cookie.
 */
let accessToken = null;
let refreshPromise = null;
let sessionExpiredHandler = () => {};

export const tokenStore = {
  get: () => accessToken,
  set: (token) => {
    accessToken = token;
  },
};

export const onSessionExpired = (handler) => {
  sessionExpiredHandler = handler;
};

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

/** Single-flight refresh: concurrent 401s share one refresh request. */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/api/auth/refresh-token`, null, { withCredentials: true })
      .then((res) => {
        accessToken = res.data.data.accessToken;
        return res.data.data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthRequest = /\/auth\/(login|refresh-token|logout)/.test(original?.url || '');

    if (error.response?.status === 401 && original && !original._retry && !isAuthRequest) {
      original._retry = true;
      try {
        await refreshSession();
        return api(original);
      } catch {
        accessToken = null;
        sessionExpiredHandler();
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (axios.isCancel(error)) return null;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the API is running.';
  return fallback;
}

/** Uploaded files are stored either on Cloudinary (absolute) or the API (relative). */
export function fileUrl(url) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
}

export default api;
