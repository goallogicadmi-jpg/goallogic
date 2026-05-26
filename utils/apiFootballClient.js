const axios = require('axios');

function getApiHeaders() {
  return {
    'x-apisports-key': process.env.API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io',
  };
}

function assertApiKey() {
  if (!process.env.API_KEY) {
    const err = new Error('API_KEY no configurada');
    err.code = 'API_KEY_MISSING';
    throw err;
  }
}

async function fetchLeagueInfo(leagueId) {
  assertApiKey();
  const response = await axios.get(
    `https://v3.football.api-sports.io/leagues?id=${leagueId}`,
    { headers: getApiHeaders(), timeout: 20000 }
  );
  const row = response.data?.response?.[0];
  if (!row) throw new Error('Liga no encontrada en API-Football');
  return row;
}

async function resolveSeason(leagueId, seasonOverride = null) {
  if (seasonOverride && Number.isFinite(Number(seasonOverride))) {
    return Number(seasonOverride);
  }
  const info = await fetchLeagueInfo(leagueId);
  const current = info.seasons?.find((s) => s.current === true);
  if (current?.year) return current.year;
  const years = (info.seasons || []).map((s) => s.year).filter(Boolean);
  if (years.length) return Math.max(...years);
  throw new Error('No se pudo determinar la temporada');
}

async function fetchStandings(leagueId, season) {
  assertApiKey();
  const response = await axios.get(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    { headers: getApiHeaders(), timeout: 20000 }
  );
  return response.data?.response || [];
}

async function fetchTeams(leagueId, season) {
  assertApiKey();
  const response = await axios.get(
    `https://v3.football.api-sports.io/teams?league=${leagueId}&season=${season}`,
    { headers: getApiHeaders(), timeout: 20000 }
  );
  return response.data?.response || [];
}

async function fetchFixturesSample(leagueId, season) {
  assertApiKey();
  const response = await axios.get(
    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&last=5`,
    { headers: getApiHeaders(), timeout: 20000 }
  );
  return response.data?.response || [];
}

module.exports = {
  getApiHeaders,
  assertApiKey,
  fetchLeagueInfo,
  resolveSeason,
  fetchStandings,
  fetchTeams,
  fetchFixturesSample,
};
