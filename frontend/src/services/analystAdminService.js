import { getAuthHeaders, authFetch } from '../setupApiAuth';

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error en la solicitud');
  return data;
}

export async function getAnalystAdminDashboard() {
  const res = await authFetch('/api/admin/analysts/dashboard', { headers: getAuthHeaders() });
  const data = await parseJson(res);
  return data.data;
}

export async function listAdminAnalysts(params = {}) {
  const qs = params.status ? `?status=${encodeURIComponent(params.status)}` : '';
  const res = await authFetch(`/api/admin/analysts${qs}`, { headers: getAuthHeaders() });
  const data = await parseJson(res);
  return data.data || [];
}

export async function getAdminAnalystDetail(analystId) {
  const res = await authFetch(`/api/admin/analysts/${analystId}`, { headers: getAuthHeaders() });
  const data = await parseJson(res);
  return data.data;
}

export async function updateAdminAnalyst(analystId, payload) {
  const res = await authFetch(`/api/admin/analysts/${analystId}`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function updateAnalystPrice(analystId, payload) {
  const res = await authFetch(`/api/admin/analysts/${analystId}/price`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function suspendAnalyst(analystId, payload) {
  const res = await authFetch(`/api/admin/analysts/${analystId}/suspend`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseJson(res);
}

export async function applyAnalystSanctions(analystId, payload) {
  const res = await authFetch(`/api/admin/analysts/${analystId}/sanctions`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function forceCancelSubscription(analystId, subscriptionId) {
  const res = await authFetch(
    `/api/admin/analysts/${analystId}/subscribers/${subscriptionId}/cancel`,
    { method: 'POST', headers: getAuthHeaders() }
  );
  return parseJson(res);
}

export async function suspendAnalystMessage(messageId, reason) {
  const res = await authFetch(`/api/admin/analysts/messages/${messageId}/suspend`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  return parseJson(res);
}

export async function listAnalystVerifications(status = 'pending') {
  const res = await authFetch(
    `/api/admin/analysts/verifications?status=${encodeURIComponent(status)}`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJson(res);
  return data.data || [];
}

export async function approveVerification(id, note) {
  const res = await authFetch(`/api/admin/analysts/verifications/${id}/approve`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ note }),
  });
  return parseJson(res);
}

export async function rejectVerification(id, reason) {
  const res = await authFetch(`/api/admin/analysts/verifications/${id}/reject`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason }),
  });
  return parseJson(res);
}

export async function createAnalyst(payload) {
  const res = await authFetch('/api/admin/analysts/create', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data;
}

export async function getStripeDashboardUrls() {
  const res = await authFetch('/api/admin/analysts/stripe/dashboard-url', {
    headers: getAuthHeaders(),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function createStripePrice(payload) {
  const res = await authFetch('/api/admin/analysts/stripe/create-price', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function removeAnalyst(analystId) {
  const res = await authFetch(`/api/admin/analysts/${analystId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return parseJson(res);
}

export async function grantAnalystVerification(analystId) {
  const res = await authFetch(`/api/admin/analysts/${analystId}/sanctions`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ grantVerification: true }),
  });
  const data = await parseJson(res);
  return data.data;
}

export async function getAnalystAuditLogs() {
  const res = await authFetch('/api/admin/analysts/audit', { headers: getAuthHeaders() });
  const data = await parseJson(res);
  return data.data || [];
}

export async function getAnalystRanking(category = 'roi') {
  const res = await authFetch(
    `/api/admin/analysts/ranking?category=${encodeURIComponent(category)}`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJson(res);
  return data.data;
}

export async function previewRankingCommunityPost(category = 'roi') {
  const res = await authFetch(
    `/api/admin/analysts/ranking/preview?category=${encodeURIComponent(category)}`,
    { headers: getAuthHeaders() }
  );
  const data = await parseJson(res);
  return data.data;
}

export async function publishRankingToCommunity(category = 'roi') {
  const res = await authFetch('/api/admin/analysts/ranking/publish', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ category, limit: 10 }),
  });
  return parseJson(res);
}

export const RANKING_CATEGORIES = [
  { id: 'roi', label: 'Top ROI' },
  { id: 'winRate', label: 'Top % acierto' },
  { id: 'streak', label: 'Top racha' },
  { id: 'subscribers', label: 'Top suscriptores' },
  { id: 'revenue', label: 'Top ingresos' },
  { id: 'monthly', label: 'Top mensual' },
];

export function formatPriceCents(cents) {
  if (cents == null || Number.isNaN(Number(cents))) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(cents) / 100);
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES');
}

export function analystStatusLabel(status) {
  const map = {
    active: 'Activo',
    pending: 'Pendiente',
    suspended: 'Suspendido',
    rejected: 'Rechazado',
    none: 'Activo',
  };
  return map[status] || status;
}
