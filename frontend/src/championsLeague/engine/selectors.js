/**
 * Pipeline completo de clasificación Champions League
 * Combina cálculo de tabla, asignación de fase y estructura final
 */

import { computeChampionsTable } from './computeChampionsTable';
import { getChampionsStage } from './getChampionsStage';

/**
 * Construir clasificación completa de Champions League
 * @param {Array} rawTeams - Array de equipos sin procesar
 * @returns {Array} Estructura final lista para UI con:
 *   - position: posición final (1-36)
 *   - stage: fase de clasificación
 *   - teamId, teamName, points, goalsDiff, etc.
 */
export function buildChampionsClassification(rawTeams) {
  if (!Array.isArray(rawTeams) || rawTeams.length === 0) {
    console.warn('⚠️ [buildChampionsClassification] Array vacío o inválido');
    return [];
  }
  
  // 1. Calcular tabla ordenada
  const sortedTable = computeChampionsTable(rawTeams);
  
  // 2. Asignar fase a cada equipo
  const classification = sortedTable.map((team) => {
    const stage = getChampionsStage(team.position);
    
    return {
      ...team,
      stage,
      // Datos normalizados para UI
      teamId: team.teamId,
      teamName: team.teamName,
      position: team.position,
      points: team.points,
      goalsDiff: team.goalsDiff,
      goalsFor: team.goalsFor,
      goalsAgainst: team.goalsAgainst,
      played: team.played,
      won: team.won,
      drawn: team.drawn,
      lost: team.lost,
      form: team.form,
      logo: team.logo,
      // Datos originales para compatibilidad
      originalData: team.originalData
    };
  });
  
  console.log(`✅ [buildChampionsClassification] Clasificación construida: ${classification.length} equipos`);
  console.log(`📊 Top 8: ${classification.filter(t => t.stage === 'direct_round_of_16').length}`);
  console.log(`📊 Playoff: ${classification.filter(t => t.stage === 'playoff').length}`);
  console.log(`📊 Eliminados: ${classification.filter(t => t.stage === 'eliminated').length}`);
  
  return classification;
}

/**
 * Obtener equipos de una fase específica
 * @param {Array} classification - Clasificación completa
 * @param {string} stage - Fase: "direct_round_of_16", "playoff", "eliminated"
 * @returns {Array} Equipos de esa fase
 */
export function getTeamsByStage(classification, stage) {
  if (!Array.isArray(classification)) {
    return [];
  }
  
  return classification.filter(team => team.stage === stage);
}

/**
 * Obtener equipo por posición
 * @param {Array} classification - Clasificación completa
 * @param {number} position - Posición (1-36)
 * @returns {object|null} Equipo o null si no existe
 */
export function getTeamByPosition(classification, position) {
  if (!Array.isArray(classification)) {
    return null;
  }
  
  return classification.find(team => team.position === position) || null;
}
