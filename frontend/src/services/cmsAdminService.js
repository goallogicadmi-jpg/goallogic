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

export async function getCmsItems(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/cms/items${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar contenido CMS');
}

export async function getCmsItem(id) {
  const res = await fetch(resolveApiUrl(`/api/admin/cms/items/${id}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar ítem');
}

export async function createCmsItem(payload) {
  const res = await fetch(resolveApiUrl('/api/admin/cms/items'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error al crear ítem');
}

export async function updateCmsItem(id, payload) {
  const res = await fetch(resolveApiUrl(`/api/admin/cms/items/${id}`), {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error al actualizar ítem');
}

export async function deleteCmsItem(id) {
  const res = await fetch(resolveApiUrl(`/api/admin/cms/items/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al eliminar ítem');
}

export async function publishCmsItem(id, scheduledPublishAt = null) {
  const res = await fetch(resolveApiUrl(`/api/admin/cms/items/${id}/publish`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ scheduledPublishAt }),
  });
  return parseResponse(res, 'Error al publicar');
}

export async function unpublishCmsItem(id, archive = false) {
  const res = await fetch(resolveApiUrl(`/api/admin/cms/items/${id}/unpublish`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ archive }),
  });
  return parseResponse(res, 'Error al despublicar');
}
