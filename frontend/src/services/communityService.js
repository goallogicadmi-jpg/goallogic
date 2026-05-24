/**
 * Servicio para la Comunidad - Fase 1
 * 
 * Maneja las llamadas API relacionadas con notificaciones y badges del botón de Comunidad
 */

import { getToken } from './authService';

const API_BASE_URL = ''; // Usar proxy de Vite

/**
 * Obtener contador de notificaciones (comentarios nuevos en posts del usuario)
 * @returns {Promise<number>} Número de comentarios nuevos
 */
export async function getNotificationCount() {
  try {
    const token = getToken();
    
    if (!token) {
      return 0;
    }

    const response = await fetch(`${API_BASE_URL}/api/community/notifications/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener contador de notificaciones');
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.error('Error en getNotificationCount:', error);
    return 0;
  }
}

/**
 * Obtener si hay posts "Hot" (alta actividad reciente)
 * @returns {Promise<boolean>} true si hay posts con alta actividad
 */
/**
 * Eliminar una publicación (solo administradores)
 * @param {string} postId
 * @returns {Promise<{ id: string }>}
 */
export async function deletePost(postId) {
  const token = getToken();
  if (!token) {
    throw new Error('Debes iniciar sesión');
  }

  const response = await fetch(`${API_BASE_URL}/api/community/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar la publicación');
  }
  return data;
}

/**
 * Eliminar un comentario (solo administradores)
 * @param {string} postId
 * @param {string} commentId
 * @returns {Promise<{ commentId: string, commentsCount: number }>}
 */
export async function deleteComment(postId, commentId) {
  const token = getToken();
  if (!token) {
    throw new Error('Debes iniciar sesión');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/community/posts/${postId}/comments/${commentId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Error al eliminar el comentario');
  }
  return data;
}

export async function getHotIndicator() {
  try {
    const token = getToken();
    
    if (!token) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/api/community/hot-indicator`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener indicador Hot');
    }

    const data = await response.json();
    return data.hasHotPosts || false;
  } catch (error) {
    console.error('Error en getHotIndicator:', error);
    return false;
  }
}
