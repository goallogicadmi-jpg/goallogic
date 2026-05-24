/**
 * Módulo de asignación de fase Champions League
 * Determina en qué fase está cada equipo según su posición
 */

import { championsLeagueConfig } from '../config/championsLeagueConfig';

/**
 * Obtener la fase de clasificación según la posición
 * @param {number} position - Posición del equipo (1-36)
 * @returns {string} Fase: "direct_round_of_16", "playoff", "eliminated"
 */
export function getChampionsStage(position) {
  if (!position || position < 1 || position > championsLeagueConfig.totalTeams) {
    console.warn(`⚠️ [getChampionsStage] Posición inválida: ${position}`);
    return "eliminated";
  }
  
  const { directSpots, playoffSpots, eliminatedSpots } = championsLeagueConfig;
  
  // Clasificación directa a Octavos de Final (1-8)
  if (position >= directSpots.from && position <= directSpots.to) {
    return "direct_round_of_16";
  }
  
  // Zona de Playoff (9-24)
  if (position >= playoffSpots.from && position <= playoffSpots.to) {
    return "playoff";
  }
  
  // Eliminado (25-36)
  if (position >= eliminatedSpots.from && position <= eliminatedSpots.to) {
    return "eliminated";
  }
  
  // Fallback (no debería llegar aquí)
  console.warn(`⚠️ [getChampionsStage] Posición fuera de rango: ${position}`);
  return "eliminated";
}

/**
 * Obtener todas las posiciones de una fase específica
 * @param {string} stage - Fase: "direct_round_of_16", "playoff", "eliminated"
 * @returns {Array<number>} Array de posiciones
 */
export function getStagePositions(stage) {
  const { phases } = championsLeagueConfig;
  
  if (!phases[stage]) {
    console.warn(`⚠️ [getStagePositions] Fase inválida: ${stage}`);
    return [];
  }
  
  return phases[stage].positions;
}

/**
 * Verificar si una posición está en una fase específica
 * @param {number} position - Posición del equipo
 * @param {string} stage - Fase a verificar
 * @returns {boolean} true si la posición está en esa fase
 */
export function isInStage(position, stage) {
  return getChampionsStage(position) === stage;
}
