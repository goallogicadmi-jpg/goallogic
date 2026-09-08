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

function sortFixturesByRecency(fixtures) {
  return [...fixtures].sort((a, b) => {
    const tsA = Number(a?.fixture?.timestamp) || 0;
    const tsB = Number(b?.fixture?.timestamp) || 0;
    if (tsB !== tsA) {
      return tsB - tsA;
    }
    const idA = Number(a?.fixture?.id) || 0;
    const idB = Number(b?.fixture?.id) || 0;
    return idB - idA;
  });
}

function selectFixtureCandidates(fixtures, scanLimit = 25) {
  if (!Array.isArray(fixtures)) {
    return [];
  }

  const finished = fixtures.filter((f) => f.fixture?.status?.short === 'FT');
  const competitive = finished.filter((f) => !isExcludedStatsFixture(f));
  const pool = competitive.length > 0 ? competitive : finished;

  return sortFixturesByRecency(pool).slice(0, scanLimit);
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

function emptyCornersPayload() {
  return {
    cornersFor: [],
    cornersAgainst: [],
    promedioFor: 0,
    promedioAgainst: 0,
  };
}

function emptyTarjetasPayload() {
  return {
    cardsFor: [],
    cardsAgainst: [],
    promedioFor: 0,
    promedioAgainst: 0,
  };
}

async function fetchFixtureStatisticsWithRetry(fixtureId) {
  let statsData = await getFixtureStatistics(fixtureId);

  if (!statsData?.response?.length) {
    statsData = await getFixtureStatistics(fixtureId);
  }

  return statsData;
}

function extractCornersFromResolvedStats(teamStats, rivalStats) {
  const cornersForStat = teamStats.statistics.find(
    (s) => s.type === 'Corner Kicks' || s.type === 'Corner kicks'
  );
  const cornersAgainstStat = rivalStats.statistics.find(
    (s) => s.type === 'Corner Kicks' || s.type === 'Corner kicks'
  );

  return {
    cornersFor: parseStatInt(cornersForStat),
    cornersAgainst: parseStatInt(cornersAgainstStat),
  };
}

function extractCardsFromResolvedStats(teamStats, rivalStats) {
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

  return {
    cardsFor: parseStatInt(yellowCardsStat) + parseStatInt(redCardsStat),
    cardsAgainst: parseStatInt(yellowCardsRivalStat) + parseStatInt(redCardsRivalStat),
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
    const statsData = await fetchFixtureStatisticsWithRetry(fixture.fixture.id);
    const { teamStats, rivalStats, hasStats } = resolveTeamAndRivalStats(
      statsData,
      fixture,
      normalizedTeamId
    );

    if (!hasStats) {
      return { cornersFor: 0, cornersAgainst: 0, hasStats: false };
    }

    const { cornersFor, cornersAgainst } = extractCornersFromResolvedStats(teamStats, rivalStats);

    return {
      cornersFor,
      cornersAgainst,
      hasStats: true,
    };
  } catch (error) {
    console.warn(`⚠️ Error extrayendo corners del fixture ${fixture?.fixture?.id}:`, error);
    return { cornersFor: 0, cornersAgainst: 0, hasStats: false };
  }
};

/**
 * Procesa corners y tarjetas en una sola pasada determinista por equipo.
 * Garantiza que ambas métricas usen exactamente los mismos 5 partidos FT válidos.
 */
export async function procesarCornersYTarjetasDeFixtures(fixtures, teamId, maxFixtures = 5) {
  const normalizedTeamId = normalizeTeamId(teamId);

  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    return {
      corners: emptyCornersPayload(),
      tarjetas: emptyTarjetasPayload(),
    };
  }

  const candidates = selectFixtureCandidates(fixtures);
  const cornersFor = [];
  const cornersAgainst = [];
  const cardsFor = [];
  const cardsAgainst = [];

  for (const fixture of candidates) {
    if (cornersFor.length >= maxFixtures) {
      break;
    }

    try {
      if (!fixture?.fixture?.id) {
        continue;
      }

      const statsData = await fetchFixtureStatisticsWithRetry(fixture.fixture.id);
      const { teamStats, rivalStats, hasStats } = resolveTeamAndRivalStats(
        statsData,
        fixture,
        normalizedTeamId
      );

      if (!hasStats) {
        continue;
      }

      const corners = extractCornersFromResolvedStats(teamStats, rivalStats);
      const cards = extractCardsFromResolvedStats(teamStats, rivalStats);

      cornersFor.push(corners.cornersFor);
      cornersAgainst.push(corners.cornersAgainst);
      cardsFor.push(cards.cardsFor);
      cardsAgainst.push(cards.cardsAgainst);
    } catch (error) {
      console.warn(
        `⚠️ Error extrayendo métricas del fixture ${fixture?.fixture?.id}:`,
        error
      );
    }
  }

  if (cornersFor.length === 0) {
    return {
      corners: emptyCornersPayload(),
      tarjetas: emptyTarjetasPayload(),
    };
  }

  return {
    corners: {
      cornersFor,
      cornersAgainst,
      ...buildPromedios(cornersFor, cornersAgainst),
    },
    tarjetas: {
      cardsFor,
      cardsAgainst,
      ...buildPromedios(cardsFor, cardsAgainst),
    },
  };
}

/**
 * Procesa una lista de fixtures para extraer corners y calcular promedios
 */
export const procesarCornersDeFixtures = async (fixtures, teamId, maxFixtures = 5) => {
  const { corners } = await procesarCornersYTarjetasDeFixtures(fixtures, teamId, maxFixtures);
  return corners;
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
    const statsData = await fetchFixtureStatisticsWithRetry(fixture.fixture.id);
    const { teamStats, rivalStats, hasStats } = resolveTeamAndRivalStats(
      statsData,
      fixture,
      normalizedTeamId
    );

    if (!hasStats) {
      return { cardsFor: 0, cardsAgainst: 0, hasStats: false };
    }

    const { cardsFor, cardsAgainst } = extractCardsFromResolvedStats(teamStats, rivalStats);

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
  const { tarjetas } = await procesarCornersYTarjetasDeFixtures(fixtures, teamId, maxFixtures);
  return tarjetas;
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
