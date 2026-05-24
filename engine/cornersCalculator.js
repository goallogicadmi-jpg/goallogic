/**
 * Calculadora de Tiros de Esquina Esperados
 * 
 * Calcula el promedio de tiros de esquina esperados en un partido
 * basándose únicamente en datos reales de la API.
 */

/**
 * Calcula el promedio de corners desde últimos partidos
 * @param {Array} fixtures - Array de fixtures (últimos partidos)
 * @param {number} teamId - ID del equipo
 * @returns {Object} - { cornersFor: number, cornersAgainst: number, source: string }
 */
function calculateCornersFromFixtures(fixtures, teamId) {
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return { cornersFor: null, cornersAgainst: null, source: 'unavailable' };
  }

  // Filtrar solo partidos finalizados con estadísticas
  const finishedFixtures = fixtures.filter(f => 
    f.fixture?.status?.short === 'FT' && 
    f.statistics && Array.isArray(f.statistics)
  );

  if (finishedFixtures.length === 0) {
    return { cornersFor: null, cornersAgainst: null, source: 'unavailable' };
  }

  let totalCornersFor = 0;
  let totalCornersAgainst = 0;
  let validFixtures = 0;

  for (const fixture of finishedFixtures) {
    const isHome = fixture.teams?.home?.id === teamId;
    
    // Buscar estadísticas de corners en el array de estadísticas
    const homeStats = fixture.statistics.find(s => s.team?.id === fixture.teams?.home?.id);
    const awayStats = fixture.statistics.find(s => s.team?.id === fixture.teams?.away?.id);
    
    // Buscar corners en las estadísticas
    const homeCorners = homeStats?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0;
    const awayCorners = awayStats?.statistics?.find(s => s.type === 'Corner Kicks')?.value || 0;
    
    if (homeCorners !== null && awayCorners !== null) {
      if (isHome) {
        totalCornersFor += homeCorners;
        totalCornersAgainst += awayCorners;
      } else {
        totalCornersFor += awayCorners;
        totalCornersAgainst += homeCorners;
      }
      validFixtures++;
    }
  }

  if (validFixtures === 0) {
    return { cornersFor: null, cornersAgainst: null, source: 'unavailable' };
  }

  return {
    cornersFor: totalCornersFor / validFixtures,
    cornersAgainst: totalCornersAgainst / validFixtures,
    source: 'fixtures'
  };
}

/**
 * Obtiene corners desde estadísticas de equipo
 * @param {Object} stats - Estadísticas del equipo desde API
 * @returns {Object} - { cornersFor: number, cornersAgainst: number, source: string }
 */
function getCornersFromStats(stats) {
  if (!stats) {
    return { cornersFor: null, cornersAgainst: null, source: 'unavailable' };
  }

  // Intentar obtener desde diferentes estructuras posibles de la API
  const cornersFor = stats.corners?.for?.total || 
                     stats.corners?.for?.average?.total ||
                     null;
  const cornersAgainst = stats.corners?.against?.total ||
                         stats.corners?.against?.average?.total ||
                         null;

  if (cornersFor !== null && cornersAgainst !== null) {
    return {
      cornersFor: parseFloat(cornersFor),
      cornersAgainst: parseFloat(cornersAgainst),
      source: 'stats'
    };
  }

  return { cornersFor: null, cornersAgainst: null, source: 'unavailable' };
}

/**
 * Calcula el promedio de tiros de esquina esperados en el partido
 * 
 * Fórmula: (CF_local + CC_visitante + CF_visitante + CC_local) / 2
 * 
 * Donde:
 * - CF_local = Corners a favor del equipo local
 * - CC_visitante = Corners en contra del equipo visitante
 * - CF_visitante = Corners a favor del equipo visitante
 * - CC_local = Corners en contra del equipo local
 * 
 * @param {Object} homeStats - Estadísticas del equipo local
 * @param {Object} awayStats - Estadísticas del equipo visitante
 * @param {Array} homeFixtures - Últimos partidos del equipo local
 * @param {Array} awayFixtures - Últimos partidos del equipo visitante
 * @param {number} homeTeamId - ID del equipo local
 * @param {number} awayTeamId - ID del equipo visitante
 * @returns {Object} - { expectedCorners: number, source: string, details: Object }
 */
function calculateExpectedCorners(homeStats, awayStats, homeFixtures, awayFixtures, homeTeamId, awayTeamId) {
  // Prioridad 1: Intentar obtener desde estadísticas de equipo
  const homeCornersFromStats = getCornersFromStats(homeStats);
  const awayCornersFromStats = getCornersFromStats(awayStats);

  // Prioridad 2: Calcular desde últimos partidos si estadísticas no están disponibles
  const homeCornersFromFixtures = calculateCornersFromFixtures(homeFixtures, homeTeamId);
  const awayCornersFromFixtures = calculateCornersFromFixtures(awayFixtures, awayTeamId);

  // Usar mejor fuente disponible para cada equipo
  const homeCorners = homeCornersFromStats.source === 'stats' 
    ? homeCornersFromStats 
    : homeCornersFromFixtures;
  
  const awayCorners = awayCornersFromStats.source === 'stats'
    ? awayCornersFromStats
    : awayCornersFromFixtures;

  // Si no hay datos disponibles, retornar null
  if (homeCorners.cornersFor === null || homeCorners.cornersAgainst === null ||
      awayCorners.cornersFor === null || awayCorners.cornersAgainst === null) {
    return {
      expectedCorners: null,
      source: 'unavailable',
      details: {
        homeCorners: homeCorners,
        awayCorners: awayCorners
      }
    };
  }

  // Calcular promedio esperado usando la fórmula
  // (CF_local + CC_visitante + CF_visitante + CC_local) / 2
  const CF_local = homeCorners.cornersFor;
  const CC_visitante = awayCorners.cornersAgainst;
  const CF_visitante = awayCorners.cornersFor;
  const CC_local = homeCorners.cornersAgainst;

  const expectedCorners = (CF_local + CC_visitante + CF_visitante + CC_local) / 2;

  // Determinar fuente combinada
  const source = homeCorners.source === 'stats' && awayCorners.source === 'stats'
    ? 'stats'
    : (homeCorners.source === 'fixtures' || awayCorners.source === 'fixtures')
    ? 'fixtures'
    : 'mixed';

  return {
    expectedCorners: parseFloat(expectedCorners.toFixed(2)),
    source: source,
    details: {
      CF_local: parseFloat(CF_local.toFixed(2)),
      CC_visitante: parseFloat(CC_visitante.toFixed(2)),
      CF_visitante: parseFloat(CF_visitante.toFixed(2)),
      CC_local: parseFloat(CC_local.toFixed(2)),
      homeCorners: homeCorners,
      awayCorners: awayCorners
    }
  };
}

module.exports = {
  calculateExpectedCorners,
  calculateCornersFromFixtures,
  getCornersFromStats
};
