import { resolveApiUrl } from '../config/apiBase.js';
import { getAuthHeaders } from '../setupApiAuth.js';

/**
 * Dashboard Stripe LIVE (solo administradores).
 */
export async function getStripeAnalytics() {
  const res = await fetch(resolveApiUrl('/api/admin/stripe/analytics'), {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Error ${res.status} al cargar analytics Stripe`);
  }
  if (!data.success) {
    throw new Error(data.message || 'Error al cargar analytics Stripe');
  }
  return data.data;
}
