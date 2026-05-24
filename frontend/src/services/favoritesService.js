/**
 * Servicio de favoritos
 * Maneja las llamadas API para gestionar favoritos del usuario
 */

import { getToken } from './authService';

const API_BASE_URL = ''; // Usar proxy de Vite

/**
 * Obtiene los favoritos del usuario autenticado
 * @returns {Promise<Object>} Favoritos { equipos: [], ligas: [] }
 */
export async function getFavorites() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener favoritos');
    }

    return data.favorites;
  } catch (error) {
    console.error('Error en getFavorites:', error);
    throw error;
  }
}

/**
 * Reemplaza los favoritos completos del usuario
 * @param {Object} favorites - { equipos: [], ligas: [] }
 * @returns {Promise<Object>} Favoritos actualizados
 */
export async function saveFavorites(favorites) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(favorites),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar favoritos');
    }

    return data.favorites;
  } catch (error) {
    console.error('Error en saveFavorites:', error);
    throw error;
  }
}

/**
 * Agrega o quita un equipo de favoritos
 * @param {string} equipoId - ID del equipo
 * @param {string} action - 'add' o 'remove'
 * @returns {Promise<Object>} Favoritos actualizados
 */
export async function updateEquipoFavorito(equipoId, action) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites/equipos`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ equipoId, action }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar equipo favorito');
    }

    return data.favorites;
  } catch (error) {
    console.error('Error en updateEquipoFavorito:', error);
    throw error;
  }
}

/**
 * Agrega o quita una liga de favoritos
 * @param {string} ligaId - ID de la liga
 * @param {string} action - 'add' o 'remove'
 * @returns {Promise<Object>} Favoritos actualizados
 */
export async function updateLigaFavorita(ligaId, action) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/favorites/ligas`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ ligaId, action }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar liga favorita');
    }

    return data.favorites;
  } catch (error) {
    console.error('Error en updateLigaFavorita:', error);
    throw error;
  }
}
