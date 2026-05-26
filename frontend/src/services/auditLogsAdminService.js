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

export async function getAuditLogs(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/logs${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar logs');
}

export async function getAuditLogDetail(id) {
  const res = await fetch(resolveApiUrl(`/api/admin/logs/${id}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar detalle');
}

export async function getAuditLogStats() {
  const res = await fetch(resolveApiUrl('/api/admin/logs/stats'), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar estadísticas');
}

export async function exportAuditLogsCsv(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/logs/export${buildQuery({ ...filters, limit: 2000 })}`),
    { headers: getAuthHeaders() }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Error al exportar');
  }
  return res.blob();
}

export async function importWinstonLogs(maxLines = 500) {
  const res = await fetch(resolveApiUrl('/api/admin/logs/import-winston'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ maxLines }),
  });
  return parseResponse(res, 'Error al importar desde archivos');
}
