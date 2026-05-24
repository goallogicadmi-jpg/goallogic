/**
 * Motor de simulación de partidos y rondas
 * UEFA Champions League 2024+
 * 
 * Genera resultados aleatorios para partidos (útil para pruebas y predicciones)
 */

import { advanceWinners } from './bracketEngine';

/**
 * Simula un partido de ida y vuelta
 * 
 * @param {Object} match - Partido a simular
 * @param {Object} options - Opciones de simulación
 * @returns {Object} Partido con resultados simulados
 */
export function simulateMatchTwoLegs(match, options = {}) {
  if (!match || !match.homeTeam || !match.awayTeam) {
    console.warn('⚠️ [simulateMatchTwoLegs] Partido inválido');
    return match;
  }

  const {
    minGoals = 0,
    maxGoals = 4,
    homeAdvantage = 0.3, // Ventaja de jugar en casa (0-1)
    useTeamStrength = false // Si usar puntos/posición para calcular probabilidades
  } = options;

  // Calcular fuerza relativa de los equipos (opcional)
  let homeStrength = 0.5;
  let awayStrength = 0.5;

  if (useTeamStrength && match.homeTeam.points && match.awayTeam.points) {
    const totalPoints = match.homeTeam.points + match.awayTeam.points;
    homeStrength = match.homeTeam.points / totalPoints;
    awayStrength = match.awayTeam.points / totalPoints;
  }

  // Simular partido de ida
  const firstLegHomeScore = simulateSingleMatchScore(
    homeStrength + homeAdvantage,
    awayStrength,
    minGoals,
    maxGoals
  );
  const firstLegAwayScore = simulateSingleMatchScore(
    awayStrength,
    homeStrength + homeAdvantage,
    minGoals,
    maxGoals
  );

  // Simular partido de vuelta
  const secondLegHomeScore = simulateSingleMatchScore(
    awayStrength + homeAdvantage, // awayTeam juega en casa en la vuelta
    homeStrength,
    minGoals,
    maxGoals
  );
  const secondLegAwayScore = simulateSingleMatchScore(
    homeStrength, // homeTeam juega fuera en la vuelta
    awayStrength + homeAdvantage,
    minGoals,
    maxGoals
  );

  // Calcular global
  const totalHomeGoals = firstLegHomeScore + secondLegAwayScore;
  const totalAwayGoals = firstLegAwayScore + secondLegHomeScore;

  // Determinar ganador
  let winner = null;
  if (totalHomeGoals > totalAwayGoals) {
    winner = match.homeTeam;
  } else if (totalAwayGoals > totalHomeGoals) {
    winner = match.awayTeam;
  } else {
    // Ya no existe la regla del gol de visitante.
    // Si el global queda empatado, se define en prórroga o penales.
    winner = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
  }

  return {
    ...match,
    firstLeg: {
      homeScore: firstLegHomeScore,
      awayScore: firstLegAwayScore,
      played: true
    },
    secondLeg: {
      homeScore: secondLegHomeScore,
      awayScore: secondLegAwayScore,
      played: true
    },
    aggregateScore: {
      home: totalHomeGoals,
      away: totalAwayGoals
    },
    winner,
    status: "completed"
  };
}

/**
 * Simula un partido único (final)
 * 
 * @param {Object} match - Partido de final a simular
 * @param {Object} options - Opciones de simulación
 * @returns {Object} Partido con resultado simulado
 */
export function simulateMatchSingleLeg(match, options = {}) {
  if (!match || !match.homeTeam || !match.awayTeam) {
    console.warn('⚠️ [simulateMatchSingleLeg] Partido inválido');
    return match;
  }

  const {
    minGoals = 0,
    maxGoals = 4,
    useTeamStrength = false
  } = options;

  let homeStrength = 0.5;
  let awayStrength = 0.5;

  if (useTeamStrength && match.homeTeam.points && match.awayTeam.points) {
    const totalPoints = match.homeTeam.points + match.awayTeam.points;
    homeStrength = match.homeTeam.points / totalPoints;
    awayStrength = match.awayTeam.points / totalPoints;
  }

  const homeScore = simulateSingleMatchScore(homeStrength, awayStrength, minGoals, maxGoals);
  const awayScore = simulateSingleMatchScore(awayStrength, homeStrength, minGoals, maxGoals);

  let winner = null;
  if (homeScore > awayScore) {
    winner = match.homeTeam;
  } else if (awayScore > homeScore) {
    winner = match.awayTeam;
  } else {
    // Empate en final: simular prórroga/penales
    winner = Math.random() > 0.5 ? match.homeTeam : match.awayTeam;
  }

  return {
    ...match,
    finalScore: {
      homeScore,
      awayScore,
      played: true
    },
    winner,
    status: "completed"
  };
}

/**
 * Simula una ronda completa de partidos
 * 
 * @param {Array} matches - Array de partidos de la ronda
 * @param {string} roundName - Nombre de la ronda
 * @param {Object} options - Opciones de simulación
 * @returns {Array} Array de partidos con resultados simulados
 */
export function simulateRound(matches, roundName = "roundOf16", options = {}) {
  if (!Array.isArray(matches) || matches.length === 0) {
    console.warn(`⚠️ [simulateRound] Array de partidos vacío para ${roundName}`);
    return [];
  }

  const isSingleLeg = roundName === "final";

  return matches.map(match => {
    if (isSingleLeg) {
      return simulateMatchSingleLeg(match, options);
    } else {
      return simulateMatchTwoLegs(match, options);
    }
  });
}

/**
 * Simula el bracket completo desde el playoff hasta la final
 * 
 * @param {Object} bracket - Bracket inicial (puede estar vacío o parcialmente completado)
 * @param {Object} options - Opciones de simulación
 * @returns {Object} Bracket completo con todos los resultados simulados
 */
export function simulateFullBracket(bracket, options = {}) {
  if (!bracket) {
    console.warn('⚠️ [simulateFullBracket] Bracket inválido');
    return null;
  }

  const simulatedBracket = { ...bracket };

  // Simular playoff si no está completado
  if (simulatedBracket.playoff && simulatedBracket.playoff.length > 0) {
    const allCompleted = simulatedBracket.playoff.every(m => m.status === "completed");
    if (!allCompleted) {
      simulatedBracket.playoff = simulateRound(simulatedBracket.playoff, "playoff", options);
    }
  }

  // Avanzar a roundOf16 y simular
  if (simulatedBracket.playoff && simulatedBracket.playoff.length > 0) {
    const allPlayoffCompleted = simulatedBracket.playoff.every(m => m.status === "completed");
    if (allPlayoffCompleted) {
      simulatedBracket.roundOf16 = advanceWinners(simulatedBracket.playoff, "roundOf16");
      simulatedBracket.roundOf16 = simulateRound(simulatedBracket.roundOf16, "roundOf16", options);
    }
  }

  // Avanzar a quarterFinals y simular
  if (simulatedBracket.roundOf16 && simulatedBracket.roundOf16.length > 0) {
    const allRoundOf16Completed = simulatedBracket.roundOf16.every(m => m.status === "completed");
    if (allRoundOf16Completed) {
      simulatedBracket.quarterFinals = advanceWinners(simulatedBracket.roundOf16, "quarterFinals");
      simulatedBracket.quarterFinals = simulateRound(simulatedBracket.quarterFinals, "quarterFinals", options);
    }
  }

  // Avanzar a semiFinals y simular
  if (simulatedBracket.quarterFinals && simulatedBracket.quarterFinals.length > 0) {
    const allQuarterFinalsCompleted = simulatedBracket.quarterFinals.every(m => m.status === "completed");
    if (allQuarterFinalsCompleted) {
      simulatedBracket.semiFinals = advanceWinners(simulatedBracket.quarterFinals, "semiFinals");
      simulatedBracket.semiFinals = simulateRound(simulatedBracket.semiFinals, "semiFinals", options);
    }
  }

  // Avanzar a final y simular
  if (simulatedBracket.semiFinals && simulatedBracket.semiFinals.length > 0) {
    const allSemiFinalsCompleted = simulatedBracket.semiFinals.every(m => m.status === "completed");
    if (allSemiFinalsCompleted) {
      const finalMatches = advanceWinners(simulatedBracket.semiFinals, "final");
      if (finalMatches.length > 0) {
        simulatedBracket.final = simulateMatchSingleLeg(finalMatches[0], options);
      }
    }
  }

  // Actualizar estado
  if (simulatedBracket.final && simulatedBracket.final.status === "completed") {
    simulatedBracket.status = "completed";
  } else {
    simulatedBracket.status = "in_progress";
  }

  console.log(`✅ [simulateFullBracket] Bracket simulado completamente`);
  return simulatedBracket;
}

/**
 * Función auxiliar para simular el resultado de un partido individual
 * 
 * @param {number} team1Strength - Fuerza del equipo 1 (0-1)
 * @param {number} team2Strength - Fuerza del equipo 2 (0-1)
 * @param {number} minGoals - Goles mínimos
 * @param {number} maxGoals - Goles máximos
 * @returns {number} Número de goles anotados
 */
function simulateSingleMatchScore(team1Strength, team2Strength, minGoals, maxGoals) {
  // Normalizar fuerzas
  const totalStrength = team1Strength + team2Strength;
  const normalizedTeam1 = totalStrength > 0 ? team1Strength / totalStrength : 0.5;

  // Calcular probabilidad de anotar
  const goalProbability = normalizedTeam1 * 0.4 + 0.2; // Entre 0.2 y 0.6

  // Simular goles usando distribución de Poisson simplificada
  let goals = 0;
  for (let i = 0; i < maxGoals; i++) {
    if (Math.random() < goalProbability) {
      goals++;
    }
  }

  // Asegurar que esté en el rango
  return Math.max(minGoals, Math.min(goals, maxGoals));
}
