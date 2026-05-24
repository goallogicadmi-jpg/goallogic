/**
 * Helpers para el asistente virtual
 * UEFA Champions League 2024+
 * 
 * Funciones que permiten al asistente responder preguntas sobre el bracket
 */

import { getCurrentRound, getRoundMatches } from './bracketEngine';

/**
 * Obtiene la ronda actual del torneo
 * 
 * @param {Object} bracket - Bracket completo
 * @returns {string} Nombre de la ronda actual
 */
export function getCurrentStage(bracket) {
  if (!bracket) {
    return "not_started";
  }

  return getCurrentRound(bracket) || "not_started";
}

/**
 * Busca un partido donde participe un equipo específico
 * 
 * @param {Object} bracket - Bracket completo
 * @param {string} teamName - Nombre del equipo a buscar
 * @returns {Object|null} Partido encontrado o null
 */
export function getMatchByTeam(bracket, teamName) {
  if (!bracket || !teamName) {
    return null;
  }

  const normalizedTeamName = teamName.toLowerCase().trim();

  // Buscar en todas las rondas
  const rounds = ["playoff", "roundOf16", "quarterFinals", "semiFinals", "final"];

  for (const roundName of rounds) {
    const matches = getRoundMatches(bracket, roundName);

    for (const match of matches) {
      if (!match) continue;

      const homeName = (match.homeTeam?.name || "").toLowerCase().trim();
      const awayName = (match.awayTeam?.name || "").toLowerCase().trim();

      if (homeName.includes(normalizedTeamName) || awayName.includes(normalizedTeamName)) {
        return {
          ...match,
          round: roundName
        };
      }
    }
  }

  return null;
}

/**
 * Obtiene el campeón actual (si la final ya se jugó)
 * 
 * @param {Object} bracket - Bracket completo
 * @returns {Object|null} Equipo campeón o null si aún no hay campeón
 */
export function getChampion(bracket) {
  if (!bracket || !bracket.final) {
    return null;
  }

  if (bracket.final.status === "completed" && bracket.final.winner) {
    return bracket.final.winner;
  }

  return null;
}

/**
 * Obtiene los partidos pendientes (sin resultado)
 * 
 * @param {Object} bracket - Bracket completo
 * @returns {Array} Array de partidos pendientes
 */
export function getUpcomingMatches(bracket) {
  if (!bracket) {
    return [];
  }

  const upcomingMatches = [];
  const rounds = ["playoff", "roundOf16", "quarterFinals", "semiFinals", "final"];

  for (const roundName of rounds) {
    const matches = getRoundMatches(bracket, roundName);

    for (const match of matches) {
      if (!match) continue;

      // Verificar si el partido está pendiente
      const isPending = 
        match.status === "scheduled" || 
        match.status === "in_progress" ||
        (match.status === "tied" && !match.winner);

      if (isPending) {
        upcomingMatches.push({
          ...match,
          round: roundName
        });
      }
    }
  }

  return upcomingMatches;
}

/**
 * Obtiene los equipos clasificados a una ronda específica
 * 
 * @param {Object} bracket - Bracket completo
 * @param {string} roundName - Nombre de la ronda
 * @returns {Array} Array de equipos clasificados
 */
export function getQualifiedTeams(bracket, roundName) {
  if (!bracket) {
    return [];
  }

  const matches = getRoundMatches(bracket, roundName);

  if (roundName === "roundOf16") {
    // Para octavos, incluir Top 8 + ganadores de playoff
    const top8 = [];
    const playoffWinners = [];

    // Extraer Top 8 de los partidos de octavos
    matches.forEach(match => {
      if (match.homeTeam?.isTop8) {
        top8.push(match.homeTeam);
      }
      if (match.awayTeam && !match.awayTeam.isTop8) {
        playoffWinners.push(match.awayTeam);
      }
    });

    return [...top8, ...playoffWinners];
  }

  // Para otras rondas, extraer ganadores de la ronda anterior
  const previousRound = getPreviousRound(roundName);
  if (previousRound) {
    const previousMatches = getRoundMatches(bracket, previousRound);
    return previousMatches
      .filter(m => m.winner !== null)
      .map(m => m.winner);
  }

  return [];
}

/**
 * Obtiene el rival de un equipo en la siguiente ronda (si ya está definido)
 * 
 * @param {Object} bracket - Bracket completo
 * @param {string} teamName - Nombre del equipo
 * @returns {Object|null} Rival o null si aún no está definido
 */
export function getNextOpponent(bracket, teamName) {
  if (!bracket || !teamName) {
    return null;
  }

  const normalizedTeamName = teamName.toLowerCase().trim();
  const currentRound = getCurrentStage(bracket);

  // Determinar la siguiente ronda
  const nextRound = getNextRound(currentRound);
  if (!nextRound) {
    return null; // Ya está en la final o el torneo terminó
  }

  // Buscar si el equipo ya tiene un partido en la siguiente ronda
  const nextRoundMatches = getRoundMatches(bracket, nextRound);
  
  for (const match of nextRoundMatches) {
    if (!match) continue;

    const homeName = (match.homeTeam?.name || "").toLowerCase().trim();
    const awayName = (match.awayTeam?.name || "").toLowerCase().trim();

    if (homeName.includes(normalizedTeamName)) {
      return match.awayTeam;
    }
    if (awayName.includes(normalizedTeamName)) {
      return match.homeTeam;
    }
  }

  return null;
}

/**
 * Obtiene un resumen del estado actual del bracket
 * 
 * @param {Object} bracket - Bracket completo
 * @returns {Object} Resumen del estado
 */
export function getBracketSummary(bracket) {
  if (!bracket) {
    return {
      status: "not_started",
      currentRound: null,
      champion: null,
      upcomingMatches: 0,
      completedMatches: 0
    };
  }

  const currentRound = getCurrentStage(bracket);
  const champion = getChampion(bracket);
  const upcomingMatches = getUpcomingMatches(bracket);

  // Contar partidos completados
  let completedMatches = 0;
  const rounds = ["playoff", "roundOf16", "quarterFinals", "semiFinals", "final"];
  
  for (const roundName of rounds) {
    const matches = getRoundMatches(bracket, roundName);
    completedMatches += matches.filter(m => m && m.status === "completed").length;
  }

  return {
    status: bracket.status || "not_started",
    currentRound,
    champion,
    upcomingMatches: upcomingMatches.length,
    completedMatches,
    totalRounds: rounds.length
  };
}

/**
 * Función auxiliar: obtener la ronda anterior
 */
function getPreviousRound(roundName) {
  const roundOrder = ["playoff", "roundOf16", "quarterFinals", "semiFinals", "final"];
  const index = roundOrder.indexOf(roundName);
  return index > 0 ? roundOrder[index - 1] : null;
}

/**
 * Función auxiliar: obtener la siguiente ronda
 */
function getNextRound(roundName) {
  const roundOrder = ["playoff", "roundOf16", "quarterFinals", "semiFinals", "final"];
  const index = roundOrder.indexOf(roundName);
  return index >= 0 && index < roundOrder.length - 1 ? roundOrder[index + 1] : null;
}
