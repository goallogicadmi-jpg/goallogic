import { getAuthHeaders, authFetch } from '../setupApiAuth';

export async function listAnalysts() {
  const res = await authFetch('/api/analysts', { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al cargar analistas');
  return data.data || [];
}

export async function getAnalystProfile(analystId) {
  const res = await authFetch(`/api/analysts/${analystId}`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al cargar analista');
  return data.data;
}

export async function getAnalystHistory(analystId) {
  const res = await authFetch(`/api/analysts/${analystId}/history`, { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || 'Error al cargar historial');
    err.code = data.code;
    throw err;
  }
  return data.data;
}

export async function subscribeToAnalyst(analystId) {
  const res = await authFetch(`/api/analysts/${analystId}/subscribe`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al iniciar suscripción');
  return data;
}

export async function getAnalystSubscribers(analystId) {
  const res = await authFetch(`/api/analysts/${analystId}/subscribers`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al cargar suscriptores');
  return data.data || [];
}

export async function sendAnalystMessage(analystId, payload) {
  const res = await authFetch(`/api/analysts/${analystId}/messages/send`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al enviar mensaje');
  return data;
}

export async function listAdminAnalysts() {
  const res = await authFetch('/api/admin/analysts', { headers: getAuthHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al cargar analistas');
  return data.data || [];
}

export async function updateAnalystPrice(analystId, payload) {
  const res = await authFetch(`/api/admin/analysts/${analystId}/price`, {
    method: 'PUT',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Error al actualizar precio');
  return data.data;
}

export function formatPriceCents(cents) {
  if (cents == null || Number.isNaN(Number(cents))) return '—';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(cents) / 100);
}
