/**
 * Utilidades para normalizar respuestas de /injuries (API-Football).
 */

function parseFixtureTimestamp(entry) {
  const ts = entry?.fixture?.timestamp;
  if (ts) return Number(ts) * 1000;
  const date = entry?.fixture?.date;
  return date ? new Date(date).getTime() : 0;
}

/**
 * Un jugador puede aparecer en varios fixtures; conservamos el registro más reciente.
 */
function dedupeInjuriesByPlayer(entries) {
  const map = new Map();

  for (const entry of entries || []) {
    const playerId = entry?.player?.id;
    const key = playerId || entry?.player?.name;
    if (!key) continue;

    const existing = map.get(key);
    if (!existing || parseFixtureTimestamp(entry) >= parseFixtureTimestamp(existing)) {
      map.set(key, entry);
    }
  }

  return [...map.values()].sort((a, b) => parseFixtureTimestamp(b) - parseFixtureTimestamp(a));
}

/**
 * Orden de consultas: fixture (si hay) → team+league+season → team+season → team.
 */
function buildInjuriesQueryPlans({ teamId, leagueId, season, fixtureId }) {
  const plans = [];
  const team = teamId ? String(teamId) : null;
  const league = leagueId ? String(leagueId) : null;
  const seasonStr = season ? String(season) : null;

  if (fixtureId) {
    plans.push({ query: `fixture=${fixtureId}`, label: 'fixture' });
  }
  if (team && league && seasonStr) {
    plans.push({ query: `team=${team}&league=${league}&season=${seasonStr}`, label: 'team-league-season' });
  }
  if (team && seasonStr) {
    plans.push({ query: `team=${team}&season=${seasonStr}`, label: 'team-season' });
  }
  if (team) {
    plans.push({ query: `team=${team}`, label: 'team-only' });
  }

  return plans;
}

module.exports = {
  dedupeInjuriesByPlayer,
  buildInjuriesQueryPlans,
};
