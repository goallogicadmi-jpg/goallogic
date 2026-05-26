import { resolveApiUrl } from '../config/apiBase.js';
import { getAuthHeaders } from '../setupApiAuth.js';

async function parseResponse(res, fallback) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || fallback || `Error ${res.status}`);
  }
  return data.data ?? data;
}

function buildQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function getModerationContent(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/moderation/content${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar contenido');
}

export async function getModerationContentDetail(contentType, id) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/moderation/content/${contentType}/${id}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar detalle');
}

export async function getModerationReports(params = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/moderation/reports${buildQuery(params)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar reportes');
}

export async function deleteModerationPost(id, note = '') {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/posts/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseResponse(res, 'Error al eliminar publicación');
}

export async function restoreModerationPost(id, note = '') {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/posts/${id}/restore`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseResponse(res, 'Error al restaurar publicación');
}

export async function deleteModerationComment(id, note = '') {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/comments/${id}`), {
    method: 'DELETE',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseResponse(res, 'Error al eliminar comentario');
}

export async function restoreModerationComment(id, note = '') {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/comments/${id}/restore`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseResponse(res, 'Error al restaurar comentario');
}

export async function blockCommunityUser(userId, note = '') {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/users/${userId}/block`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseResponse(res, 'Error al bloquear usuario');
}

export async function unblockCommunityUser(userId) {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/users/${userId}/unblock`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al desbloquear usuario');
}

export async function muteCommunityUser(userId, days) {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/users/${userId}/mute`), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days }),
  });
  return parseResponse(res, 'Error al silenciar usuario');
}

export async function unmuteCommunityUser(userId) {
  const res = await fetch(resolveApiUrl(`/api/admin/moderation/users/${userId}/unmute`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al quitar silencio');
}

export async function resolveModerationReport(contentType, id, action, note = '') {
  const res = await fetch(
    resolveApiUrl(`/api/admin/moderation/reports/${contentType}/${id}/resolve`),
    {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action, note }),
    }
  );
  return parseResponse(res, 'Error al resolver reporte');
}
