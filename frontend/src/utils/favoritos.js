/**
 * Utilidades para manejar favoritos (equipos y ligas)
 * Persistencia en backend (MongoDB)
 */

import { getFavorites, saveFavorites, updateEquipoFavorito, updateLigaFavorita } from '../services/favoritesService';
import { hasToken } from '../services/authService';

// Cache local para evitar múltiples llamadas
let favoritesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minuto

/**
 * Obtener favoritos desde el backend
 * @returns {Promise<Object>} { equipos: [], ligas: [] }
 */
export const obtenerFavoritos = async () => {
  // Si no hay token, retornar valores por defecto
  if (!hasToken()) {
    return { equipos: [], ligas: [] };
  }

  // Usar cache si está disponible y no ha expirado
  if (favoritesCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
    return favoritesCache;
  }

  try {
    const favorites = await getFavorites();
    favoritesCache = favorites;
    cacheTimestamp = Date.now();
    return favorites;
  } catch (error) {
    console.error("Error leyendo favoritos:", error);
    // Si hay error, retornar valores por defecto
    return { equipos: [], ligas: [] };
  }
};

/**
 * Guardar favoritos en el backend
 * @param {Object} favoritos - { equipos: [], ligas: [] }
 */
export const guardarFavoritos = async (favoritos) => {
  if (!hasToken()) {
    console.warn("No hay token de autenticación. Los favoritos no se guardarán.");
    return;
  }

  try {
    const saved = await saveFavorites(favoritos);
    favoritesCache = saved;
    cacheTimestamp = Date.now();
    return saved;
  } catch (error) {
    console.error("Error guardando favoritos:", error);
    throw error;
  }
};

/**
 * Agregar equipo a favoritos
 * @param {string|number} equipoId - ID del equipo
 * @returns {Promise<Object>} Favoritos actualizados
 */
export const agregarEquipoFavorito = async (equipoId) => {
  if (!hasToken()) {
    console.warn("No hay token de autenticación. El equipo no se agregará a favoritos.");
    return { equipos: [], ligas: [] };
  }

  try {
    const favorites = await updateEquipoFavorito(String(equipoId), 'add');
    favoritesCache = favorites;
    cacheTimestamp = Date.now();
    return favorites;
  } catch (error) {
    console.error("Error agregando equipo favorito:", error);
    throw error;
  }
};

/**
 * Quitar equipo de favoritos
 * @param {string|number} equipoId - ID del equipo
 * @returns {Promise<Object>} Favoritos actualizados
 */
export const quitarEquipoFavorito = async (equipoId) => {
  if (!hasToken()) {
    console.warn("No hay token de autenticación. El equipo no se quitará de favoritos.");
    return { equipos: [], ligas: [] };
  }

  try {
    const favorites = await updateEquipoFavorito(String(equipoId), 'remove');
    favoritesCache = favorites;
    cacheTimestamp = Date.now();
    return favorites;
  } catch (error) {
    console.error("Error quitando equipo favorito:", error);
    throw error;
  }
};

/**
 * Agregar liga a favoritos
 * @param {string|number} ligaId - ID de la liga
 * @returns {Promise<Object>} Favoritos actualizados
 */
export const agregarLigaFavorito = async (ligaId) => {
  if (!hasToken()) {
    console.warn("No hay token de autenticación. La liga no se agregará a favoritos.");
    return { equipos: [], ligas: [] };
  }

  try {
    const favorites = await updateLigaFavorita(String(ligaId), 'add');
    favoritesCache = favorites;
    cacheTimestamp = Date.now();
    return favorites;
  } catch (error) {
    console.error("Error agregando liga favorita:", error);
    throw error;
  }
};

/**
 * Quitar liga de favoritos
 * @param {string|number} ligaId - ID de la liga
 * @returns {Promise<Object>} Favoritos actualizados
 */
export const quitarLigaFavorito = async (ligaId) => {
  if (!hasToken()) {
    console.warn("No hay token de autenticación. La liga no se quitará de favoritos.");
    return { equipos: [], ligas: [] };
  }

  try {
    const favorites = await updateLigaFavorita(String(ligaId), 'remove');
    favoritesCache = favorites;
    cacheTimestamp = Date.now();
    return favorites;
  } catch (error) {
    console.error("Error quitando liga favorita:", error);
    throw error;
  }
};

/**
 * Verificar si un equipo es favorito
 * @param {string|number} equipoId - ID del equipo
 * @returns {Promise<boolean>}
 */
export const esEquipoFavorito = async (equipoId) => {
  const favoritos = await obtenerFavoritos();
  return favoritos.equipos.includes(String(equipoId));
};

/**
 * Verificar si una liga es favorita
 * @param {string|number} ligaId - ID de la liga
 * @returns {Promise<boolean>}
 */
export const esLigaFavorita = async (ligaId) => {
  const favoritos = await obtenerFavoritos();
  return favoritos.ligas.includes(String(ligaId));
};

/**
 * Verificar si un partido tiene equipos o liga favoritos
 * @param {Object} partido - Objeto del partido
 * @returns {Promise<boolean>}
 */
export const esPartidoFavorito = async (partido) => {
  const favoritos = await obtenerFavoritos();
  const equipoLocalId = partido.teams?.home?.id;
  const equipoVisitanteId = partido.teams?.away?.id;
  const ligaId = partido.league?.id;

  return (
    favoritos.equipos.includes(String(equipoLocalId)) ||
    favoritos.equipos.includes(String(equipoVisitanteId)) ||
    favoritos.ligas.includes(String(ligaId))
  );
};

/**
 * Invalidar el cache de favoritos
 * Útil cuando se actualizan favoritos desde otro componente
 */
export const invalidarCacheFavoritos = () => {
  favoritesCache = null;
  cacheTimestamp = null;
};
