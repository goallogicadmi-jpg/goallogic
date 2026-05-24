import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio para Preferencias de Comunidad - Fase 3
 * 
 * Maneja las preferencias del usuario para el botón de Comunidad
 * Almacena en localStorage (puede extenderse a backend en el futuro)
 */

const PREFERENCES_KEY = 'community_button_preferences';

const DEFAULT_PREFERENCES = {
  showBadges: true,
  showNotifications: true,
  showHotIndicator: true,
  showNewContent: true,
  liveFeedEnabled: true,
  iconVariant: 'group', // 'group', 'feed', 'chart'
};

/**
 * Obtener preferencias del usuario
 * @returns {Object} Preferencias del usuario
 */
export function getCommunityPreferences() {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
    return DEFAULT_PREFERENCES;
  } catch (error) {
    console.error('Error cargando preferencias:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Guardar preferencias del usuario
 * @param {Object} preferences - Preferencias a guardar
 */
export function saveCommunityPreferences(preferences) {
  try {
    const current = getCommunityPreferences();
    const updated = { ...current, ...preferences };
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error guardando preferencias:', error);
  }
}

/**
 * Actualizar una preferencia específica
 * @param {string} key - Clave de la preferencia
 * @param {*} value - Valor de la preferencia
 */
export function updateCommunityPreference(key, value) {
  const current = getCommunityPreferences();
  saveCommunityPreferences({ [key]: value });
}
