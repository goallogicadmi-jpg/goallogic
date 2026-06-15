const WORLD_CUP_LEAGUE_ID = 1;
const WORLD_CUP_FALLBACK_SEASON = 2022;

/**
 * Cadena de temporadas a probar (Mundial 2026→2022, luego año anterior).
 */
function buildSeasonFallbackChain(leagueId, requestedSeason) {
  const base = Number(requestedSeason);
  if (!Number.isFinite(base)) return [];

  const chain = [base];
  if (Number(leagueId) === WORLD_CUP_LEAGUE_ID && base >= 2026) {
    chain.push(WORLD_CUP_FALLBACK_SEASON);
  }
  const prev = base - 1;
  if (!chain.includes(prev)) {
    chain.push(prev);
  }
  return chain;
}

/**
 * Fallback de temporada según catálogo (calendar_year vs european).
 */
function resolveCatalogSeasonFallback(leagueId, getCompetitionById) {
  const catalogMeta = typeof getCompetitionById === 'function' ? getCompetitionById(leagueId) : null;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;
  if (catalogMeta?.seasonMode === 'calendar_year') {
    return currentYear;
  }
  return currentMonth >= 8 ? currentYear : currentYear - 1;
}

/**
 * Promedio de goles desde ultimosPartidos (misma lógica que /api/predictions).
 */
function avgGoalsFromUltimosPartidos(ultimosPartidos, limit = 5) {
  const rows = Array.isArray(ultimosPartidos) ? ultimosPartidos.slice(0, limit) : [];
  if (!rows.length) {
    return { forAvg: null, againstAvg: null, games: 0 };
  }

  let gf = 0;
  let ga = 0;
  let games = 0;

  for (const p of rows) {
    const hg = Number(p?.golesFavor ?? 0);
    const ag = Number(p?.golesContra ?? 0);
    if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;
    gf += hg;
    ga += ag;
    games += 1;
  }

  if (!games) {
    return { forAvg: null, againstAvg: null, games: 0 };
  }

  return { forAvg: gf / games, againstAvg: ga / games, games };
}

function teamStatisticsHasPlayedData(stats) {
  const played = stats?.fixtures?.played?.total ?? 0;
  return Number(played) > 0;
}

/**
 * Obtiene teams/statistics probando temporadas en cadena de fallback.
 */
async function fetchTeamStatisticsWithSeasonFallback({
  teamId,
  leagueId,
  season,
  axios,
  apiHeaders,
}) {
  const seasonsToTry = buildSeasonFallbackChain(leagueId, season);
  /** Preferir la edición con más partidos (evita quedarse en WC 2026 con 1 PJ). */
  let best = {
    estadisticas: null,
    seasonUsed: season,
    played: -1,
    fallbackApplied: false,
  };

  for (const trySeason of seasonsToTry) {
    try {
      const response = await axios.get(
        `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${trySeason}`,
        { headers: apiHeaders }
      );
      const stats = response.data?.response || null;
      const played = Number(stats?.fixtures?.played?.total ?? 0);
      if (played > best.played) {
        best = {
          estadisticas: stats,
          seasonUsed: trySeason,
          played,
          fallbackApplied: trySeason !== season,
        };
      }
    } catch {
      // siguiente temporada
    }
  }

  return {
    estadisticas: best.estadisticas,
    seasonUsed: best.seasonUsed,
    fallbackApplied: best.fallbackApplied,
  };
}

/**
 * Estima xG / xGA cuando la API no provee expected goals (selecciones / copas).
 */
function estimateXgFromGoalAverage(goalsPerGame) {
  const n = Number(goalsPerGame);
  if (!Number.isFinite(n) || n <= 0) return null;
  return parseFloat((n * 1.05).toFixed(2));
}

/**
 * Promedio de goles efectivo: stats de liga → ultimosPartidos.
 */
function resolveEffectiveGoalAverages(promedioGolesFavor, promedioGolesContra, ultimosPartidos) {
  const ultimosAvg = avgGoalsFromUltimosPartidos(ultimosPartidos);
  const promF = Number(promedioGolesFavor);
  const promC = Number(promedioGolesContra);

  const goalAvgFor =
    Number.isFinite(promF) && promF > 0 ? promF : ultimosAvg.forAvg;
  const goalAvgAgainst =
    Number.isFinite(promC) && promC > 0 ? promC : ultimosAvg.againstAvg;

  return { goalAvgFor, goalAvgAgainst };
}

/**
 * Resuelve xG para predicciones: prioriza promedios de goles (API o ultimosPartidos).
 * El xG de fixtures/statistics solo se usa si no hay promedios utilizables.
 */
function resolveXgMetrics({
  xGFromFixtures,
  xGAFromFixtures,
  promedioGolesFavor,
  promedioGolesContra,
  ultimosPartidos,
}) {
  let xG = null;
  let xGA = null;
  let xGSource = null;
  let xGASource = null;

  const { goalAvgFor, goalAvgAgainst } = resolveEffectiveGoalAverages(
    promedioGolesFavor,
    promedioGolesContra,
    ultimosPartidos
  );

  const fromGoalsFor = estimateXgFromGoalAverage(goalAvgFor);
  if (fromGoalsFor != null) {
    xG = fromGoalsFor;
    xGSource = 'estimated';
  } else if (xGFromFixtures != null && xGFromFixtures > 0) {
    xG = parseFloat(Number(xGFromFixtures).toFixed(2));
    xGSource = 'api';
  }

  const fromGoalsAgainst = estimateXgFromGoalAverage(goalAvgAgainst);
  if (fromGoalsAgainst != null) {
    xGA = fromGoalsAgainst;
    xGASource = 'estimated';
  } else if (xGAFromFixtures != null && xGAFromFixtures > 0) {
    xGA = parseFloat(Number(xGAFromFixtures).toFixed(2));
    xGASource = 'api';
  }

  return { xG, xGA, xGSource, xGASource };
}

/**
 * Lista equipos de una liga probando cadena de temporadas.
 */
async function fetchLeagueTeamsWithSeasonFallback({ leagueId, season, axios, apiHeaders }) {
  const seasonsToTry = buildSeasonFallbackChain(leagueId, season);
  let lastResponse = null;

  for (const trySeason of seasonsToTry) {
    try {
      const response = await axios.get(
        `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${trySeason}`,
        { headers: apiHeaders }
      );
      lastResponse = response;
      if (response.data?.response?.length > 0) {
        return { response, seasonUsed: trySeason };
      }
    } catch {
      // siguiente temporada
    }
  }

  return { response: lastResponse, seasonUsed: seasonsToTry[seasonsToTry.length - 1] ?? season };
}

module.exports = {
  WORLD_CUP_LEAGUE_ID,
  WORLD_CUP_FALLBACK_SEASON,
  buildSeasonFallbackChain,
  resolveCatalogSeasonFallback,
  avgGoalsFromUltimosPartidos,
  fetchTeamStatisticsWithSeasonFallback,
  fetchLeagueTeamsWithSeasonFallback,
  estimateXgFromGoalAverage,
  resolveXgMetrics,
  resolveEffectiveGoalAverages,
  teamStatisticsHasPlayedData,
};
