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

export async function getMessageTemplates() {
  const res = await fetch(resolveApiUrl('/api/admin/messages/templates'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar plantillas');
}

export async function createMessageTemplate(payload) {
  const res = await fetch(resolveApiUrl('/api/admin/messages/templates'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error al crear plantilla');
}

export async function previewSegment(segment) {
  const res = await fetch(resolveApiUrl('/api/admin/messages/segment/preview'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ segment }),
  });
  return parseResponse(res, 'Error al calcular segmento');
}

export async function previewMessage(payload) {
  const res = await fetch(resolveApiUrl('/api/admin/messages/preview'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error en vista previa');
}

export async function getMessageCampaigns(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/messages/campaigns${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar campañas');
}

export async function getMessageCampaign(id) {
  const res = await fetch(resolveApiUrl(`/api/admin/messages/campaigns/${id}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar campaña');
}

export async function createMessageCampaign(payload) {
  const res = await fetch(resolveApiUrl('/api/admin/messages/campaigns'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Error al crear campaña');
  }
  return data;
}

export async function cancelMessageCampaign(id) {
  const res = await fetch(resolveApiUrl(`/api/admin/messages/campaigns/${id}/cancel`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cancelar');
}

export async function getAdminMessageHistory(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/messages/history${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar historial');
}

export const TEMPLATE_VARIABLES_HELP = '{{name}}, {{email}}, {{premium_since}}';
