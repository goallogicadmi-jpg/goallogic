import { resolveApiUrl } from '../config/apiBase.js';

export async function getPublicSettings() {
  const res = await fetch(resolveApiUrl('/api/settings/public'));
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Error al cargar ajustes públicos');
  }
  return data.data;
}
