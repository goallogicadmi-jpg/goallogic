import { getFixtureStatistics } from '../api/api';

function normalizeTeamId(teamId) {
  const parsed = Number(teamId);
  return Number.isFinite(parsed) ? parsed : teamId;
}

function isSameTeamId(left, right) {
  if (left == null || right == null) return false;
  return normalizeTeamId(left) === normalizeTeamId(right);
}

/** Ligas/tipos donde la API suele devolver statistics vacías (amistosos). */
const EXCLUDED_STATS_LEAGUE_IDS = new Set([667, 10]);

function isExcludedStatsFixture(fixture) {
  const leagueId = normalizeTeamId(fixture?.league?.id);
  if (EXCLUDED_STATS_LEAGUE_IDS.has(leagueId)) {
    return true;
  }
  const leagueType = String(fixture?.league?.type || '').toLowerCase();
  if (leagueType === 'friendly') {
    return true;
  }
  const leagueName = String(fixture?.league?.name || '').toLowerCase();
  return leagueName.includes('friendly') || leagueName.includes('amistoso');
}

function selectFixtureCandidates(fixtures, scanLimit = 25) {
  if (!Array.isArray(fixtures)) {
    return [];
  }

  const finished = fixtures.filter((f) => f.fixture?.status?.short === 'FT');
  const competitive = finished.filter((f) => !isExcludedStatsFixture(f));
  const pool = competitive.length > 0 ? competitive : finished;

  return pool.slice(0, scanLimit);
}

function resolveTeamAndRivalStats(statsData, fixture, normalizedTeamId) {
  if (!statsData?.response || !Array.isArray(statsData.response) || statsData.response.length === 0) {
    return { teamStats: null, rivalStats: null, hasStats: false };
  }

  const isHome = isSameTeamId(fixture.teams?.home?.id, normalizedTeamId);
  const teamStats = statsData.response.find(
    (s) =>
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id))
  );
  const rivalStats = statsData.response.find(
    (s) =>
      (isHome && isSameTeamId(s.team?.id, fixture.teams?.away?.id)) ||
      (!isHome && isSameTeamId(s.team?.id, fixture.teams?.home?.id))
  );

  const hasStats = Boolean(
    teamStats?.statistics?.length && rivalStats?.statistics?.length
  );

  return { teamStats, rivalStats, hasStats };
}

function parseStatInt(stat) {
  if (stat?.value == null || stat.value === '') {
    return 0;
  }
  const parsed = parseInt(stat.value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildPromedios(valuesFor, valuesAgainst) {
  const promedioFor =
    valuesFor.length > 0 ? valuesFor.reduce((a, b) => a + b, 0) / valuesFor.length : 0;
  const promedioAgainst =
    valuesAgainst.length > 0
      ? valuesAgainst.reduce((a, b) => a + b, 0) / valuesAgainst.length
      : 0;

  return {
    promedioFor: parseFloat(promedioFor.toFixed(2)),
    promedioAgainst: parseFloat(promedioAgainst.toFixed(2)),
  };
}

/**
 * Extrae los corners de un fixture obteniendo sus estadísticas
 */
export const extraerCornersDeFixture = async (fixture, teamId) => {
  try {
    if (!fixture?.fixture?.id) {
      return { cornersFor: 0, cornersAgainst: 0, hasStats: false };
    }

    const normalizedTeamId = normalizeTeamId(teamId);
    const statsData = await getFixtureStatistics(fixture.fixture.id);
    const { teamStats, rivalStats, hasStats } = resolveTeamAndRivalStats(
      statsData,
      fixture,
      normalizedTeamId
    );

    if (!hasStats) {
      return { cornersFor: 0, cornersAgainst: 0, hasStats: false };
    }

    const cornersForStat = teamStats.statistics.find(
      (s) => s.type === 'Corner Kicks' || s.type === 'Corner kicks'
    );
    const cornersAgainstStat = rivalStats.statistics.find(
      (s) => s.type === 'Corner Kicks' || s.type === 'Corner kicks'
    );

    return {
      cornersFor: parseStatInt(cornersForStat),
      cornersAgainst: parseStatInt(cornersAgainstStat),
      hasStats: true,
    };
  } catch (error) {
    console.warn(`⚠️ Error extrayendo corners del fixture ${fixture?.fixture?.id}:`, error);
    return { cornersFor: 0, cornersAgainst: 0, hasStats: false };
  }
};

async function collectFixtureMetricSamples(fixtures, teamId, maxFixtures, extractor) {
  const normalizedTeamId = normalizeTeamId(teamId);
  const candidates = selectFixtureCandidates(fixtures);

  if (candidates.length === 0) {
    return {
      valuesFor: [],
      valuesAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0,
    };
  }

  const extracted = await Promise.all(
    candidates.map((fixture) => extractor(fixture, normalizedTeamId))
  );

  const validSamples = extracted.filter((sample) => sample.hasStats).slice(0, maxFixtures);

  if (validSamples.length === 0) {
    return {
      valuesFor: [],
      valuesAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0,
    };
  }

  const valuesFor = validSamples.map((sample) => sample.valuesFor);
  const valuesAgainst = validSamples.map((sample) => sample.valuesAgainst);
  const promedios = buildPromedios(valuesFor, valuesAgainst);

  return {
    valuesFor,
    valuesAgainst,
    ...promedios,
  };
}

/**
 * Procesa una lista de fixtures para extraer corners y calcular promedios
 */
export const procesarCornersDeFixtures = async (fixtures, teamId, maxFixtures = 5) => {
  const normalizedTeamId = normalizeTeamId(teamId);
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return {
      cornersFor: [],
      cornersAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0,
    };
  }

  const collected = await collectFixtureMetricSamples(
    fixtures,
    normalizedTeamId,
    maxFixtures,
    async (fixture, id) => {
      const result = await extraerCornersDeFixture(fixture, id);
      return {
        hasStats: result.hasStats,
        valuesFor: result.cornersFor,
        valuesAgainst: result.cornersAgainst,
      };
    }
  );

  return {
    cornersFor: collected.valuesFor,
    cornersAgainst: collected.valuesAgainst,
    promedioFor: collected.promedioFor,
    promedioAgainst: collected.promedioAgainst,
  };
};

/**
 * Calcula los corners esperados para un partido entre dos equipos
 */
export const expectedCorners = (teamA, teamB) => {
  if (!teamA || !teamB) {
    return { expectedA: 0, expectedB: 0, total: 0 };
  }

  const avgAFor =
    teamA.cornersFor && teamA.cornersFor.length > 0
      ? teamA.cornersFor.reduce((a, b) => a + b, 0) / teamA.cornersFor.length
      : 0;

  const avgAAgainst =
    teamA.cornersAgainst && teamA.cornersAgainst.length > 0
      ? teamA.cornersAgainst.reduce((a, b) => a + b, 0) / teamA.cornersAgainst.length
      : 0;

  const avgBFor =
    teamB.cornersFor && teamB.cornersFor.length > 0
      ? teamB.cornersFor.reduce((a, b) => a + b, 0) / teamB.cornersFor.length
      : 0;

  const avgBAgainst =
    teamB.cornersAgainst && teamB.cornersAgainst.length > 0
      ? teamB.cornersAgainst.reduce((a, b) => a + b, 0) / teamB.cornersAgainst.length
      : 0;

  const expectedA = (avgAFor + avgBAgainst) / 2;
  const expectedB = (avgBFor + avgAAgainst) / 2;
  const total = expectedA + expectedB;

  return {
    expectedA: parseFloat(expectedA.toFixed(2)),
    expectedB: parseFloat(expectedB.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};

/**
 * Extrae las tarjetas (amarillas + rojas) de un fixture obteniendo sus estadísticas
 */
export const extraerTarjetasDeFixture = async (fixture, teamId) => {
  try {
    if (!fixture?.fixture?.id) {
      return { cardsFor: 0, cardsAgainst: 0, hasStats: false };
    }

    const normalizedTeamId = normalizeTeamId(teamId);
    const statsData = await getFixtureStatistics(fixture.fixture.id);
    const { teamStats, rivalStats, hasStats } = resolveTeamAndRivalStats(
      statsData,
      fixture,
      normalizedTeamId
    );

    if (!hasStats) {
      return { cardsFor: 0, cardsAgainst: 0, hasStats: false };
    }

    const yellowCardsStat = teamStats.statistics.find(
      (s) => s.type === 'Yellow Cards' || s.type === 'Yellow cards'
    );
    const redCardsStat = teamStats.statistics.find(
      (s) => s.type === 'Red Cards' || s.type === 'Red cards'
    );
    const yellowCardsRivalStat = rivalStats.statistics.find(
      (s) => s.type === 'Yellow Cards' || s.type === 'Yellow cards'
    );
    const redCardsRivalStat = rivalStats.statistics.find(
      (s) => s.type === 'Red Cards' || s.type === 'Red cards'
    );

    const cardsFor = parseStatInt(yellowCardsStat) + parseStatInt(redCardsStat);
    const cardsAgainst = parseStatInt(yellowCardsRivalStat) + parseStatInt(redCardsRivalStat);

    return { cardsFor, cardsAgainst, hasStats: true };
  } catch (error) {
    console.warn(`⚠️ Error extrayendo tarjetas del fixture ${fixture?.fixture?.id}:`, error);
    return { cardsFor: 0, cardsAgainst: 0, hasStats: false };
  }
};

/**
 * Procesa una lista de fixtures para extraer tarjetas y calcular promedios
 */
export const procesarTarjetasDeFixtures = async (fixtures, teamId, maxFixtures = 5) => {
  const normalizedTeamId = normalizeTeamId(teamId);
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return {
      cardsFor: [],
      cardsAgainst: [],
      promedioFor: 0,
      promedioAgainst: 0,
    };
  }

  const collected = await collectFixtureMetricSamples(
    fixtures,
    normalizedTeamId,
    maxFixtures,
    async (fixture, id) => {
      const result = await extraerTarjetasDeFixture(fixture, id);
      return {
        hasStats: result.hasStats,
        valuesFor: result.cardsFor,
        valuesAgainst: result.cardsAgainst,
      };
    }
  );

  return {
    cardsFor: collected.valuesFor,
    cardsAgainst: collected.valuesAgainst,
    promedioFor: collected.promedioFor,
    promedioAgainst: collected.promedioAgainst,
  };
};

/**
 * Calcula las tarjetas esperadas para un partido entre dos equipos
 */
export const expectedCards = (teamA, teamB) => {
  if (!teamA || !teamB) {
    return { expectedA: 0, expectedB: 0, total: 0 };
  }

  const avgAFor =
    teamA.cardsFor && teamA.cardsFor.length > 0
      ? teamA.cardsFor.reduce((a, b) => a + b, 0) / teamA.cardsFor.length
      : 0;

  const avgAAgainst =
    teamA.cardsAgainst && teamA.cardsAgainst.length > 0
      ? teamA.cardsAgainst.reduce((a, b) => a + b, 0) / teamA.cardsAgainst.length
      : 0;

  const avgBFor =
    teamB.cardsFor && teamB.cardsFor.length > 0
      ? teamB.cardsFor.reduce((a, b) => a + b, 0) / teamB.cardsFor.length
      : 0;

  const avgBAgainst =
    teamB.cardsAgainst && teamB.cardsAgainst.length > 0
      ? teamB.cardsAgainst.reduce((a, b) => a + b, 0) / teamB.cardsAgainst.length
      : 0;

  const expectedA = (avgAFor + avgBAgainst) / 2;
  const expectedB = (avgBFor + avgAAgainst) / 2;
  const total = expectedA + expectedB;

  return {
    expectedA: parseFloat(expectedA.toFixed(2)),
    expectedB: parseFloat(expectedB.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};
