import axios from 'axios';
import { API_BASE_URL, resolveApiUrl } from './config/apiBase.js';

/**
 * Añade Bearer token a todas las peticiones axios (rutas premium del backend).
 */
export function setupApiAuth() {
  if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL;
  }

  axios.interceptors.request.use((config) => {    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });
}

export function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** fetch con Authorization si hay sesión */
export function authFetch(url, options = {}) {
  const fullUrl =
    url.startsWith('http://') || url.startsWith('https://') ? url : resolveApiUrl(url);
  const headers = getAuthHeaders(
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : options.headers || {}
  );
  return fetch(fullUrl, { ...options, headers });
}

export { API_BASE_URL, resolveApiUrl };