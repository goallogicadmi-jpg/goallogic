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

export async function getAdminLeagues(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/leagues${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar ligas');
}

export async function getAdminLeague(leagueId) {
  const res = await fetch(resolveApiUrl(`/api/admin/leagues/${leagueId}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar liga');
}

export async function updateAdminLeague(leagueId, payload) {
  const res = await fetch(resolveApiUrl(`/api/admin/leagues/${leagueId}`), {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error al actualizar');
}

export async function toggleLeagueActive(leagueId) {
  const res = await fetch(resolveApiUrl(`/api/admin/leagues/${leagueId}/toggle-active`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cambiar estado');
}

export async function syncLeague(leagueId) {
  const res = await fetch(resolveApiUrl(`/api/admin/leagues/${leagueId}/sync`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || 'Error al sincronizar');
  }
  return data.data;
}

export async function syncAllLeagues(onlyActive = true) {
  const res = await fetch(resolveApiUrl('/api/admin/leagues/sync-all'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ onlyActive }),
  });
  return parseResponse(res, 'Error en sync masivo');
}

export async function getLeagueSyncHistory(leagueId) {
  const res = await fetch(resolveApiUrl(`/api/admin/leagues/${leagueId}/sync-history`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar historial');
}
