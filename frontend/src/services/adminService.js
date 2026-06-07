import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio para interactuar con la API de administración
 * Solo accesible para administradores
 */


/**
 * Obtener el token de autenticación desde localStorage
 */
const getAuthToken = () => {
  return localStorage.getItem('auth_token');
};

/**
 * Realizar petición fetch con autenticación
 */
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(resolveApiUrl(url), {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
    throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

/**
 * Obtener lista de usuarios con filtros opcionales.
 * @param {Object} filters - role, email, premium ('true'|'false'|''), q, createdFrom, createdTo (YYYY-MM-DD)
 */
export const getUsers = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        params.set(key, String(value).trim());
      }
    });
    const qs = params.toString();
    const url = qs ? `/api/admin/users?${qs}` : '/api/admin/users';
    const response = await fetchWithAuth(url, { method: 'GET' });

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener usuarios');
    }

    return response.data;
  } catch (error) {
    console.error('Error en getUsers:', error);
    throw error;
  }
};

/**
 * Activar o desactivar premium manualmente (solo admin principal).
 */
export const setUserPremium = async (userId, premium) => {
  const response = await fetchWithAuth(`/api/admin/user/${userId}/premium`, {
    method: 'PUT',
    body: JSON.stringify({ premium }),
  });

  if (!response.success) {
    throw new Error(response.message || 'Error al actualizar premium');
  }

  return response.data;
};

/**
 * Obtener perfil completo de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Perfil completo del usuario
 */
export const getUserProfile = async (userId) => {
  try {
    const response = await fetchWithAuth(`/api/admin/user/${userId}`, { method: 'GET' });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al obtener el perfil del usuario');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    throw error;
  }
};

/**
 * Cambiar el rol de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} role - Nuevo rol (usuario, admin_secundario)
 * @returns {Promise<Object>} Usuario actualizado
 */
export const updateUserRole = async (userId, role) => {
  try {
    const response = await fetchWithAuth(`/api/admin/user/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al actualizar el rol');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en updateUserRole:', error);
    throw error;
  }
};

/**
 * Eliminar un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId) => {
  try {
    const response = await fetchWithAuth(`/api/admin/user/${userId}`, {
      method: 'DELETE'
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al eliminar el usuario');
    }
    
    return response;
  } catch (error) {
    console.error('Error en deleteUser:', error);
    throw error;
  }
};

/**
 * Enviar mensaje a múltiples usuarios
 * @param {Array<string>} userIds - Array de IDs de usuarios
 * @param {string} titulo - Título del mensaje
 * @param {string} contenido - Contenido del mensaje
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendBulkMessage = async (userIds, titulo, contenido) => {
  try {
    const response = await fetchWithAuth('/api/admin/messages/bulk', {
      method: 'POST',
      body: JSON.stringify({
        user_ids: userIds,
        titulo: titulo.trim(),
        contenido: contenido.trim()
      })
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al enviar mensajes masivos');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en sendBulkMessage:', error);
    throw error;
  }
};

/**
 * Enviar mensaje broadcast a todos los usuarios
 * @param {string} titulo - Título del mensaje
 * @param {string} contenido - Contenido del mensaje
 * @returns {Promise<Object>} Resultado del envío
 */
export const sendBroadcastMessage = async (titulo, contenido) => {
  try {
    const response = await fetchWithAuth('/api/admin/messages/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        titulo: titulo.trim(),
        contenido: contenido.trim()
      })
    });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al enviar mensaje broadcast');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en sendBroadcastMessage:', error);
    throw error;
  }
};

/**
 * Obtener estadísticas globales del sistema
 * @returns {Promise<Object>} Estadísticas
 */
export const getAdminStats = async () => {
  try {
    const response = await fetchWithAuth('/api/admin/stats', { method: 'GET' });
    
    if (!response.success) {
      throw new Error(response.message || 'Error al obtener estadísticas');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error en getAdminStats:', error);
    throw error;
  }
};

/**
 * Metadatos de módulos Admin Panel PRO (esqueleto backend).
 */
export const getAdminProModules = async () => {
  const response = await fetchWithAuth('/api/admin/pro/modules', { method: 'GET' });
  if (!response.success) {
    throw new Error(response.message || 'Error al obtener módulos admin');
  }
  return response;
};

/** Lista usuarios del plan familiar (solo admin principal). */
export const getFamilyUsers = async () => {
  const response = await fetchWithAuth('/api/admin/family/users', { method: 'GET' });
  if (!response.success) {
    throw new Error(response.message || 'Error al obtener usuarios familiares');
  }
  return response.data;
};

/** Crea usuario familiar con acceso gratuito permanente. */
export const createFamilyUser = async (payload) => {
  const response = await fetchWithAuth('/api/admin/family/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!response.success) {
    throw new Error(response.message || 'Error al crear usuario familiar');
  }
  return response.data;
};
