import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio de usuario
 * Maneja las llamadas API para obtener el perfil completo del usuario
 */

import { getToken } from './authService';


/**
 * Obtiene el perfil completo del usuario autenticado
 * Incluye: datos personales, favoritos y estado del simulador
 * @returns {Promise<Object>} Perfil completo del usuario
 */
export async function getUserProfile() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(resolveApiUrl('/api/auth/me'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Si el token expiró o es inválido, lanzar error específico
      if (response.status === 401) {
        throw new Error('Sesión expirada. Por favor, inicia sesión nuevamente.');
      }
      if (response.status === 403) {
        throw new Error(data.error || data.message || 'Acceso denegado');
      }
      throw new Error(data.error || data.message || 'Error al obtener perfil del usuario');
    }

    return data;
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    throw error;
  }
}