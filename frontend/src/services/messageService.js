import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio para interactuar con la API de mensajería
 * Maneja el envío, recepción y gestión de mensajes
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
 * Enviar un mensaje a un usuario
 * Solo administradores pueden usar esta función
 * @param {string} userId - ID del usuario receptor
 * @param {string} titulo - Título del mensaje
 * @param {string} contenido - Contenido del mensaje
 * @returns {Promise<Object>} Mensaje creado
 */
export const sendMessage = async (userId, titulo, contenido) => {
  try {
    const response = await fetchWithAuth('/api/messages/send', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        titulo: titulo.trim(),
        contenido: contenido.trim()
      })
    });

    if (!response.success) {
      throw new Error(response.message || 'Error al enviar el mensaje');
    }

    return response.data;
  } catch (error) {
    console.error('Error en sendMessage:', error);
    throw error;
  }
};

/**
 * Obtener todos los mensajes del usuario autenticado (inbox)
 * @returns {Promise<Object>} Objeto con messages, unread_count, total
 */
export const getInbox = async () => {
  try {
    const response = await fetchWithAuth('/api/messages/inbox', {
      method: 'GET'
    });

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener los mensajes');
    }

    return response.data;
  } catch (error) {
    console.error('Error en getInbox:', error);
    throw error;
  }
};

/**
 * Marcar un mensaje como leído
 * @param {string} messageId - ID del mensaje
 * @returns {Promise<Object>} Mensaje actualizado
 */
export const markAsRead = async (messageId) => {
  try {
    const response = await fetchWithAuth(`/api/messages/mark-read/${messageId}`, {
      method: 'PUT'
    });

    if (!response.success) {
      throw new Error(response.message || 'Error al marcar el mensaje como leído');
    }

    return response.data;
  } catch (error) {
    console.error('Error en markAsRead:', error);
    throw error;
  }
};

/**
 * Obtener todos los mensajes enviados por el administrador autenticado
 * Solo administradores pueden usar esta función
 * @returns {Promise<Object>} Objeto con messages y stats
 */
export const getSentMessages = async () => {
  try {
    const response = await fetchWithAuth('/api/messages/admin/sent', {
      method: 'GET'
    });

    if (!response.success) {
      throw new Error(response.message || 'Error al obtener los mensajes enviados');
    }

    return response.data;
  } catch (error) {
    console.error('Error en getSentMessages:', error);
    throw error;
  }
};

/**
 * Obtener el número de mensajes no leídos
 * @returns {Promise<number>} Número de mensajes no leídos
 */
export const getUnreadCount = async () => {
  try {
    const inbox = await getInbox();
    return inbox.unread_count || 0;
  } catch (error) {
    console.error('Error en getUnreadCount:', error);
    return 0;
  }
};
