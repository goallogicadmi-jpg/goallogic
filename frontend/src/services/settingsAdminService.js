import { resolveApiUrl } from '../config/apiBase.js';
import { getAuthHeaders } from '../setupApiAuth.js';

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function parseResponse(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || fallback || `Error ${res.status}`);
  }
  return data.data ?? data;
}

export async function getAdminSettings() {
  const res = await fetch(resolveApiUrl('/api/admin/settings'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar configuración');
}

export async function getAdminSettingsStatus() {
  const res = await fetch(resolveApiUrl('/api/admin/settings/status'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar estado del servidor');
}

export async function getAdminSettingsHistory(params = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/settings/history${buildQuery(params)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar historial');
}

export async function previewAdminSettings(settings) {
  const res = await fetch(resolveApiUrl('/api/admin/settings/preview'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ settings }),
  });
  return parseResponse(res, 'Error en vista previa');
}

export async function saveAdminSettings(settings, note = '') {
  const res = await fetch(resolveApiUrl('/api/admin/settings'), {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ settings, note }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    const err = new Error(data.message || 'Error al guardar');
    err.preview = data.data;
    throw err;
  }
  return data.data;
}
