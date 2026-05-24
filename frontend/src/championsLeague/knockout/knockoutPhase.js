/**
 * Módulo de generación de fases eliminatorias
 * UEFA Champions League 2024+
 * 
 * Octavos de Final y siguientes rondas
 */

import { getDirectRange } from './config';

/**
 * Genera emparejamientos aproximados de Octavos de Final
 * 
 * @param {Array} top8 - Equipos en posiciones 1-8 de la tabla general
 * @param {Array} playoffWinners - 8 equipos ganadores del playoff
 * @returns {Array} Array de partidos de Octavos de Final
 * 
 * Emparejamiento aproximado cuando no hay bracket oficial desde la API:
 * 1 vs ganador PO-8 (peor clasificado del playoff)
 * 2 vs ganador PO-7
 * 3 vs ganador PO-6
 * 4 vs ganador PO-5
 * 5 vs ganador PO-4
 * 6 vs ganador PO-3
 * 7 vs ganador PO-2
 * 8 vs ganador PO-1 (mejor clasificado del playoff)
 */
export function generateRoundOf16(top8, playoffWinners) {
  if (!Array.isArray(top8) || top8.length !== 8) {
    console.warn('⚠️ [generateRoundOf16] Top 8 incompleto o inválido');
    return [];
  }

  if (!Array.isArray(playoffWinners) || playoffWinners.length !== 8) {
    console.warn('⚠️ [generateRoundOf16] Ganadores de playoff incompletos o inválidos');
    return [];
  }

  // Ordenar ganadores de playoff por posición original (mejor a peor)
  // Asumimos que cada ganador tiene su posición original en la tabla
  const sortedPlayoffWinners = [...playoffWinners].sort((a, b) => {
    const posA = a.position || a.originalPosition || 0;
    const posB = b.position || b.originalPosition || 0;
    return posA - posB; // Menor posición = mejor clasificado
  });

  const matches = [];

  // Emparejar: mejor del Top 8 vs peor del playoff, etc.
  for (let i = 0; i < 8; i++) {
    const top8Team = top8[i]; // Posiciones 1, 2, 3, 4, 5, 6, 7, 8
    const playoffTeam = sortedPlayoffWinners[7 - i]; // Del peor al mejor del playoff

    matches.push({
      id: `R16-${i + 1}`,
      round: "roundOf16",
      homeTeam: {
        id: top8Team.teamId || top8Team.id,
        name: top8Team.teamName || top8Team.equipo || top8Team.name,
        logo: top8Team.logo || top8Team.team?.logo,
        position: top8Team.position || (i + 1),
        points: top8Team.points || top8Team.puntos || 0,
        isTop8: true
      },
      awayTeam: {
        id: playoffTeam.id || playoffTeam.teamId,
        name: playoffTeam.name || playoffTeam.teamName || playoffTeam.equipo,
        logo: playoffTeam.logo || playoffTeam.team?.logo,
        position: playoffTeam.position || playoffTeam.originalPosition,
        points: playoffTeam.points || playoffTeam.puntos || 0,
        isTop8: false
      },
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

  console.log(`✅ [generateRoundOf16] Generados ${matches.length} partidos de Octavos de Final`);
  return matches;
}

/**
 * Resuelve una ronda eliminatoria (aplicable a roundOf16, quarterFinals, semiFinals)
 * 
 * @param {Array} matches - Array de partidos de la ronda con resultados cargados
 * @param {string} roundName - Nombre de la ronda (roundOf16, quarterFinals, semiFinals)
 * @returns {Object} { updatedMatches, winners }
 */
export function resolveKnockoutRound(matches, roundName = "roundOf16") {
  if (!Array.isArray(matches) || matches.length === 0) {
    console.warn(`⚠️ [resolveKnockoutRound] Array de partidos vacío o inválido para ${roundName}`);
    return { updatedMatches: [], winners: [] };
  }

  const updatedMatches = matches.map(match => {
    // Verificar que ambos partidos (ida y vuelta) se hayan jugado
    const firstLegPlayed = match.firstLeg?.played === true;
    const secondLegPlayed = match.secondLeg?.played === true;

    if (!firstLegPlayed || !secondLegPlayed) {
      return {
        ...match,
        status: firstLegPlayed || secondLegPlayed ? "in_progress" : "scheduled"
      };
    }

    // Calcular global
    const homeGoalsFirstLeg = match.firstLeg.homeScore || 0;
    const awayGoalsFirstLeg = match.firstLeg.awayScore || 0;
    
    const homeGoalsSecondLeg = match.secondLeg.awayScore || 0; // homeTeam juega fuera en la vuelta
    const awayGoalsSecondLeg = match.secondLeg.homeScore || 0; // awayTeam juega en casa en la vuelta

    const totalHomeGoals = homeGoalsFirstLeg + homeGoalsSecondLeg;
    const totalAwayGoals = awayGoalsFirstLeg + awayGoalsSecondLeg;

    const aggregateScore = {
      home: totalHomeGoals,
      away: totalAwayGoals
    };

    // Determinar ganador
    let winner = null;
    if (totalHomeGoals > totalAwayGoals) {
      winner = match.homeTeam;
    } else if (totalAwayGoals > totalHomeGoals) {
      winner = match.awayTeam;
    } else if (match.tieBreak?.type === "penalties") {
      if ((match.tieBreak.home || 0) > (match.tieBreak.away || 0)) {
        winner = match.homeTeam;
      } else if ((match.tieBreak.away || 0) > (match.tieBreak.home || 0)) {
        winner = match.awayTeam;
      }
    } else {
      // Desde 2021 ya no existe la regla del gol de visitante.
      console.warn(`⚠️ [resolveKnockoutRound] Empate total en partido ${match.id}. Se requiere prórroga/penales.`);
      winner = null;
    }

    return {
      ...match,
      aggregateScore,
      winner,
      status: winner ? "completed" : "tied"
    };
  });

  // Extraer ganadores
  const winners = updatedMatches
    .filter(match => match.winner !== null)
    .map(match => match.winner);

  console.log(`✅ [resolveKnockoutRound] Resueltos ${winners.length} de ${matches.length} partidos en ${roundName}`);
  
  return {
    updatedMatches,
    winners
  };
}

/**
 * Resuelve la final (partido único)
 * 
 * @param {Object} match - Partido de la final con resultado cargado
 * @returns {Object} { updatedMatch, winner }
 */
export function resolveFinal(match) {
  if (!match || !match.finalScore) {
    console.warn('⚠️ [resolveFinal] Partido de final sin resultado');
    return { updatedMatch: match, winner: null };
  }

  const { homeScore, awayScore, played } = match.finalScore;

  if (!played) {
    return {
      updatedMatch: {
        ...match,
        status: "scheduled"
      },
      winner: null
    };
  }

  let winner = null;
  if (homeScore > awayScore) {
    winner = match.homeTeam;
  } else if (awayScore > homeScore) {
    winner = match.awayTeam;
  } else {
    // Empate en final: se requiere prórroga y penales
    console.warn('⚠️ [resolveFinal] Empate en final. Se requiere prórroga/penales.');
    winner = null;
  }

  const updatedMatch = {
    ...match,
    winner,
    status: winner ? "completed" : "tied"
  };

  console.log(`✅ [resolveFinal] Final resuelta. Ganador: ${winner?.name || "Pendiente"}`);
  
  return {
    updatedMatch,
    winner
  };
}

/**
 * Obtener equipos del Top 8 desde la tabla general
 * 
 * @param {Array} leagueTable - Clasificación final de 36 equipos
 * @returns {Array} Array de 8 equipos (posiciones 1-8)
 */
export function getTop8Teams(leagueTable) {
  if (!Array.isArray(leagueTable) || leagueTable.length < 8) {
    return [];
  }

  const { from } = getDirectRange();
  return leagueTable.slice(0, 8); // Primeros 8 equipos
}
