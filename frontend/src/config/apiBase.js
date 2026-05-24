/**
 * URL base del backend.
 * - Desarrollo: vacío → Vite proxy (/api → localhost:3000)
 * - Producción (Vercel): VITE_API_URL → https://goallogic.onrender.com
 */
const raw = (import.meta.env.VITE_API_URL || '').trim().replace(/\/$/, '');

export const API_BASE_URL = raw;

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
