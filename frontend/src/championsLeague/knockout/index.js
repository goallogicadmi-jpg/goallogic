/**
 * Punto de entrada del módulo de eliminatorias
 * UEFA Champions League 2024+
 * 
 * Exporta todas las funciones y configuraciones necesarias
 */

// Configuración
export {
  championsKnockoutConfig,
  getPlayoffRange,
  getDirectRange,
  isTwoLeggedRound,
  isSingleLegRound,
  getTeamsPerRound
} from './config';

// Playoff
export {
  generatePlayoffMatches,
  resolvePlayoffRound,
  getPlayoffTeams
} from './playoffPhase';

// Knockout (Octavos y siguientes)
export {
  generateRoundOf16,
  resolveKnockoutRound,
  resolveFinal,
  getTop8Teams
} from './knockoutPhase';

// Bracket Engine
export {
  createEmptyBracket,
  advanceWinners,
  buildFullBracket,
  getCurrentRound,
  getRoundMatches
} from './bracketEngine';

// Simulación
export {
  simulateMatchTwoLegs,
  simulateMatchSingleLeg,
  simulateRound,
  simulateFullBracket
} from './simulationEngine';

// Helpers para el asistente virtual
export {
  getCurrentStage,
  getMatchByTeam,
  getChampion,
  getUpcomingMatches,
  getQualifiedTeams,
  getNextOpponent,
  getBracketSummary
} from './assistantHelpers';
