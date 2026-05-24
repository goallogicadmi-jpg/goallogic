/**
 * Módulo de cálculo de tabla Champions League
 * Ordena equipos según criterios oficiales UEFA
 */

import { championsLeagueConfig } from '../config/championsLeagueConfig';

/**
 * Comparar dos equipos según criterios de desempate
 * @param {object} teamA - Equipo A
 * @param {object} teamB - Equipo B
 * @returns {number} -1 si A < B, 1 si A > B, 0 si iguales
 */
function compareTeams(teamA, teamB) {
  const { tiebreakers } = championsLeagueConfig;
  
  // 1. Comparar por puntos
  const pointsA = teamA.points || teamA.puntos || 0;
  const pointsB = teamB.points || teamB.puntos || 0;
  
  if (pointsA !== pointsB) {
    return pointsB - pointsA; // Mayor puntos primero
  }
  
  // 2. Comparar por diferencia de gol
  const goalDiffA = teamA.goalsDiff || teamA.diferencia || teamA.goalDifference || 0;
  const goalDiffB = teamB.goalsDiff || teamB.diferencia || teamB.goalDifference || 0;
  
  if (goalDiffA !== goalDiffB) {
    return goalDiffB - goalDiffA; // Mayor diferencia primero
  }
  
  // 3. Comparar por goles a favor
  const goalsForA = teamA.goalsFor || teamA.golesFavor || 0;
  const goalsForB = teamB.goalsFor || teamB.golesFavor || 0;
  
  if (goalsForA !== goalsForB) {
    return goalsForB - goalsForA; // Mayor goles a favor primero
  }
  
  // Si todo es igual, mantener orden original
  return 0;
}

/**
 * Calcular tabla de Champions League ordenada
 * @param {Array} rawTeams - Array de equipos sin ordenar
 * @returns {Array} Tabla ordenada con posiciones asignadas
 */
export function computeChampionsTable(rawTeams) {
  if (!Array.isArray(rawTeams) || rawTeams.length === 0) {
    console.warn('⚠️ [computeChampionsTable] Array vacío o inválido');
    return [];
  }
  
  // Crear copia del array para no mutar el original
  const teams = rawTeams.map((team, index) => ({
    ...team,
    // Normalizar campos comunes
    points: team.points || team.puntos || 0,
    goalsDiff: team.goalsDiff || team.diferencia || team.goalDifference || 0,
    goalsFor: team.goalsFor || team.golesFavor || 0,
    goalsAgainst: team.goalsAgainst || team.golesContra || 0,
    played: team.played || team.jugados || 0,
    won: team.won || team.ganados || 0,
    drawn: team.drawn || team.empatados || 0,
    lost: team.lost || team.perdidos || 0,
    form: team.form || team.forma || "",
    logo: team.logo || team.team?.logo || null,
    teamId: team.teamId || team.equipoId || team.team?.id || team.id,
    teamName: team.teamName || team.equipo || team.team?.name || team.name,
    _originalIndex: index
  }));
  
  // Ordenar equipos según criterios oficiales
  const sortedTeams = [...teams].sort(compareTeams);
  
  // Asignar posición final (1-36)
  const tableWithPositions = sortedTeams.map((team, index) => ({
    ...team,
    position: index + 1,
    // Mantener datos originales para compatibilidad
    originalData: rawTeams[team._originalIndex]
  }));
  
  console.log(`✅ [computeChampionsTable] Tabla calculada: ${tableWithPositions.length} equipos ordenados`);
  
  return tableWithPositions;
}
