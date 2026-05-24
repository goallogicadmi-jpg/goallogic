/**
 * Módulo Champions League - Punto de entrada principal
 * Exporta todas las funciones y configuraciones necesarias
 */

// Configuración
export { championsLeagueConfig } from './config/championsLeagueConfig';

// Engine (cálculo y lógica)
export { computeChampionsTable } from './engine/computeChampionsTable';
export { getChampionsStage, getStagePositions, isInStage } from './engine/getChampionsStage';
export { 
  buildChampionsClassification, 
  getTeamsByStage, 
  getTeamByPosition 
} from './engine/selectors';

// Visual (estilos y propiedades)
export { championsZoneStyles, getChampionsZoneStyle } from './visual/championsZoneStyles';
export { 
  getChampionsRowVisualProps, 
  getChampionsRowClasses 
} from './visual/getChampionsRowVisualProps';

// Assistant (consultas para asistente virtual)
export {
  getTop8Teams,
  getPlayoffTeams,
  getEliminatedTeams,
  estimatePointsForTop8,
  getTeamsOnEliminationEdge,
  getChampionsSummary,
  findTeamByName
} from './assistant/championsQueries';
