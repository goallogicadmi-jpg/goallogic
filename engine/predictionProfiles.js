/**
 * Perfiles de Predicción - GoalLogic
 * Define diferentes estrategias de predicción con pesos personalizados
 * 
 * NOTA: Los perfiles ahora se obtienen desde predictionConfig.js
 * Este archivo se mantiene para compatibilidad pero delega en predictionConfig.js
 */

const { getProfileWeights: getProfileWeightsFromConfig, availableProfiles: availableProfilesFromConfig } = require('./predictionConfig');

/**
 * Obtener pesos de un perfil
 * @param {string} profileName - Nombre del perfil ('conservador', 'balanceado', 'agresivo')
 * @returns {Object} - Objeto con los pesos del perfil
 * 
 * @deprecated Usar directamente getProfileWeights desde predictionConfig.js
 * Mantenido para compatibilidad con código existente
 */
function getProfileWeights(profileName) {
  return getProfileWeightsFromConfig(profileName);
}

/**
 * Lista de perfiles disponibles
 * 
 * @deprecated Usar directamente availableProfiles desde predictionConfig.js
 * Mantenido para compatibilidad con código existente
 */
const availableProfiles = availableProfilesFromConfig;

module.exports = {
  getProfileWeights,
  availableProfiles
};
