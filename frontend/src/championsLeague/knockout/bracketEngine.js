/**
 * Motor de bracket (árbol de eliminatorias)
 * UEFA Champions League 2024+
 * 
 * Gestiona la estructura completa del torneo eliminatorio
 */

import { championsKnockoutConfig } from './config';

/**
 * Crea un bracket vacío con la estructura base
 * 
 * @returns {Object} Bracket vacío con todas las rondas
 */
export function createEmptyBracket() {
  return {
    playoff: [],
    roundOf16: [],
    quarterFinals: [],
    semiFinals: [],
    final: null, // La final es un solo partido, no un array
    status: "not_started" // not_started, in_progress, completed
  };
}

/**
 * Avanza los ganadores de una ronda a la siguiente
 * 
 * @param {Array} currentRoundMatches - Array de partidos de la ronda actual
 * @param {string} nextRoundName - Nombre de la siguiente ronda
 * @returns {Array} Array de partidos para la siguiente ronda
 */
export function advanceWinners(currentRoundMatches, nextRoundName) {
  if (!Array.isArray(currentRoundMatches) || currentRoundMatches.length === 0) {
    console.warn(`⚠️ [advanceWinners] No hay partidos en la ronda actual para avanzar a ${nextRoundName}`);
    return [];
  }

  // Extraer ganadores
  const winners = currentRoundMatches
    .filter(match => match.winner !== null)
    .map(match => match.winner);

  if (winners.length === 0) {
    console.warn(`⚠️ [advanceWinners] No hay ganadores en la ronda actual`);
    return [];
  }

  // Verificar que el número de ganadores sea correcto para la siguiente ronda
  const expectedTeams = championsKnockoutConfig.teamsPerRound[nextRoundName];
  if (winners.length !== expectedTeams) {
    console.warn(`⚠️ [advanceWinners] Se esperaban ${expectedTeams} ganadores, se encontraron ${winners.length}`);
  }

  // Generar partidos para la siguiente ronda
  const nextRoundMatches = [];

  if (nextRoundName === "final") {
    // La final es un solo partido entre los 2 ganadores de semifinales
    if (winners.length === 2) {
      nextRoundMatches.push({
        id: "FINAL-1",
        round: "final",
        homeTeam: winners[0],
        awayTeam: winners[1],
        finalScore: {
          homeScore: null,
          awayScore: null,
          played: false
        },
        winner: null,
        status: "scheduled"
      });
    } else {
      console.warn(`⚠️ [advanceWinners] La final requiere 2 equipos, se encontraron ${winners.length}`);
    }
  } else {
    // Para otras rondas, emparejar ganadores de 2 en 2
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        const matchNumber = Math.floor(i / 2) + 1;
        nextRoundMatches.push({
          id: `${nextRoundName.toUpperCase()}-${matchNumber}`,
          round: nextRoundName,
          homeTeam: winners[i],
          awayTeam: winners[i + 1],
          firstLeg: {
            homeScore: null,
            awayScore: null,
            played: false
          },
          secondLeg: {
            homeScore: null,
            awayScore: null,
            played: false
          },
          aggregateScore: {
            home: null,
            away: null
          },
          winner: null,
          status: "scheduled"
        });
      }
    }
  }

  console.log(`✅ [advanceWinners] Generados ${nextRoundMatches.length} partidos para ${nextRoundName}`);
  return nextRoundMatches;
}

/**
 * Construye el bracket completo desde el playoff hasta la final
 * 
 * @param {Object} bracketData - Objeto con playoff, roundOf16, etc.
 * @returns {Object} Bracket completo con todas las rondas avanzadas
 */
export function buildFullBracket(bracketData) {
  const bracket = {
    ...createEmptyBracket(),
    ...bracketData
  };

  // Avanzar desde playoff a roundOf16 (si ya está resuelto)
  if (bracket.playoff && bracket.playoff.length > 0) {
    const allPlayoffCompleted = bracket.playoff.every(m => m.status === "completed");
    if (allPlayoffCompleted && bracket.roundOf16.length === 0) {
      bracket.roundOf16 = advanceWinners(bracket.playoff, "roundOf16");
    }
  }

  // Avanzar desde roundOf16 a quarterFinals
  if (bracket.roundOf16 && bracket.roundOf16.length > 0) {
    const allRoundOf16Completed = bracket.roundOf16.every(m => m.status === "completed");
    if (allRoundOf16Completed && bracket.quarterFinals.length === 0) {
      bracket.quarterFinals = advanceWinners(bracket.roundOf16, "quarterFinals");
    }
  }

  // Avanzar desde quarterFinals a semiFinals
  if (bracket.quarterFinals && bracket.quarterFinals.length > 0) {
    const allQuarterFinalsCompleted = bracket.quarterFinals.every(m => m.status === "completed");
    if (allQuarterFinalsCompleted && bracket.semiFinals.length === 0) {
      bracket.semiFinals = advanceWinners(bracket.quarterFinals, "semiFinals");
    }
  }

  // Avanzar desde semiFinals a final
  if (bracket.semiFinals && bracket.semiFinals.length > 0) {
    const allSemiFinalsCompleted = bracket.semiFinals.every(m => m.status === "completed");
    if (allSemiFinalsCompleted && bracket.final === null) {
      const finalMatches = advanceWinners(bracket.semiFinals, "final");
      bracket.final = finalMatches.length > 0 ? finalMatches[0] : null;
    }
  }

  // Actualizar estado del bracket
  if (bracket.final && bracket.final.status === "completed") {
    bracket.status = "completed";
  } else if (bracket.playoff && bracket.playoff.length > 0) {
    bracket.status = "in_progress";
  }

  return bracket;
}

/**
 * Obtener la ronda actual del bracket
 * 
 * @param {Object} bracket - Bracket completo
 * @returns {string} Nombre de la ronda actual o null
 */
export function getCurrentRound(bracket) {
  if (!bracket) return null;

  if (bracket.final && bracket.final.status === "completed") {
    return "completed";
  }
  if (bracket.final && bracket.final.status !== "scheduled") {
    return "final";
  }
  if (bracket.semiFinals && bracket.semiFinals.length > 0) {
    const allCompleted = bracket.semiFinals.every(m => m.status === "completed");
    return allCompleted ? "final" : "semiFinals";
  }
  if (bracket.quarterFinals && bracket.quarterFinals.length > 0) {
    const allCompleted = bracket.quarterFinals.every(m => m.status === "completed");
    return allCompleted ? "semiFinals" : "quarterFinals";
  }
  if (bracket.roundOf16 && bracket.roundOf16.length > 0) {
    const allCompleted = bracket.roundOf16.every(m => m.status === "completed");
    return allCompleted ? "quarterFinals" : "roundOf16";
  }
  if (bracket.playoff && bracket.playoff.length > 0) {
    const allCompleted = bracket.playoff.every(m => m.status === "completed");
    return allCompleted ? "roundOf16" : "playoff";
  }

  return "not_started";
}

/**
 * Obtener todos los partidos de una ronda específica
 * 
 * @param {Object} bracket - Bracket completo
 * @param {string} roundName - Nombre de la ronda
 * @returns {Array} Array de partidos de esa ronda
 */
export function getRoundMatches(bracket, roundName) {
  if (!bracket) return [];

  if (roundName === "final") {
    return bracket.final ? [bracket.final] : [];
  }

  return bracket[roundName] || [];
}
