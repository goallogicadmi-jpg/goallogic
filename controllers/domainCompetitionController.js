const axios = require("axios");
require("dotenv").config();

const {
  getCompetitionCatalog,
  getCompetitionsByDomain,
  getCompetitionById,
  getCompetitionByIdAndDomain,
} = require("../utils/competitionCatalog");
const {
  resolveCompetitionForScopedFixture,
  buildInternationalFriendlyCompetitionMeta,
  getSupplementarySelectionLeagueIds,
  dedupeRawFixtures,
} = require("../utils/internationalFriendlyFixtures");

const apiHeaders = {
  "x-apisports-key": process.env.API_KEY,
  "x-rapidapi-host": "v3.football.api-sports.io",
};

function normalizeDomain(routeSegment) {
  return routeSegment === "selecciones" ? "selection" : "club";
}

function normalizeFixturesScope(routeSegment) {
  if (routeSegment === "partidos") {
    return "all";
  }

  return normalizeDomain(routeSegment);
}

function getCompetitionsForScope(scope) {
  if (scope === "all") {
    return getCompetitionCatalog();
  }

  return getCompetitionsByDomain(scope);
}

function getCompetitionForScope(competitionId, scope) {
  if (scope === "all") {
    return getCompetitionById(competitionId);
  }

  return getCompetitionByIdAndDomain(competitionId, scope);
}

function createCompetitionLookupForScope(scope) {
  return new Map(
    getCompetitionsForScope(scope).map((competition) => [Number(competition.id), competition])
  );
}

function enrichFixtureWithCompetitionMeta(fixture, competition) {
  if (!competition) {
    return {
      ...fixture,
      domain: null,
      participantType: null,
      competitionPriority: 9999,
      competitionMeta: null,
    };
  }

  return {
    ...fixture,
    domain: competition.domain,
    participantType: competition.participantType,
    competitionPriority: competition.priority ?? 9999,
    competitionMeta: {
      id: competition.id,
      name: competition.name,
      domain: competition.domain,
      participantType: competition.participantType,
      priority: competition.priority ?? 9999,
      country: competition.country || null,
      type: competition.type || null,
      format: competition.format || null,
    },
  };
}

function sortFixtures(fixtures = []) {
  return [...fixtures].sort((left, right) => {
    const priorityDiff = (left.competitionPriority ?? 9999) - (right.competitionPriority ?? 9999);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const dateDiff =
      new Date(left.fixture?.date || 0).getTime() - new Date(right.fixture?.date || 0).getTime();
    if (dateDiff !== 0) {
      return dateDiff;
    }

    return (left.league?.name || "").localeCompare(right.league?.name || "");
  });
}

function resolveRequestedCompetition(competitionId, scope) {
  const competition = getCompetitionForScope(competitionId, scope);
  if (competition) return competition;

  if ((scope === "selection" || scope === "all") && Number(competitionId) === 10) {
    return buildInternationalFriendlyCompetitionMeta({ league: { id: 10 } });
  }

  if ((scope === "selection" || scope === "all") && Number(competitionId) === 1) {
    const wc = getCompetitionById(1);
    if (wc) return wc;
    return {
      id: 1,
      name: "World Cup",
      country: "World",
      logo: "/competition-logos/world-cup.svg",
      domain: "selection",
      type: "Cup",
      format: "group_and_knockout",
      participantType: "national_team",
      priority: 1,
      seasonMode: "calendar_year",
      features: {
        hasTransfers: false,
        hasInjuries: false,
        hasLeagueStats: true,
        hasSquad: true,
        hasStandings: true,
        hasKnockout: true,
      },
    };
  }

  return null;
}

async function fetchRawFixturesFromApi(date, leagueId = null) {
  const url = leagueId
    ? `https://v3.football.api-sports.io/fixtures?date=${date}&league=${leagueId}&season=${new Date(`${date}T12:00:00Z`).getUTCFullYear()}`
    : `https://v3.football.api-sports.io/fixtures?date=${date}`;

  const response = await axios.get(url, { headers: apiHeaders });
  return response.data?.response || [];
}

/**
 * Para selection/all: combina listado general + fetch explícito de amistosos (10) y Mundial (1).
 */
async function fetchMergedFixturesForDate(date, scope) {
  const supplementaryIds = getSupplementarySelectionLeagueIds(scope);

  if (!supplementaryIds.length) {
    return fetchRawFixturesFromApi(date);
  }

  const requests = [
    fetchRawFixturesFromApi(date),
    ...supplementaryIds.map((leagueId) => fetchRawFixturesFromApi(date, leagueId)),
  ];

  const batches = await Promise.all(requests);
  return dedupeRawFixtures(batches.flat());
}

function mapScopedFixtures(rawFixtures, competitionLookup, scope) {
  return (rawFixtures || [])
    .map((fixture) => {
      const competition = resolveCompetitionForScopedFixture(fixture, competitionLookup, scope);
      if (!competition) return null;
      return enrichFixtureWithCompetitionMeta(fixture, competition);
    })
    .filter(Boolean);
}

async function fetchScopedFixtures({ scope, date, competitionId }) {
  const competitionLookup = createCompetitionLookupForScope(scope);

  if (competitionId) {
    const competition = resolveRequestedCompetition(competitionId, scope);
    if (!competition) {
      return {
        error: {
          status: 404,
          payload: {
            success: false,
            error: "La competición no pertenece al scope solicitado",
          },
        },
      };
    }

    const season = new Date(`${date}T12:00:00Z`).getUTCFullYear();
    const response = await axios.get(
      `https://v3.football.api-sports.io/fixtures?date=${date}&league=${competitionId}&season=${season}`,
      { headers: apiHeaders }
    );

    const fixtures = mapScopedFixtures(response.data.response || [], competitionLookup, scope);

    return {
      success: true,
      data: sortFixtures(fixtures),
    };
  }

  const rawFixtures = await fetchMergedFixturesForDate(date, scope);
  const fixtures = mapScopedFixtures(rawFixtures, competitionLookup, scope);

  return {
    success: true,
    data: sortFixtures(fixtures),
  };
}

function createDomainCompetitionListHandler(routeSegment) {
  return async (req, res) => {
    const domain = normalizeDomain(routeSegment);

    try {
      const competitions = getCompetitionsByDomain(domain);
      res.set("Cache-Control", "no-store");
      res.json({
        success: true,
        data: competitions,
      });
    } catch (error) {
      console.error(`❌ Error obteniendo competiciones de ${routeSegment}:`, error.message);
      res.status(500).json({
        success: false,
        error: "Error al obtener el catálogo de competiciones",
      });
    }
  };
}

function createCompetitionSeasonsHandler(routeSegment) {
  return async (req, res) => {
    const domain = normalizeDomain(routeSegment);
    const { competitionId } = req.params;
    const competition = getCompetitionByIdAndDomain(competitionId, domain);

    if (!competition) {
      return res.status(404).json({
        success: false,
        error: "La competición no existe dentro del dominio solicitado",
      });
    }

    try {
      const response = await axios.get(
        `https://v3.football.api-sports.io/leagues?id=${competitionId}`,
        { headers: apiHeaders }
      );

      const leagueData = response.data.response?.[0] || null;

      res.json({
        success: true,
        data: {
          ...competition,
          seasons: (leagueData?.seasons || []).map((season) => ({
            year: season.year,
            start: season.start,
            end: season.end,
            current: season.current,
          })),
        },
      });
    } catch (error) {
      console.error(`❌ Error obteniendo temporadas de ${competitionId}:`, error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: "Error al obtener temporadas de la competición",
      });
    }
  };
}

function createDomainFixturesHandler(routeSegment) {
  return async (req, res) => {
    const scope = normalizeFixturesScope(routeSegment);
    const { date, competitionId } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        error: "Falta parámetro: date",
      });
    }

    try {
      const result = await fetchScopedFixtures({ scope, date, competitionId });

      if (result.error) {
        return res.status(result.error.status).json(result.error.payload);
      }

      res.json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      console.error(`❌ Error obteniendo fixtures de ${routeSegment}:`, error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: "Error al obtener fixtures del dominio",
      });
    }
  };
}

function createTeamProfileHandler(routeSegment) {
  return async (req, res) => {
    const domain = normalizeDomain(routeSegment);
    const { teamId } = req.params;
    const { competitionId, leagueId, season } = req.query;
    const leagueIdForStats = leagueId || competitionId;

    const competition = competitionId
      ? getCompetitionByIdAndDomain(competitionId, domain)
      : null;

    if (competitionId && !competition) {
      return res.status(404).json({
        success: false,
        error: "La competición no pertenece al dominio solicitado",
      });
    }

    const capabilities = competition?.features || {
      hasTransfers: domain === "club",
      hasInjuries: domain === "club",
      hasLeagueStats: domain === "club",
      hasSquad: true,
      hasStandings: true,
      hasKnockout: competition?.features?.hasKnockout || false,
    };

    try {
      const [teamInfoResponse, fixturesResponse] = await Promise.all([
        axios.get(`https://v3.football.api-sports.io/teams?id=${teamId}`, { headers: apiHeaders }),
        axios.get(`https://v3.football.api-sports.io/fixtures?team=${teamId}&last=10`, { headers: apiHeaders }),
      ]);

      const teamInfo = teamInfoResponse.data.response?.[0] || null;
      const recentFixtures = fixturesResponse.data.response || [];

      const requests = [];
      const requestMap = [];

      if (capabilities.hasSquad) {
        requests.push(
          axios
            .get(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, { headers: apiHeaders })
            .catch(() => ({ data: { response: [] } }))
        );
        requestMap.push("squad");
      }

      if (capabilities.hasLeagueStats && leagueIdForStats && season) {
        requests.push(
          axios
            .get(`https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueIdForStats}&season=${season}`, { headers: apiHeaders })
            .catch(() => ({ data: { response: null } }))
        );
        requestMap.push("statistics");

        requests.push(
          axios
            .get(`https://v3.football.api-sports.io/players?team=${teamId}&league=${leagueIdForStats}&season=${season}`, { headers: apiHeaders })
            .catch(() => ({ data: { response: [] } }))
        );
        requestMap.push("playerStatistics");
      }

      if (capabilities.hasInjuries) {
        requests.push(
          axios
            .get(`https://v3.football.api-sports.io/injuries?team=${teamId}`, { headers: apiHeaders })
            .catch(() => ({ data: { response: [] } }))
        );
        requestMap.push("injuries");
      }

      if (capabilities.hasTransfers) {
        requests.push(
          axios
            .get(`https://v3.football.api-sports.io/transfers?team=${teamId}`, { headers: apiHeaders })
            .catch(() => ({ data: { response: [] } }))
        );
        requestMap.push("transfers");
      }

      const responses = await Promise.all(requests);
      const data = {
        domain,
        competition,
        capabilities,
        teamInfo,
        recentFixtures,
        squad: [],
        statistics: null,
        playerStatistics: [],
        injuries: [],
        transfers: [],
      };

      responses.forEach((response, index) => {
        const key = requestMap[index];
        if (key === "squad") {
          data.squad = response.data.response?.[0]?.players || [];
          return;
        }

        if (key === "statistics") {
          data.statistics = response.data.response || null;
          return;
        }

        if (key === "playerStatistics") {
          data.playerStatistics = response.data.response || [];
          return;
        }

        data[key] = response.data.response || [];
      });

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(`❌ Error obteniendo perfil de ${routeSegment}:`, error.response?.data || error.message);
      res.status(500).json({
        success: false,
        error: "Error al obtener el perfil del equipo",
      });
    }
  };
}

module.exports = {
  listClubCompetitions: createDomainCompetitionListHandler("clubes"),
  listSelectionCompetitions: createDomainCompetitionListHandler("selecciones"),
  getClubCompetitionSeasons: createCompetitionSeasonsHandler("clubes"),
  getSelectionCompetitionSeasons: createCompetitionSeasonsHandler("selecciones"),
  getClubFixtures: createDomainFixturesHandler("clubes"),
  getSelectionFixtures: createDomainFixturesHandler("selecciones"),
  getMixedFixtures: createDomainFixturesHandler("partidos"),
  getClubTeamProfile: createTeamProfileHandler("clubes"),
  getSelectionTeamProfile: createTeamProfileHandler("selecciones"),
};
