/**
 * Servicio de autenticación
 * Maneja las llamadas API para login y registro
 */

const API_BASE_URL = ''; // Usar proxy de Vite

const AUTH_USER_SNAPSHOT_KEY = 'auth_user_snapshot';

/**
 * Registra un nuevo usuario (campos extendidos + dirección).
 * @param {Object} payload - nombre, apellido, telefono, email, password, pais, ciudad, direccion, codigo_postal
 * @returns {Promise<Object>} Respuesta del servidor (incluye userId / user_id)
 */
export async function register(payload) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al registrar usuario');
    }

    return data;
  } catch (error) {
    console.error('Error en register:', error);
    throw error;
  }
}

/**
 * Inicia sesión con email y contraseña
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Respuesta con token
 */
export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al iniciar sesión');
    }

    return data;
  } catch (error) {
    console.error('Error en login:', error);
    throw error;
  }
}

/**
 * Guarda el token en localStorage
 * @param {string} token - Token JWT
 */
export function saveToken(token) {
  localStorage.setItem('auth_token', token);
}

/**
 * Guarda un snapshot mínimo del usuario (p. ej. tras login) para userId sin depender de GET /me.
 * @param {Object} user - Objeto user de la API (debe incluir id o user_id)
 */
export function saveAuthUserSnapshot(user) {
  if (!user) return;
  try {
    const rawId = user.id ?? user.user_id;
    if (!rawId) return;
    const id = String(rawId);
    const snapshot = {
      ...user,
      id,
      user_id: id,
    };
    localStorage.setItem(AUTH_USER_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('saveAuthUserSnapshot:', e);
  }
}

/**
 * @returns {Object|null} Snapshot guardado en login o null
 */
export function getAuthUserSnapshot() {
  try {
    const raw = localStorage.getItem(AUTH_USER_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * user_id del JWT (fallback si no hay snapshot).
 * @returns {string|null}
 */
export function getUserIdFromToken() {
  const token = getToken();
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    return payload.user_id ? String(payload.user_id) : null;
  } catch {
    return null;
  }
}

/**
 * Obtiene el token de localStorage
 * @returns {string|null} Token o null si no existe
 */
export function getToken() {
  return localStorage.getItem('auth_token');
}

/**
 * Elimina el token de localStorage
 */
export function removeToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem(AUTH_USER_SNAPSHOT_KEY);
}

/**
 * Obtiene datos mínimos de sesión (incluye legalAccepted).
 */
export async function getSession() {
  const token = getToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
    }
    throw new Error(data.message || 'Error al obtener sesión');
  }
  return data;
}

/**
 * Registra la aceptación del aviso legal.
 */
export async function acceptLegalNotice() {
  const token = getToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/accept-legal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al aceptar aviso legal');
  }
  return data;
}

/**
 * Solicita enlace de recuperación de contraseña.
 */
export async function requestPasswordReset(email) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    /* respuesta no JSON */
  }

  if (response.status === 429) {
    throw new Error(data.message || 'Demasiadas solicitudes. Intenta en un minuto.');
  }
  if (response.status === 404) {
    throw new Error(
      'Servicio de recuperación no disponible. Reinicia el servidor backend (node server.js).'
    );
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Error al solicitar recuperación');
  }
  return data;
}

/**
 * Verifica si un token de recuperación es válido.
 */
export async function verifyResetToken(token) {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify-reset-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al verificar enlace');
  }
  return data;
}

/**
 * Restablece la contraseña con token de recuperación.
 */
export async function resetPassword(token, newPassword) {
  const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Error al restablecer contraseña');
  }
  return data;
}

/**
 * Verifica si hay un token válido
 * @returns {boolean} true si existe token
 */
export function hasToken() {
  return !!getToken();
}
