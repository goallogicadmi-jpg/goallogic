/**
 * Helpers para el asistente virtual - Champions League
 * Funciones de consulta sobre clasificación y estadísticas
 */

import { getTeamsByStage, getTeamByPosition } from '../engine/selectors';
import { championsLeagueConfig } from '../config/championsLeagueConfig';

/**
 * Obtener equipos del Top 8 (clasificación directa)
 * @param {Array} classification - Clasificación completa
 * @returns {Array} Equipos en posiciones 1-8
 */
export function getTop8Teams(classification) {
  if (!Array.isArray(classification)) {
    return [];
  }
  
  return getTeamsByStage(classification, "direct_round_of_16");
}

/**
 * Obtener equipos en zona de Playoff
 * @param {Array} classification - Clasificación completa
 * @returns {Array} Equipos en posiciones 9-24
 */
export function getPlayoffTeams(classification) {
  if (!Array.isArray(classification)) {
    return [];
  }
  
  return getTeamsByStage(classification, "playoff");
}

/**
 * Obtener equipos eliminados
 * @param {Array} classification - Clasificación completa
 * @returns {Array} Equipos en posiciones 25-36
 */
export function getEliminatedTeams(classification) {
  if (!Array.isArray(classification)) {
    return [];
  }
  
  return getTeamsByStage(classification, "eliminated");
}

/**
 * Estimar puntos necesarios para entrar al Top 8
 * @param {Array} classification - Clasificación completa
 * @returns {object} Información sobre puntos necesarios
 */
export function estimatePointsForTop8(classification) {
  if (!Array.isArray(classification) || classification.length === 0) {
    return {
      current8th: null,
      points8th: null,
      estimated: null,
      message: "No hay datos suficientes"
    };
  }
  
  const top8 = getTop8Teams(classification);
  const playoff = getPlayoffTeams(classification);
  
  if (top8.length === 0) {
    return {
      current8th: null,
      points8th: null,
      estimated: null,
      message: "No hay equipos en Top 8"
    };
  }
  
  // Puntos del 8º clasificado
  const points8th = top8[top8.length - 1]?.points || 0;
  
  // Puntos del 9º (primer equipo en playoff)
  const points9th = playoff[0]?.points || 0;
  
  // Estimar puntos necesarios (promedio entre 8º y 9º)
  const estimated = Math.ceil((points8th + points9th) / 2);
  
  return {
    current8th: top8[top8.length - 1],
    points8th,
    points9th,
    estimated,
    message: `Para entrar al Top 8 se necesitan aproximadamente ${estimated} puntos`
  };
}

/**
 * Obtener equipos al borde de la eliminación
 * @param {Array} classification - Clasificación completa
 * @returns {Array} Equipos en posiciones 24-25 (borde entre playoff y eliminación)
 */
export function getTeamsOnEliminationEdge(classification) {
  if (!Array.isArray(classification)) {
    return [];
  }
  
  // Equipos en posiciones 24 (último playoff) y 25 (primer eliminado)
  return classification.filter(team => 
    team.position === 24 || team.position === 25
  );
}

/**
 * Obtener resumen completo de clasificación
 * @param {Array} classification - Clasificación completa
 * @returns {object} Resumen con estadísticas
 */
export function getChampionsSummary(classification) {
  if (!Array.isArray(classification)) {
    return {
      totalTeams: 0,
      top8: [],
      playoff: [],
      eliminated: [],
      pointsRange: { min: 0, max: 0 }
    };
  }
  
  const top8 = getTop8Teams(classification);
  const playoff = getPlayoffTeams(classification);
  const eliminated = getEliminatedTeams(classification);
  
  const allPoints = classification
    .map(team => team.points || 0)
    .filter(points => points > 0);
  
  const pointsRange = {
    min: allPoints.length > 0 ? Math.min(...allPoints) : 0,
    max: allPoints.length > 0 ? Math.max(...allPoints) : 0
  };
  
  return {
    totalTeams: classification.length,
    top8: top8.length,
    playoff: playoff.length,
    eliminated: eliminated.length,
    pointsRange,
    top8Teams: top8,
    playoffTeams: playoff,
    eliminatedTeams: eliminated
  };
}

/**
 * Buscar equipo por nombre
 * @param {Array} classification - Clasificación completa
 * @param {string} teamName - Nombre del equipo (búsqueda parcial)
 * @returns {object|null} Equipo encontrado o null
 */
export function findTeamByName(classification, teamName) {
  if (!Array.isArray(classification) || !teamName) {
    return null;
  }
  
  const searchName = teamName.toLowerCase().trim();
  
  return classification.find(team => 
    team.teamName?.toLowerCase().includes(searchName) ||
    team.equipo?.toLowerCase().includes(searchName) ||
    team.team?.name?.toLowerCase().includes(searchName)
  ) || null;
}
