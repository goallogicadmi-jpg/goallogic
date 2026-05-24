import infoData from '../data/competitionInfo.json';

/**
 * Obtiene la ficha editorial mock de una competición.
 */
const META_KEYS = new Set(['source', 'updatedAt', 'default']);

export function getCompetitionInfo(leagueId) {
  const key = leagueId != null ? String(leagueId) : '';
  const base = infoData.default || {};
  const byLeague = !META_KEYS.has(key) ? infoData[key] : null;

  if (byLeague && typeof byLeague === 'object' && !Array.isArray(byLeague)) {
    return { ...base, ...byLeague };
  }

  return { ...base };
}

export function getCompetitionInfoMeta() {
  return {
    source: infoData.source || 'Información (mock)',
    updatedAt: infoData.updatedAt || null,
  };
}
