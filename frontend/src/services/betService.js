/**
 * Servicio de apuestas
 * Maneja las llamadas API para crear y obtener apuestas
 */

import { getToken } from './authService';

const API_BASE_URL = ''; // Usar proxy de Vite

/**
 * Crea una nueva apuesta
 * @param {Object} betData - Datos de la apuesta
 * @returns {Promise<Object>} Respuesta del servidor
 */
export async function createBet(betData) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/bets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(betData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al crear apuesta');
    }

    return data;
  } catch (error) {
    console.error('Error en createBet:', error);
    throw error;
  }
}

/**
 * Obtiene las apuestas del usuario autenticado con paginación y filtros
 * @param {number} page - Número de página (default: 1)
 * @param {number} limit - Cantidad por página (default: 20)
 * @param {Object} filters - Filtros opcionales { resultado, mercado, partido, fechaDesde, fechaHasta }
 * @returns {Promise<Object>} Objeto con apuestas y metadatos de paginación
 */
export async function getBets(page = 1, limit = 20, filters = {}) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    // Construir URL con parámetros de paginación y filtros
    const url = new URL(`${API_BASE_URL}/api/bets`, window.location.origin);
    url.searchParams.append('page', page.toString());
    url.searchParams.append('limit', limit.toString());

    // Agregar filtros si existen
    if (filters.resultado) {
      url.searchParams.append('resultado', filters.resultado);
    }
    if (filters.mercado) {
      url.searchParams.append('mercado', filters.mercado);
    }
    if (filters.partido && filters.partido.trim()) {
      url.searchParams.append('partido', filters.partido.trim());
    }
    if (filters.fechaDesde) {
      url.searchParams.append('fechaDesde', filters.fechaDesde);
    }
    if (filters.fechaHasta) {
      url.searchParams.append('fechaHasta', filters.fechaHasta);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      console.error('[getBets] invalid JSON', response.status);
    }

    console.log('[getBets] response', response.status, {
      bets: Array.isArray(data.bets) ? data.bets.length : data.bets,
      total: data.total,
    });

    if (response.status === 401) {
      throw new Error(data.message || 'Sesión expirada. Inicia sesión de nuevo.');
    }
    if (response.status === 404) {
      throw new Error('Servicio de apuestas no disponible. Reinicia el backend.');
    }
    if (!response.ok) {
      throw new Error(data.message || data.error || 'Error al obtener apuestas');
    }

    return {
      bets: Array.isArray(data.bets) ? data.bets : [],
      page: data.page || page,
      limit: data.limit || limit,
      total: typeof data.total === 'number' ? data.total : 0,
      totalPages: data.totalPages ?? 1,
    };
  } catch (error) {
    console.error('Error en getBets:', error);
    throw error;
  }
}

/**
 * Actualiza una apuesta existente
 * @param {string} betId - ID de la apuesta
 * @param {Object} betData - Datos actualizados de la apuesta
 * @returns {Promise<Object>} Respuesta del servidor
 */
export async function updateBet(betId, betData) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/bets/${betId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(betData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al actualizar apuesta');
    }

    return data;
  } catch (error) {
    console.error('Error en updateBet:', error);
    throw error;
  }
}

/**
 * Elimina una apuesta
 * @param {string} betId - ID de la apuesta
 * @returns {Promise<Object>} Respuesta del servidor
 */
export async function deleteBet(betId) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/bets/${betId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al eliminar apuesta');
    }

    return data;
  } catch (error) {
    console.error('Error en deleteBet:', error);
    throw error;
  }
}

/**
 * Obtiene estadísticas de rendimiento del usuario
 * @returns {Promise<Object>} Objeto con estadísticas (profitTotal, roi, winRate, etc.)
 */
export async function getBetStats() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/bets/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener estadísticas');
    }

    return data;
  } catch (error) {
    console.error('Error en getBetStats:', error);
    throw error;
  }
}

/**
 * Obtiene la evolución del profit del usuario agrupado por día
 * @returns {Promise<Array>} Array de objetos con fecha, profitDiario y profitAcumulado
 */
export async function getProfitTimeline() {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(`${API_BASE_URL}/api/bets/profit-timeline`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al obtener timeline de profit');
    }

    return data.timeline || [];
  } catch (error) {
    console.error('Error en getProfitTimeline:', error);
    throw error;
  }
}
