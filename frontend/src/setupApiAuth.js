import axios from 'axios';

/**
 * Añade Bearer token a todas las peticiones axios (rutas premium del backend).
 */
export function setupApiAuth() {
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
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
  const headers = getAuthHeaders(
    options.headers instanceof Headers
      ? Object.fromEntries(options.headers.entries())
      : options.headers || {}
  );
  return fetch(url, { ...options, headers });
}
