import { getFixtureStatistics } from '../api/api';

function normalizeTeamId(teamId) {
  const parsed = Number(teamId);
  return Number.isFinite(parsed) ? parsed : teamId;
}

function isSameTeamId(left, right) {
  if (left == null || right == null) return false;
  return normalizeTeamId(left) === normalizeTeamId(right);
}

/**
 * Extrae los corners de un fixture obteniendo sus estadísticas
 * @param {Object} fixture - Objeto fixture con fixture.id
 * @param {number} teamId - ID del equipo para determinar si es local o visitante
 * @returns {Promise<{cornersFor: number, cornersAgainst: number}>} - Corners a favor y en contra
 */
export const extraerCornersDeFixture = async (fixture, teamId) => {
  try {
    if (!fixture?.fixture?.id) {
      return { cornersFor: 0, cornersAgainst: 0 };
    }

    const normalizedTeamId = normalizeTeamId(teamId);
    const statsData = await getFixtureStatistics(fixture.fixture.id);
    
    if (!statsData?.response || !Array.isArray(statsData.response)) {
      return { cornersFor: 0, cornersAgainst: 0 };
    }

    const isHome = isSameTeamId(fixture.teams?.home?.id, normalizedTeamId);
    const teamStats = statsData.response.find(s => 
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id))
    );

    const rivalStats = statsData.response.find(s => 
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id))
    );

    if (!teamStats?.statistics || !rivalStats?.statistics) {
      return { cornersFor: 0, cornersAgainst: 0 };
    }

    const cornersForStat = teamStats.statistics.find(s => 
      s.type === 'Corner Kicks' || s.type === 'Corner kicks'
    );
    const cornersAgainstStat = rivalStats.statistics.find(s => 
      s.type === 'Corner Kicks' || s.type === 'Corner kicks'
    );

    const cornersFor = cornersForStat?.value ? parseInt(cornersForStat.value) || 0 : 0;
    const cornersAgainst = cornersAgainstStat?.value ? parseInt(cornersAgainstStat.value) || 0 : 0;

    return { cornersFor, cornersAgainst };
  } catch (error) {
    console.warn(`⚠️ Error extrayendo corners del fixture ${fixture?.fixture?.id}:`, error);
    return { cornersFor: 0, cornersAgainst: 0 };
  }
};

/**
 * Procesa una lista de fixtures para extraer corners y calcular promedios
 * @param {Array} fixtures - Array de fixtures
 * @param {number} teamId - ID del equipo
 * @param {number} maxFixtures - Número máximo de fixtures a procesar (por defecto 5)
 * @returns {Promise<{cornersFor: Array, cornersAgainst: Array, promedioFor: number, promedioAgainst: number}>}
 */
export const procesarCornersDeFixtures = async (fixtures, teamId, maxFixtures = 5) => {
  const normalizedTeamId = normalizeTeamId(teamId);
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return {
      cornersFor: [],
      cornersAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0
    };
  }

  // Filtrar solo partidos finalizados y limitar cantidad
  const fixturesFinalizados = fixtures
    .filter(f => f.fixture?.status?.short === 'FT')
    .slice(0, maxFixtures);

  if (fixturesFinalizados.length === 0) {
    return {
      cornersFor: [],
      cornersAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0
    };
  }

  // Extraer corners de cada fixture (en paralelo para mejor rendimiento)
  const cornersData = await Promise.all(
    fixturesFinalizados.map(fixture => extraerCornersDeFixture(fixture, normalizedTeamId))
  );

  const cornersFor = cornersData.map(d => d.cornersFor);
  const cornersAgainst = cornersData.map(d => d.cornersAgainst);

  const promedioFor = cornersFor.length > 0
    ? cornersFor.reduce((a, b) => a + b, 0) / cornersFor.length
    : 0;
  
  const promedioAgainst = cornersAgainst.length > 0
    ? cornersAgainst.reduce((a, b) => a + b, 0) / cornersAgainst.length
    : 0;

  return {
    cornersFor,
    cornersAgainst,
    promedioFor: parseFloat(promedioFor.toFixed(2)),
    promedioAgainst: parseFloat(promedioAgainst.toFixed(2))
  };
};

/**
 * Calcula los corners esperados para un partido entre dos equipos
 * @param {Object} teamA - Datos del equipo A con {cornersFor: Array, cornersAgainst: Array}
 * @param {Object} teamB - Datos del equipo B con {cornersFor: Array, cornersAgainst: Array}
 * @returns {Object} - {expectedA, expectedB, total}
 */
export const expectedCorners = (teamA, teamB) => {
  if (!teamA || !teamB) {
    return { expectedA: 0, expectedB: 0, total: 0 };
  }

  // Calcular promedios
  const avgAFor = teamA.cornersFor && teamA.cornersFor.length > 0
    ? teamA.cornersFor.reduce((a, b) => a + b, 0) / teamA.cornersFor.length
    : 0;
  
  const avgAAgainst = teamA.cornersAgainst && teamA.cornersAgainst.length > 0
    ? teamA.cornersAgainst.reduce((a, b) => a + b, 0) / teamA.cornersAgainst.length
    : 0;

  const avgBFor = teamB.cornersFor && teamB.cornersFor.length > 0
    ? teamB.cornersFor.reduce((a, b) => a + b, 0) / teamB.cornersFor.length
    : 0;
  
  const avgBAgainst = teamB.cornersAgainst && teamB.cornersAgainst.length > 0
    ? teamB.cornersAgainst.reduce((a, b) => a + b, 0) / teamB.cornersAgainst.length
    : 0;

  // Calcular corners esperados
  const expectedA = (avgAFor + avgBAgainst) / 2;
  const expectedB = (avgBFor + avgAAgainst) / 2;
  const total = expectedA + expectedB;

  return {
    expectedA: parseFloat(expectedA.toFixed(2)),
    expectedB: parseFloat(expectedB.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

/**
 * Extrae las tarjetas (amarillas + rojas) de un fixture obteniendo sus estadísticas
 * @param {Object} fixture - Objeto fixture con fixture.id
 * @param {number} teamId - ID del equipo para determinar si es local o visitante
 * @returns {Promise<{cardsFor: number, cardsAgainst: number}>} - Tarjetas a favor y en contra
 */
export const extraerTarjetasDeFixture = async (fixture, teamId) => {
  try {
    if (!fixture?.fixture?.id) {
      return { cardsFor: 0, cardsAgainst: 0 };
    }

    const normalizedTeamId = normalizeTeamId(teamId);
    const statsData = await getFixtureStatistics(fixture.fixture.id);
    
    if (!statsData?.response || !Array.isArray(statsData.response)) {
      return { cardsFor: 0, cardsAgainst: 0 };
    }

    const isHome = isSameTeamId(fixture.teams?.home?.id, normalizedTeamId);
    const teamStats = statsData.response.find(s => 
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id))
    );

    const rivalStats = statsData.response.find(s => 
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id))
    );

    if (!teamStats?.statistics || !rivalStats?.statistics) {
      return { cardsFor: 0, cardsAgainst: 0 };
    }

    // Extraer tarjetas amarillas y rojas del equipo
    const yellowCardsStat = teamStats.statistics.find(s => 
      s.type === 'Yellow Cards' || s.type === 'Yellow cards'
    );
    const redCardsStat = teamStats.statistics.find(s => 
      s.type === 'Red Cards' || s.type === 'Red cards'
    );

    // Extraer tarjetas amarillas y rojas del rival
    const yellowCardsRivalStat = rivalStats.statistics.find(s => 
      s.type === 'Yellow Cards' || s.type === 'Yellow cards'
    );
    const redCardsRivalStat = rivalStats.statistics.find(s => 
      s.type === 'Red Cards' || s.type === 'Red cards'
    );

    const yellowCards = yellowCardsStat?.value ? parseInt(yellowCardsStat.value) || 0 : 0;
    const redCards = redCardsStat?.value ? parseInt(redCardsStat.value) || 0 : 0;
    const cardsFor = yellowCards + redCards; // Total de tarjetas recibidas por el equipo

    const yellowCardsRival = yellowCardsRivalStat?.value ? parseInt(yellowCardsRivalStat.value) || 0 : 0;
    const redCardsRival = redCardsRivalStat?.value ? parseInt(redCardsRivalStat.value) || 0 : 0;
    const cardsAgainst = yellowCardsRival + redCardsRival; // Total de tarjetas recibidas por el rival

    return { cardsFor, cardsAgainst };
  } catch (error) {
    console.warn(`⚠️ Error extrayendo tarjetas del fixture ${fixture?.fixture?.id}:`, error);
    return { cardsFor: 0, cardsAgainst: 0 };
  }
};

/**
 * Procesa una lista de fixtures para extraer tarjetas y calcular promedios
 * @param {Array} fixtures - Array de fixtures
 * @param {number} teamId - ID del equipo
 * @param {number} maxFixtures - Número máximo de fixtures a procesar (por defecto 5)
 * @returns {Promise<{cardsFor: Array, cardsAgainst: Array, promedioFor: number, promedioAgainst: number}>}
 */
export const procesarTarjetasDeFixtures = async (fixtures, teamId, maxFixtures = 5) => {
  const normalizedTeamId = normalizeTeamId(teamId);
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return {
      cardsFor: [],
      cardsAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0
    };
  }

  // Filtrar solo partidos finalizados y limitar cantidad
  const fixturesFinalizados = fixtures
    .filter(f => f.fixture?.status?.short === 'FT')
    .slice(0, maxFixtures);

  if (fixturesFinalizados.length === 0) {
    return {
      cardsFor: [],
      cardsAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0
    };
  }

  // Extraer tarjetas de cada fixture (en paralelo para mejor rendimiento)
  const cardsData = await Promise.all(
    fixturesFinalizados.map(fixture => extraerTarjetasDeFixture(fixture, normalizedTeamId))
  );

  const cardsFor = cardsData.map(d => d.cardsFor);
  const cardsAgainst = cardsData.map(d => d.cardsAgainst);

  const promedioFor = cardsFor.length > 0
    ? cardsFor.reduce((a, b) => a + b, 0) / cardsFor.length
    : 0;
  
  const promedioAgainst = cardsAgainst.length > 0
    ? cardsAgainst.reduce((a, b) => a + b, 0) / cardsAgainst.length
    : 0;

  return {
    cardsFor,
    cardsAgainst,
    promedioFor: parseFloat(promedioFor.toFixed(2)),
    promedioAgainst: parseFloat(promedioAgainst.toFixed(2))
  };
};

/**
 * Calcula las tarjetas esperadas para un partido entre dos equipos
 * @param {Object} teamA - Datos del equipo A con {cardsFor: Array, cardsAgainst: Array}
 * @param {Object} teamB - Datos del equipo B con {cardsFor: Array, cardsAgainst: Array}
 * @returns {Object} - {expectedA, expectedB, total}
 */
export const expectedCards = (teamA, teamB) => {
  if (!teamA || !teamB) {
    return { expectedA: 0, expectedB: 0, total: 0 };
  }

  // Calcular promedios
  const avgAFor = teamA.cardsFor && teamA.cardsFor.length > 0
    ? teamA.cardsFor.reduce((a, b) => a + b, 0) / teamA.cardsFor.length
    : 0;
  
  const avgAAgainst = teamA.cardsAgainst && teamA.cardsAgainst.length > 0
    ? teamA.cardsAgainst.reduce((a, b) => a + b, 0) / teamA.cardsAgainst.length
    : 0;

  const avgBFor = teamB.cardsFor && teamB.cardsFor.length > 0
    ? teamB.cardsFor.reduce((a, b) => a + b, 0) / teamB.cardsFor.length
    : 0;
  
  const avgBAgainst = teamB.cardsAgainst && teamB.cardsAgainst.length > 0
    ? teamB.cardsAgainst.reduce((a, b) => a + b, 0) / teamB.cardsAgainst.length
    : 0;

  // Calcular tarjetas esperadas
  const expectedA = (avgAFor + avgBAgainst) / 2;
  const expectedB = (avgBFor + avgAAgainst) / 2;
  const total = expectedA + expectedB;

  return {
    expectedA: parseFloat(expectedA.toFixed(2)),
    expectedB: parseFloat(expectedB.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};
