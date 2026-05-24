/**
 * Módulo de generación y resolución de la fase de Playoff
 * UEFA Champions League 2024+
 * 
 * El playoff enfrenta a los equipos en posiciones 9-24 de la tabla general
 */

import { getPlayoffRange } from './config';

/**
 * Genera emparejamientos aproximados de la fase de playoff
 * 
 * @param {Array} leagueTable - Clasificación final de 36 equipos (ya ordenados)
 * @returns {Array} Array de partidos de playoff
 * 
 * Emparejamiento aproximado cuando no hay bracket oficial desde la API:
 * 9 vs 24
 * 10 vs 23
 * 11 vs 22
 * 12 vs 21
 * 13 vs 20
 * 14 vs 19
 * 15 vs 18
 * 16 vs 17
 */
export function generatePlayoffMatches(leagueTable) {
  if (!Array.isArray(leagueTable) || leagueTable.length < 24) {
    console.warn('⚠️ [generatePlayoffMatches] Tabla incompleta o inválida');
    return [];
  }

  const { from, to } = getPlayoffRange();
  const playoffTeams = leagueTable.slice(from - 1, to); // from-1 porque el array es 0-indexed

  if (playoffTeams.length !== 16) {
    console.warn(`⚠️ [generatePlayoffMatches] Se esperaban 16 equipos, se encontraron ${playoffTeams.length}`);
    return [];
  }

  const matches = [];
  
  // Emparejar: primero vs último, segundo vs penúltimo, etc.
  for (let i = 0; i < 8; i++) {
    const homeTeam = playoffTeams[i]; // Posiciones 9, 10, 11, 12, 13, 14, 15, 16
    const awayTeam = playoffTeams[15 - i]; // Posiciones 24, 23, 22, 21, 20, 19, 18, 17

    matches.push({
      id: `PO-${i + 1}`,
      round: "playoff",
      homeTeam: {
        id: homeTeam.teamId || homeTeam.id,
        name: homeTeam.teamName || homeTeam.equipo || homeTeam.name,
        logo: homeTeam.logo || homeTeam.team?.logo,
        position: homeTeam.position || (from + i),
        points: homeTeam.points || homeTeam.puntos || 0,
        goalsDiff: homeTeam.goalsDiff || homeTeam.diferencia || 0
      },
      awayTeam: {
        id: awayTeam.teamId || awayTeam.id,
        name: awayTeam.teamName || awayTeam.equipo || awayTeam.name,
        logo: awayTeam.logo || awayTeam.team?.logo,
        position: awayTeam.position || (to - i),
        points: awayTeam.points || awayTeam.puntos || 0,
        goalsDiff: awayTeam.goalsDiff || awayTeam.diferencia || 0
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
      status: "scheduled" // scheduled, in_progress, completed
    });
  }

  console.log(`✅ [generatePlayoffMatches] Generados ${matches.length} partidos de playoff`);
  return matches;
}

/**
 * Resuelve una ronda de playoff calculando los ganadores
 * 
 * @param {Array} matches - Array de partidos de playoff con resultados cargados
 * @returns {Object} { updatedMatches, winners }
 */
export function resolvePlayoffRound(matches) {
  if (!Array.isArray(matches) || matches.length === 0) {
    console.warn('⚠️ [resolvePlayoffRound] Array de partidos vacío o inválido');
    return { updatedMatches: [], winners: [] };
  }

  const updatedMatches = matches.map(match => {
    // Verificar que ambos partidos (ida y vuelta) se hayan jugado
    const firstLegPlayed = match.firstLeg?.played === true;
    const secondLegPlayed = match.secondLeg?.played === true;

    if (!firstLegPlayed || !secondLegPlayed) {
      // Partido aún no completado
      return {
        ...match,
        status: firstLegPlayed || secondLegPlayed ? "in_progress" : "scheduled"
      };
    }

    // Calcular global
    // En la ida: homeTeam juega en casa, awayTeam juega fuera
    // En la vuelta: homeTeam juega fuera, awayTeam juega en casa
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
      // Un empate global requiere prórroga o penales para definir el ganador.
      console.warn(`⚠️ [resolvePlayoffRound] Empate total en partido ${match.id}. Se requiere prórroga/penales.`);
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

  console.log(`✅ [resolvePlayoffRound] Resueltos ${winners.length} de ${matches.length} partidos`);
  
  return {
    updatedMatches,
    winners
  };
}

/**
 * Obtener equipos que participan en el playoff desde la tabla general
 * 
 * @param {Array} leagueTable - Clasificación final de 36 equipos
 * @returns {Array} Array de 16 equipos (posiciones 9-24)
 */
export function getPlayoffTeams(leagueTable) {
  if (!Array.isArray(leagueTable) || leagueTable.length < 24) {
    return [];
  }

  const { from, to } = getPlayoffRange();
  return leagueTable.slice(from - 1, to);
}
