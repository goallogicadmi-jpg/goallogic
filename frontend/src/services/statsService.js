/**
 * Servicio de estadísticas
 * Maneja las llamadas API para obtener estadísticas avanzadas del usuario
 */

import { getToken } from './authService';

const API_BASE_URL = ''; // Usar proxy de Vite

/**
 * Obtiene estadísticas de profit del usuario
 * @returns {Promise<Object>} { profit_total, profit_por_mes, total_apuestas }
 */
export async function getProfitStats() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/stats/profit`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener estadísticas de profit');
    }

    return data;
  } catch (error) {
    console.error('Error en getProfitStats:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de rendimiento por liga
 * @returns {Promise<Object>} { ligas: [{ liga, total_apuestas, ganadas, perdidas, profit }] }
 */
export async function getLigaStats() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/stats/ligas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener estadísticas por liga');
    }

    return data;
  } catch (error) {
    console.error('Error en getLigaStats:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de rendimiento por equipo
 * @returns {Promise<Object>} { equipos: [{ equipo, total_apuestas, ganadas, perdidas, profit }] }
 */
export async function getEquipoStats() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/stats/equipos`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener estadísticas por equipo');
    }

    return data;
  } catch (error) {
    console.error('Error en getEquipoStats:', error);
    throw error;
  }
}
