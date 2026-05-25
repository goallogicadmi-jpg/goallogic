/**
 * URL base del backend.
 * - Desarrollo: vacío → Vite proxy (/api → localhost:3000)
 * - Producción (Vercel): VITE_API_URL → https://goallogic.onrender.com
 */
const DEFAULT_PROD_API = 'https://goallogic.onrender.com';

function resolveDefaultApiBase() {
  const fromEnv = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return DEFAULT_PROD_API;
    }
  }

  return '';
}

export const API_BASE_URL = resolveDefaultApiBase();

export function resolveApiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (API_BASE_URL) {
    return `${API_BASE_URL}${normalized}`;
  }
  return normalized;
}

/** URL object para query params (dev + producción). */
export function resolveApiUrlObject(path) {
  const resolved = resolveApiUrl(path);
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return new URL(resolved);
  }
  return new URL(resolved, window.location.origin);
}
