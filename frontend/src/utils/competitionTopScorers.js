import { getTablaFromTorneoResponse } from './competitionStandings';
import { flattenCupGroupsToTeams } from './selectionCompetition';

/** Caché en memoria por liga + temporada (misma respuesta al volver al tab). */
const topScorersApiCache = new Map();
const topAssistsApiCache = new Map();

function sortTeamsById(teams = []) {
  return [...teams].sort((a, b) => a.teamId - b.teamId);
}

export function getTopScorersApiCacheKey(leagueId, season) {
  return `${leagueId}|${season}`;
}

export function getTopAssistsApiCacheKey(leagueId, season) {
  return `assists|${leagueId}|${season}`;
}

/**
 * Extrae equipos únicos desde /estadisticas/torneo (usado por Ranking FIFA).
 */
export function extractTeamsFromTorneoResponse(data) {
  if (!data) return [];

  const teams = new Map();

  const addTeam = (entry) => {
    const teamId = entry?.equipoId ?? entry?.teamId;
    const teamName = entry?.equipo ?? entry?.teamName;
    if (teamId && teamName) {
      teams.set(Number(teamId), { teamId: Number(teamId), teamName });
    }
  };

  if (Array.isArray(data.grupos)) {
    data.grupos.forEach((group) => {
      (group?.tabla || []).forEach(addTeam);
    });
  }

  getTablaFromTorneoResponse(data).forEach(addTeam);

  return sortTeamsById([...teams.values()]);
}

export function mergeTeamsFromCupAndTorneo(torneoTeams, cupGroups) {
  const map = new Map(torneoTeams.map((t) => [t.teamId, t]));

  flattenCupGroupsToTeams(cupGroups).forEach((entry) => {
    if (entry.equipoId) {
      map.set(Number(entry.equipoId), {
        teamId: Number(entry.equipoId),
        teamName: entry.equipo,
      });
    }
  });

  return sortTeamsById([...map.values()]);
}

function mapPlayerRankingEntry(entry, index) {
  const stats = entry?.statistics?.[0] || {};
  const team = stats?.team || {};
  const games = stats?.games || {};
  const goals = stats?.goals || {};

  return {
    rank: index + 1,
    playerId: entry?.player?.id ?? null,
    playerName: entry?.player?.name || 'N/D',
    teamId: team?.id ?? null,
    teamName: team?.name || '—',
    goals: Number(goals.total) || 0,
    assists: Number(goals.assists) || 0,
    appearances: Number(games.appearences ?? games.appearance) || 0,
    minutes: Number(games.minutes) || 0,
  };
}

/**
 * Normaliza la respuesta de GET /players/topscorers sin reordenar ni fusionar.
 */
export function parseTopScorersApiResponse(data) {
  if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
    throw new Error('No hay datos de goleadores para esta competición');
  }

  const list = Array.isArray(data?.response) ? data.response : [];
  return list.map(mapPlayerRankingEntry);
}

/**
 * Normaliza la respuesta de GET /players/topassists sin reordenar ni fusionar.
 */
export function parseTopAssistsApiResponse(data) {
  if (data?.errors && typeof data.errors === 'object' && Object.keys(data.errors).length > 0) {
    return [];
  }

  const list = Array.isArray(data?.response) ? data.response : [];
  return list.map(mapPlayerRankingEntry);
}

/**
 * Una sola petición al endpoint oficial; devuelve filas en el orden de la API.
 */
export async function fetchLeagueTopScorers(leagueId, season, fetcher) {
  const normalizedLeagueId = String(leagueId ?? '').trim();
  const normalizedSeason = String(season ?? '').trim();
  const cacheKey = getTopScorersApiCacheKey(normalizedLeagueId, normalizedSeason);

  if (!normalizedLeagueId || !normalizedSeason) {
    return [];
  }

  if (topScorersApiCache.has(cacheKey)) {
    return topScorersApiCache.get(cacheKey);
  }

  const raw = await fetcher(normalizedLeagueId, normalizedSeason);
  const rows = parseTopScorersApiResponse(raw);
  topScorersApiCache.set(cacheKey, rows);
  return rows;
}

/**
 * Una sola petición al endpoint oficial de asistencias; orden de la API.
 */
export async function fetchLeagueTopAssists(leagueId, season, fetcher) {
  const normalizedLeagueId = String(leagueId ?? '').trim();
  const normalizedSeason = String(season ?? '').trim();
  const cacheKey = getTopAssistsApiCacheKey(normalizedLeagueId, normalizedSeason);

  if (!normalizedLeagueId || !normalizedSeason) {
    return [];
  }

  if (topAssistsApiCache.has(cacheKey)) {
    return topAssistsApiCache.get(cacheKey);
  }

  const raw = await fetcher(normalizedLeagueId, normalizedSeason);
  const rows = parseTopAssistsApiResponse(raw);
  topAssistsApiCache.set(cacheKey, rows);
  return rows;
}

/** Limpia caché tras error de red o 404 (p. ej. servidor sin reiniciar). */
export function clearTopScorersApiCache(leagueId, season) {
  topScorersApiCache.delete(getTopScorersApiCacheKey(String(leagueId ?? '').trim(), String(season ?? '').trim()));
}

export function clearTopAssistsApiCache(leagueId, season) {
  topAssistsApiCache.delete(getTopAssistsApiCacheKey(String(leagueId ?? '').trim(), String(season ?? '').trim()));
}
