/**
 * Helpers para el asistente virtual
 * Funciones de consulta sobre clasificación europea
 */

import { applyCupAllocation } from "./cupAllocation";

/**
 * Obtener equipos clasificados a Champions League
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa (opcional)
 * @returns {Array} Array de equipos clasificados a Champions
 */
export function getChampionsTeams(standings, leagueId, cupWinnerTeamId = null) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  return allocations.filter((team) => team.finalCompetition === "champions");
}

/**
 * Obtener equipos clasificados a Europa League
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa (opcional)
 * @returns {Array} Array de equipos clasificados a Europa
 */
export function getEuropaTeams(standings, leagueId, cupWinnerTeamId = null) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  return allocations.filter((team) => team.finalCompetition === "europa");
}

/**
 * Obtener equipos clasificados a Conference League
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa (opcional)
 * @returns {Array} Array de equipos clasificados a Conference
 */
export function getConferenceTeams(standings, leagueId, cupWinnerTeamId = null) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  return allocations.filter((team) => team.finalCompetition === "conference");
}

/**
 * Obtener equipos descendidos
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @returns {Array} Array de equipos descendidos
 */
export function getRelegatedTeams(standings, leagueId) {
  const allocations = applyCupAllocation(standings, null, leagueId);
  return allocations.filter((team) => team.zone === "relegation");
}

/**
 * Obtener equipos clasificados por copa
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa
 * @returns {Array} Array de equipos clasificados por copa
 */
export function getCupQualifiedTeams(standings, leagueId, cupWinnerTeamId) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  return allocations.filter((team) => team.qualificationSource === "cup");
}

/**
 * Obtener equipos con plaza redistribuida
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa
 * @returns {Array} Array de equipos con plaza redistribuida
 */
export function getInheritedSpots(standings, leagueId, cupWinnerTeamId) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  return allocations.filter((team) => team.qualificationSource === "inherited");
}

/**
 * Obtener resumen completo de clasificación
 * @param {Array} standings - Array de equipos
 * @param {number} leagueId - ID de la liga
 * @param {number} cupWinnerTeamId - ID del campeón de copa (opcional)
 * @returns {object} Resumen con todos los equipos clasificados
 */
export function getClassificationSummary(standings, leagueId, cupWinnerTeamId = null) {
  const allocations = applyCupAllocation(standings, cupWinnerTeamId, leagueId);
  
  return {
    champions: allocations.filter((t) => t.finalCompetition === "champions"),
    europa: allocations.filter((t) => t.finalCompetition === "europa"),
    conference: allocations.filter((t) => t.finalCompetition === "conference"),
    relegation: allocations.filter((t) => t.zone === "relegation"),
    cupQualified: allocations.filter((t) => t.qualificationSource === "cup"),
    inherited: allocations.filter((t) => t.qualificationSource === "inherited"),
  };
}
