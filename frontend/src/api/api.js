import { authFetch } from '../setupApiAuth.js';
import {
  filterFixturesByLocalDay,
  getUtcDatesToFetchForLocalDay,
} from '../utils/getDates.js';

export async function analizarPartido(liga, local, visitante) {
const res = await authFetch(`/api/analizar?liga=${liga}&local=${local}&visitante=${visitante}`);
return res.json();
}

export async function buscarEquipos(query) {
const res = await authFetch(`/api/search-teams?q=${query}`);
return res.json();
}

export async function obtenerLigas() {
  try {
    const res = await authFetch(`/api/leagues`);
    const data = await res.json();
    console.log("🔍 Respuesta completa de /api/leagues:", data);
    console.log("🔍 Tipo de respuesta:", typeof data);
    console.log("🔍 Tiene 'response'?:", data.response !== undefined);
    console.log("🔍 Tiene 'results'?:", data.results !== undefined);
    
    // La API de football devuelve { response: [...] }
    if (data.response && Array.isArray(data.response)) {
      console.log("✅ Ligas encontradas:", data.response.length);
      return data;
    }
    
    // Si viene directamente como array
    if (Array.isArray(data)) {
      console.log("✅ Ligas encontradas (array directo):", data.length);
      return { response: data };
    }
    
    console.warn("⚠️ Formato de respuesta inesperado:", data);
    return { response: [] };
  } catch (error) {
    console.error("❌ Error en obtenerLigas():", error);
    throw error;
  }
}

const domainApiSegment = {
  club: "clubes",
  selection: "selecciones",
};

const matchesScopeApiSegment = {
  club: "/api/clubes/fixtures",
  selection: "/api/selecciones/fixtures",
  all: "/api/partidos",
};

function getDomainApiBase(domain = "club") {
  return `/api/${domainApiSegment[domain] || domainApiSegment.club}`;
}

function getMatchesApiBase(scope = "club") {
  return matchesScopeApiSegment[scope] || matchesScopeApiSegment.club;
}

export function normalizeDomainFixturesPayload(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }

  if (payload?.response && Array.isArray(payload.response)) {
    return payload.response;
  }

  return [];
}

export async function getCompetitionsByDomain(domain = "club") {
  const res = await authFetch(`${getDomainApiBase(domain)}/competitions`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return payload.data || [];
}

export async function getCompetitionSeasonsByDomain(domain = "club", competitionId) {
  const res = await authFetch(`${getDomainApiBase(domain)}/competitions/${competitionId}/seasons`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return payload.data || null;
}

export async function getFixturesByDomain(domain = "club", date, competitionId = null) {
  return getMatchesFeed(domain, { date, competitionId });
}

async function fetchMatchesFeedForUtcDate(scope, utcDate, competitionId = null) {
  const params = new URLSearchParams({ date: utcDate });
  if (competitionId) {
    params.set("competitionId", competitionId);
  }

  const res = await authFetch(`${getMatchesApiBase(scope)}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return normalizeDomainFixturesPayload(payload);
}

/**
 * Feed de partidos para un día de calendario LOCAL.
 * Pide 1–N fechas UTC a la API y filtra por rango local [start, end].
 */
export async function getMatchesFeed(scope = "club", { date, competitionId = null } = {}) {
  if (!date) {
    return [];
  }

  const utcDates = getUtcDatesToFetchForLocalDay(date);
  const batches = await Promise.all(
    utcDates.map((utcDate) => fetchMatchesFeedForUtcDate(scope, utcDate, competitionId))
  );

  const merged = batches.flat();
  const filtered = filterFixturesByLocalDay(merged, date);

  return filtered.map((fixture) => ({
    ...fixture,
    domain: fixture.domain || (scope === "all" ? null : scope),
  }));
}

export async function getDomainMatchesFeed(domain = "club", { date, competitionId = null } = {}) {
  return getMatchesFeed(domain, { date, competitionId });
}

export async function getGlobalMatchesFeed({ date, competitionId = null } = {}) {
  return getMatchesFeed("all", { date, competitionId });
}

export async function getTeamProfileByDomain(domain = "club", teamId, options = {}) {
  const params = new URLSearchParams();
  Object.entries(options).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const res = await authFetch(`${getDomainApiBase(domain)}/teams/${teamId}/profile${query ? `?${query}` : ""}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return payload.data || null;
}

export async function obtenerPartidos(teamId, limit = 10) {
const res = await authFetch(`/api/team-last-matches?teamId=${teamId}&limit=${limit}`);
return res.json();
}

export async function obtenerEquiposPorLiga(liga) {
const res = await authFetch(`/api/equipos?liga=${encodeURIComponent(liga)}`);
return res.json();
}

export async function obtenerInfoEquipo(teamId) {
const res = await authFetch(`/api/team-info?teamId=${teamId}`);
return res.json();
}

export async function obtenerJugadoresEquipo(teamId, season) {
const res = await authFetch(`/api/team-squad?teamId=${teamId}&season=${season}`);
return res.json();
}

export async function obtenerEstadisticasEquipo(teamId, leagueId, season) {
const res = await authFetch(`/api/team-stats?teamId=${teamId}&leagueId=${leagueId}&season=${season}`);
return res.json();
}

export async function obtenerUltimosPartidos(teamId, limit) {
const res = await authFetch(`/api/team-last-matches?teamId=${teamId}&limit=${limit}`);
return res.json();
}

// Funciones para el módulo de equipos
export async function getTeamInfo(teamId) {
  try {
    const res = await authFetch(`/api/team-info/${teamId}`);
    const data = await res.json();
    if (data.response && data.response.length > 0) {
      return data.response[0];
    }
    return null;
  } catch (error) {
    console.error("❌ Error obteniendo info del equipo:", error);
    throw error;
  }
}

export async function getTeamStats(teamId, leagueId, season) {
  try {
    const res = await authFetch(`/api/team-stats?teamId=${teamId}&leagueId=${leagueId}&season=${season}`);
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas del equipo:", error);
    throw error;
  }
}

export async function getTeamFixtures(teamId, limit = 10) {
  try {
    const res = await authFetch(`/api/team-last-matches?teamId=${teamId}&limit=${limit}`);
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo partidos del equipo:", error);
    throw error;
  }
}

export async function getTeamPlayers(teamId, season) {
  try {
    const res = await authFetch(`/api/team-squad?teamId=${teamId}&season=${season}`);
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo jugadores del equipo:", error);
    throw error;
  }
}

// Obtener lesiones del equipo (requiere temporada; liga y fixture opcionales)
export async function getTeamInjuries(teamId, options = {}) {
  try {
    const leagueId =
      typeof options === 'object' && options !== null ? options.leagueId : undefined;
    const season =
      typeof options === 'object' && options !== null ? options.season : undefined;
    const fixtureId =
      typeof options === 'object' && options !== null ? options.fixtureId : undefined;

    const params = new URLSearchParams({ teamId: String(teamId) });
    if (leagueId != null && leagueId !== '') {
      params.set('leagueId', String(leagueId));
    }
    if (season != null && season !== '') {
      params.set('season', String(season));
    }
    if (fixtureId != null && fixtureId !== '') {
      params.set('fixtureId', String(fixtureId));
    }

    const res = await authFetch(`/api/team-injuries?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error || `Error ${res.status} obteniendo lesiones`);
    }
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo lesiones del equipo:", error);
    throw error;
  }
}

// Obtener transferencias del equipo
export async function getTeamTransfers(teamId) {
  try {
    const res = await authFetch(`/api/team-transfers?teamId=${teamId}`);
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo transferencias del equipo:", error);
    throw error;
  }
}

/** Top goleadores oficiales de la liga/temporada (API-Football vía backend). */
export async function getLeagueTopScorers(leagueId, season) {
  const league = encodeURIComponent(String(leagueId ?? '').trim());
  const year = encodeURIComponent(String(season ?? '').trim());

  if (!league || !year) {
    throw new Error('Faltan leagueId o season para cargar goleadores');
  }

  try {
    const res = await authFetch(`/api/players/topscorers?leagueId=${league}&season=${year}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.error || res.statusText || 'Error desconocido';
      throw new Error(`Error ${res.status}: ${message}`);
    }

    if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
      throw new Error('No hay datos de goleadores para esta competición');
    }

    return data;
  } catch (error) {
    console.error('❌ Error obteniendo top goleadores:', error);
    throw error;
  }
}

/** Top asistencias oficiales de la liga/temporada (API-Football vía backend). */
export async function getLeagueTopAssists(leagueId, season) {
  const league = encodeURIComponent(String(leagueId ?? '').trim());
  const year = encodeURIComponent(String(season ?? '').trim());

  if (!league || !year) {
    throw new Error('Faltan leagueId o season para cargar asistencias');
  }

  try {
    const res = await authFetch(`/api/players/topassists?leagueId=${league}&season=${year}`);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.error || res.statusText || 'Error desconocido';
      throw new Error(`Error ${res.status}: ${message}`);
    }

    if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
      throw new Error('No hay datos de asistencias para esta competición');
    }

    return data;
  } catch (error) {
    console.error('❌ Error obteniendo top asistencias:', error);
    throw error;
  }
}

// Obtener estadísticas detalladas de jugadores (sin datos personales)
export async function getTeamPlayersStats(teamId, leagueId, season) {
  try {
    const res = await authFetch(`/api/team-players-stats?teamId=${teamId}&leagueId=${leagueId}&season=${season}`);
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas de jugadores:", error);
    throw error;
  }
}

// ======================================================
// MÓDULO DE JUGADORES - Nuevas funciones
// ======================================================

// Obtener lista de jugadores por equipo
export async function getJugadoresEquipo(teamId) {
  try {
    const res = await authFetch(`/api/jugadores/${teamId}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo jugadores del equipo:", error);
    throw error;
  }
}

// Obtener información completa de un jugador
export async function getJugadorInfo(playerId) {
  try {
    const res = await authFetch(`/api/jugador/${playerId}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo información del jugador:", error);
    throw error;
  }
}

// Obtener últimos partidos del jugador
export async function getJugadorPartidos(playerId) {
  try {
    const res = await authFetch(`/api/jugador/${playerId}/partidos`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo partidos del jugador:", error);
    throw error;
  }
}

// Fixtures de una liga/temporada (próximos y últimos)
export async function getLeagueFixtures(leagueId, season, { next = 10, last = 10 } = {}) {
  try {
    const params = new URLSearchParams({
      leagueId: String(leagueId),
      season: String(season),
      next: String(next),
      last: String(last),
    });
    const res = await authFetch(`/api/fixtures/league?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    return res.json();
  } catch (error) {
    console.error("❌ Error obteniendo fixtures de la liga:", error);
    throw error;
  }
}

// Obtener partidos por fecha (con filtro opcional de liga)
export async function getFixturesByDate(date, leagueId = null) {
  try {
    let url = `/api/fixtures?date=${date}`;
    if (leagueId) {
      url += `&leagueId=${leagueId}`;
    }
    const res = await authFetch(url);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo partidos por fecha:", error);
    throw error;
  }
}

/**
 * Partidos para un día de calendario LOCAL (multi-fetch UTC + filtro local).
 * @param {string} dateLocal YYYY-MM-DD local
 * @param {number|string|null} leagueId
 */
export async function getFixturesByDateForLocalDay(dateLocal, leagueId = null) {
  const utcDates = getUtcDatesToFetchForLocalDay(dateLocal);
  const payloads = await Promise.all(utcDates.map((d) => getFixturesByDate(d, leagueId)));
  const merged = payloads.flatMap((p) => (Array.isArray(p?.response) ? p.response : []));
  return { response: filterFixturesByLocalDay(merged, dateLocal) };
}

// ======================================================
// MÓDULO MATCH CENTER - Funciones para detalles del partido
// ======================================================

export async function getLiveFixtures() {
  const res = await authFetch('/api/fixtures/live');
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return Array.isArray(payload?.response) ? payload.response : [];
}

export async function getFixtureById(fixtureId) {
  if (!fixtureId) {
    return null;
  }

  const res = await authFetch(`/api/fixtures/${fixtureId}`);
  if (!res.ok) {
    throw new Error(`Error ${res.status}: ${res.statusText}`);
  }

  const payload = await res.json();
  return payload?.fixture || null;
}

// Obtener eventos de un partido
export async function getFixtureEvents(fixtureId) {
  try {
    const res = await authFetch(`/api/fixtures/${fixtureId}/events`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo eventos del partido:", error);
    throw error;
  }
}

// Obtener alineaciones de un partido
export async function getFixtureLineups(fixtureId) {
  try {
    const res = await authFetch(`/api/fixtures/${fixtureId}/lineups`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo alineaciones del partido:", error);
    throw error;
  }
}

// Vista táctica del partido (posiciones promedio + pases)
export async function getFixtureTactical(fixtureId, homeTeamId, awayTeamId) {
  try {
    const params = new URLSearchParams();
    if (homeTeamId != null) params.set('homeTeamId', String(homeTeamId));
    if (awayTeamId != null) params.set('awayTeamId', String(awayTeamId));
    const qs = params.toString();
    const url = `/api/fixtures/${fixtureId}/tactical${qs ? `?${qs}` : ''}`;
    const res = await authFetch(url);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (error) {
    console.error('❌ Error obteniendo vista táctica:', error);
    throw error;
  }
}

// Mapa de calor de un jugador en un partido
export async function getFixturePlayerHeatmap(fixtureId, playerId) {
  try {
    const res = await authFetch(`/api/fixtures/${fixtureId}/player/${playerId}/heatmap`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo heatmap del jugador:', error);
    throw error;
  }
}

// Estadísticas de un jugador en un partido concreto
export async function getFixturePlayerStats(fixtureId, playerId) {
  try {
    const res = await authFetch(`/api/fixtures/${fixtureId}/player/${playerId}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('❌ Error obteniendo stats del jugador en el partido:', error);
    throw error;
  }
}

// Obtener estadísticas de un partido
export async function getFixtureStatistics(fixtureId) {
  try {
    const res = await authFetch(`/api/fixtures/${fixtureId}/statistics`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo estadísticas del partido:", error);
    throw error;
  }
}

// Obtener H2H (Head to Head) entre dos equipos
export async function getH2H(team1Id, team2Id) {
  try {
    const res = await authFetch(`/api/h2h?team1=${team1Id}&team2=${team2Id}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo H2H:", error);
    throw error;
  }
}


// ======================================================
// MÓDULO DE PREDICCIONES
// ======================================================

// Obtener predicciones de un partido
export async function getMatchPredictions(fixtureId, profile = 'balanceado') {
  try {
    const res = await authFetch(`/api/predictions?fixtureId=${fixtureId}&profile=${profile}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo predicciones:", error);
    throw error;
  }
}

// Comparar predicciones de dos partidos
export async function comparePredictions(fixtureIdA, fixtureIdB, profile = 'balanceado') {
  try {
    const res = await authFetch(`/api/predictions/compare?fixtureIdA=${fixtureIdA}&fixtureIdB=${fixtureIdB}&profile=${profile}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error comparando predicciones:", error);
    throw error;
  }
}

// Obtener historial de predicciones de un equipo
export async function getPredictionHistory(teamId, limit = 10) {
  try {
    const res = await authFetch(`/api/predictions/history?teamId=${teamId}&limit=${limit}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo historial de predicciones:", error);
    throw error;
  }
}

// Exportar análisis de predicción
export async function exportPredictionAnalysis(fixtureId, profile = 'balanceado') {
  try {
    const res = await authFetch(`/api/predictions/export?fixtureId=${fixtureId}&profile=${profile}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error exportando análisis:", error);
    throw error;
  }
}

// Obtener fixture próximo y odds entre dos equipos
export async function getUpcomingFixtureWithOdds(team1Id, team2Id, options = {}) {
  try {
    const leagueId = typeof options === 'object' && options !== null
      ? options.leagueId
      : options;
    const season = typeof options === 'object' && options !== null ? options.season : null;
    const fixtureId = typeof options === 'object' && options !== null ? options.fixtureId : null;

    const params = new URLSearchParams({
      team1: String(team1Id),
      team2: String(team2Id),
    });
    if (leagueId != null && leagueId !== '') {
      params.set('leagueId', String(leagueId));
    }
    if (season != null && season !== '') {
      params.set('season', String(season));
    }
    if (fixtureId != null && fixtureId !== '') {
      params.set('fixtureId', String(fixtureId));
    }
    const res = await authFetch(`/api/fixtures/upcoming?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo fixture próximo:", error);
    throw error;
  }
}
