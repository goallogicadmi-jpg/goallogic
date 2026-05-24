/**
 * Presets de Configuración para Predicciones
 * Combina perfiles de predicción con opciones de visualización
 */

export const predictionPresets = {
  'analista-pro': {
    id: 'analista-pro',
    name: 'Analista Pro',
    icon: '🎯',
    description: 'Análisis completo con perfil agresivo y todas las visualizaciones activas',
    profile: 'agresivo',
    visualizaciones: {
      panelAnalisis: true,
      comparador: true,
      tendencias: true,
    },
  },
  'conservador-seguro': {
    id: 'conservador-seguro',
    name: 'Conservador Seguro',
    icon: '🛡️',
    description: 'Perfil conservador con visualizaciones básicas',
    profile: 'conservador',
    visualizaciones: {
      panelAnalisis: false,
      comparador: true,
      tendencias: false,
    },
  },
  'balanceado-completo': {
    id: 'balanceado-completo',
    name: 'Balanceado Completo',
    icon: '⚖️',
    description: 'Perfil balanceado con todas las opciones activas',
    profile: 'balanceado',
    visualizaciones: {
      panelAnalisis: true,
      comparador: true,
      tendencias: true,
    },
  },
  'rapido': {
    id: 'rapido',
    name: 'Rápido',
    icon: '⚡',
    description: 'Análisis rápido sin visualizaciones avanzadas',
    profile: 'balanceado',
    visualizaciones: {
      panelAnalisis: false,
      comparador: false,
      tendencias: false,
    },
  },
};

/**
 * Obtener un preset por ID
 * @param {string} presetId - ID del preset
 * @returns {Object|null} - Preset o null si no existe
 */
export function getPreset(presetId) {
  return predictionPresets[presetId] || predictionPresets['balanceado-completo'];
}

/**
 * Obtener todos los presets disponibles
 * @returns {Array} - Array de presets
 */
export function getAllPresets() {
  return Object.values(predictionPresets);
}

/**
 * Obtener preset por defecto
 * @returns {Object} - Preset por defecto
 */
export function getDefaultPreset() {
  return predictionPresets['balanceado-completo'];
}
