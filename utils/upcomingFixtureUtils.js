const axios = require("axios");

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]);
const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);

function normalizeTeamId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function teamsMatchFixture(fixture, team1Id, team2Id) {
  const home = Number(fixture?.teams?.home?.id);
  const away = Number(fixture?.teams?.away?.id);
  const t1 = normalizeTeamId(team1Id);
  const t2 = normalizeTeamId(team2Id);
  if (!t1 || !t2) return false;
  return (home === t1 && away === t2) || (home === t2 && away === t1);
}

/**
 * Partido programado o por definir: no terminado, no en vivo, fecha futura o sin fecha (TBD).
 */
function isUpcomingFixture(fixture) {
  const short = fixture?.fixture?.status?.short;
  if (!short) {
    const date = fixture?.fixture?.date;
    return !date || new Date(date).getTime() >= Date.now() - 5 * 60 * 1000;
  }

  if (FINISHED_STATUSES.has(short) || LIVE_STATUSES.has(short)) {
    return false;
  }

  const date = fixture?.fixture?.date;
  if (date) {
    return new Date(date).getTime() >= Date.now() - 5 * 60 * 1000;
  }

  return ["NS", "TBD", "PST", "SUSP", "INT"].includes(short);
}

function pickSoonestFixture(fixtures) {
  const valid = (fixtures || []).filter((f) => f?.fixture?.id && isUpcomingFixture(f));
  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    const dateA = a?.fixture?.date ? new Date(a.fixture.date).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b?.fixture?.date ? new Date(b.fixture.date).getTime() : Number.MAX_SAFE_INTEGER;
    return dateA - dateB;
  });

  return valid[0];
}

function dedupeFixtures(fixtures) {
  const map = new Map();
  for (const fixture of fixtures || []) {
    const id = fixture?.fixture?.id;
    if (id) map.set(id, fixture);
  }
  return [...map.values()];
}

async function fetchJson(url, apiHeaders) {
  const response = await axios.get(url, { headers: apiHeaders });
  return response.data?.response || [];
}

async function fetchFixtureById(fixtureId, apiHeaders) {
  const id = normalizeTeamId(fixtureId);
  if (!id) return null;
  const rows = await fetchJson(
    `https://v3.football.api-sports.io/fixtures?id=${id}`,
    apiHeaders
  );
  return rows[0] || null;
}

/**
 * Busca el próximo partido entre dos equipos usando varias fuentes de API-Football.
 * @param {object} [options]
 * @param {number|string} [options.leagueId] - Prioriza fixtures de esta competición
 * @param {number|string} [options.season] - Temporada de la competición
 * @param {number|string} [options.fixtureId] - ID exacto si el usuario viene del fixture
 */
async function findUpcomingFixtureBetweenTeams(team1, team2, apiHeaders, options = {}) {
  const team1Id = normalizeTeamId(team1);
  const team2Id = normalizeTeamId(team2);
  const leagueId = normalizeTeamId(options.leagueId);
  const season = normalizeTeamId(options.season);
  const fixtureId = normalizeTeamId(options.fixtureId);

  if (!team1Id || !team2Id) {
    return null;
  }

  if (fixtureId) {
    try {
      const direct = await fetchFixtureById(fixtureId, apiHeaders);
      if (direct && teamsMatchFixture(direct, team1Id, team2Id) && isUpcomingFixture(direct)) {
        return direct;
      }
    } catch {
      // Continuar con búsqueda amplia
    }
  }

  const h2hKey = `${Math.min(team1Id, team2Id)}-${Math.max(team1Id, team2Id)}`;
  const sourcePromises = [
    fetchJson(
      `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${h2hKey}&next=15`,
      apiHeaders
    ),
    fetchJson(`https://v3.football.api-sports.io/fixtures?team=${team1Id}&next=30`, apiHeaders),
    fetchJson(`https://v3.football.api-sports.io/fixtures?team=${team2Id}&next=30`, apiHeaders),
    (async () => {
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 365);
      const from = today.toISOString().split("T")[0];
      const to = future.toISOString().split("T")[0];
      return fetchJson(
        `https://v3.football.api-sports.io/fixtures?team=${team1Id}&from=${from}&to=${to}`,
        apiHeaders
      );
    })(),
  ];

  if (leagueId && season) {
    sourcePromises.push(
      fetchJson(
        `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&next=50`,
        apiHeaders
      ),
      (async () => {
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + 365);
        const from = today.toISOString().split("T")[0];
        const to = future.toISOString().split("T")[0];
        return fetchJson(
          `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`,
          apiHeaders
        );
      })()
    );
  }

  const sources = await Promise.allSettled(sourcePromises);

  let candidates = [];
  for (const result of sources) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      candidates = candidates.concat(result.value);
    }
  }

  const matched = dedupeFixtures(candidates).filter((fixture) =>
    teamsMatchFixture(fixture, team1Id, team2Id)
  );

  const leagueMatched =
    leagueId && season
      ? matched.filter((f) => Number(f?.league?.id) === leagueId)
      : [];

  if (leagueMatched.length > 0) {
    return pickSoonestFixture(leagueMatched);
  }

  return pickSoonestFixture(matched);
}

module.exports = {
  normalizeTeamId,
  teamsMatchFixture,
  isUpcomingFixture,
  pickSoonestFixture,
  findUpcomingFixtureBetweenTeams,
  fetchFixtureById,
};
