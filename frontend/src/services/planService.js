import { resolveApiUrl } from '../config/apiBase.js';
import { getToken } from './authService.js';

async function authFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl(path), { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Error ${response.status}`);
  }

  return data;
}

export async function getTrialStatus() {
  const payload = await authFetch('/api/user/trialStatus');
  return payload.data;
}

export async function getUserPlan() {
  const payload = await authFetch('/api/user/plan');
  return payload.data;
}

export async function acknowledgeTrialExpired() {
  return authFetch('/api/user/trial-expired-acknowledge', { method: 'POST' });
}

export async function requestUpgradeInfo() {
  return authFetch('/api/user/upgrade', { method: 'POST' });
}

export async function consumePlanUsage(type) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl('/api/user/usage/consume'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ type }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Error ${response.status}`);
    error.code = data.error;
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data.data;
}
