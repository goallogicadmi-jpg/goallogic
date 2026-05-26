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

export async function getAdminCoupons(filters = {}) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/coupons${buildQuery(filters)}`),
    { headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al cargar cupones');
}

export async function getAdminCoupon(couponId) {
  const res = await fetch(resolveApiUrl(`/api/admin/coupons/${couponId}`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar cupón');
}

export async function createAdminCoupon(payload) {
  const res = await fetch(resolveApiUrl('/api/admin/coupons'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return parseResponse(res, 'Error al crear cupón');
}

export async function deactivateCoupon(couponId) {
  const res = await fetch(resolveApiUrl(`/api/admin/coupons/${couponId}/deactivate`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al desactivar');
}

export async function activateCoupon(couponId) {
  const res = await fetch(resolveApiUrl(`/api/admin/coupons/${couponId}/activate`), {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al activar');
}

export async function setCheckoutDefaultCoupon(couponId) {
  const res = await fetch(
    resolveApiUrl(`/api/admin/coupons/${couponId}/set-checkout-default`),
    { method: 'POST', headers: getAuthHeaders() }
  );
  return parseResponse(res, 'Error al configurar checkout');
}

export async function getCouponStats(couponId) {
  const res = await fetch(resolveApiUrl(`/api/admin/coupons/${couponId}/stats`), {
    headers: getAuthHeaders(),
  });
  return parseResponse(res, 'Error al cargar estadísticas');
}

export async function validateCouponCode(code) {
  const res = await fetch(resolveApiUrl('/api/payments/validate-coupon'), {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Cupón no válido');
  }
  return data.data;
}
