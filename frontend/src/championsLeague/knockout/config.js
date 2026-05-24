/**
 * Configuración central del formato de eliminatorias
 * UEFA Champions League 2024+
 */

export const championsKnockoutConfig = {
  // Rangos de posiciones en la tabla general
  playoffRange: { from: 9, to: 24 },
  directRange: { from: 1, to: 8 },
  
  // Rondas del torneo
  rounds: ["roundOf16", "quarterFinals", "semiFinals", "final"],
  
  // Rondas a doble partido (ida y vuelta)
  twoLeggedRounds: ["playoff", "roundOf16", "quarterFinals", "semiFinals"],
  
  // Rondas a partido único
  singleLegRounds: ["final"],
  
  // Número de equipos por ronda
  teamsPerRound: {
    playoff: 16,      // 8 partidos
    roundOf16: 16,    // 8 partidos
    quarterFinals: 8, // 4 partidos
    semiFinals: 4,    // 2 partidos
    final: 2          // 1 partido
  },
  
  // Reglas de desempate
  tiebreaker: {
    // En caso de empate en el global:
    // 1. Prórroga (si aplica)
    // 2. Penales (si aplica)
    awayGoalsRule: false,
    extraTime: true,
    penalties: true
  }
};

/**
 * Obtener el rango de posiciones para playoff
 */
export function getPlayoffRange() {
  return championsKnockoutConfig.playoffRange;
}

/**
 * Obtener el rango de posiciones para clasificación directa
 */
export function getDirectRange() {
  return championsKnockoutConfig.directRange;
}

/**
 * Verificar si una ronda es a doble partido
 */
export function isTwoLeggedRound(roundName) {
  return championsKnockoutConfig.twoLeggedRounds.includes(roundName);
}

/**
 * Verificar si una ronda es a partido único
 */
export function isSingleLegRound(roundName) {
  return championsKnockoutConfig.singleLegRounds.includes(roundName);
}

/**
 * Obtener el número de equipos esperados en una ronda
 */
export function getTeamsPerRound(roundName) {
  return championsKnockoutConfig.teamsPerRound[roundName] || 0;
}
