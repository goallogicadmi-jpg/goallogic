import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio del simulador de apuestas
 * Maneja las llamadas API para el simulador de apuestas
 */

import { getToken } from './authService';


/**
 * Obtiene el estado del simulador del usuario autenticado
 * @returns {Promise<Object>} Estado del simulador
 */
export async function getSimulatorState() {
  const token = getToken();
  if (!token) {
    throw new Error('No hay token de autenticación');
  }

  let response;
  try {
    response = await fetch(resolveApiUrl('/api/simulator'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (networkErr) {
    console.error('[getSimulatorState] network error:', networkErr);
    throw new Error('No se pudo conectar con el servidor del simulador');
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    console.error('[getSimulatorState] invalid JSON', response.status);
  }

  console.log('[getSimulatorState] response', response.status, data);

  if (response.status === 401) {
    throw new Error(data.message || 'Sesión expirada. Inicia sesión de nuevo.');
  }
  if (response.status === 404) {
    throw new Error('Servicio del simulador no disponible. Reinicia el backend.');
  }
  if (!response.ok) {
    throw new Error(data.message || data.error || 'Error al obtener estado del simulador');
  }

  return (
    data.simulator_state ?? {
      capital_inicial: 1000,
      capital_actual: 1000,
      apuestas: [],
      updated_at: null,
    }
  );
}

/**
 * Guarda o actualiza el estado completo del simulador
 * @param {Object} simulatorState - Estado del simulador { capital_inicial, capital_actual, apuestas }
 * @returns {Promise<Object>} Estado del simulador actualizado
 */
export async function saveSimulatorState(simulatorState) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(resolveApiUrl('/api/simulator'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(simulatorState),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al guardar estado del simulador');
    }

    return data.simulator_state;
  } catch (error) {
    console.error('Error en saveSimulatorState:', error);
    throw error;
  }
}

/**
 * Agrega una nueva apuesta simulada
 * @param {Object} apuesta - Datos de la apuesta { partido, cuota, stake, resultado?, ganancia? }
 * @returns {Promise<Object>} Estado del simulador actualizado
 */
export async function addSimulatorBet(apuesta) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(resolveApiUrl('/api/simulator/apuesta'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(apuesta),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al agregar apuesta simulada');
    }

    return data.simulator_state;
  } catch (error) {
    console.error('Error en addSimulatorBet:', error);
    throw error;
  }
}

/**
 * Elimina una apuesta simulada
 * @param {string} apuestaId - ID de la apuesta a eliminar
 * @returns {Promise<Object>} Estado del simulador actualizado
 */
export async function deleteSimulatorBet(apuestaId) {
  try {
    const token = getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }

    const response = await fetch(resolveApiUrl(`/api/simulator/apuesta/${apuestaId}`), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error al eliminar apuesta simulada');
    }

    return data.simulator_state;
  } catch (error) {
    console.error('Error en deleteSimulatorBet:', error);
    throw error;
  }
}
