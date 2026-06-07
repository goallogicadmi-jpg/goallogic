/**
 * Amistosos internacionales y ecosistema Mundial (API-Football / API-Sports v3).
 * - Liga 10: Friendlies (amistosos FIFA entre selecciones, incl. previos al Mundial)
 * - Liga 1: FIFA World Cup (partidos oficiales del torneo)
 */

/** Amistosos internacionales de selecciones */
const INTERNATIONAL_FRIENDLY_LEAGUE_IDS = new Set([10]);

/**
 * Ligas del ecosistema Mundial que conviene pedir explícitamente por fecha
 * (el listado general fixtures?date= a veces no trae todas las competiciones).
 */
const WORLD_CUP_ECOSYSTEM_LEAGUE_IDS = [10, 1];

/**
 * @param {'club'|'selection'|'all'} scope
 */
function getSupplementarySelectionLeagueIds(scope) {
  if (scope !== 'selection' && scope !== 'all') {
    return [];
  }
  return WORLD_CUP_ECOSYSTEM_LEAGUE_IDS;
}

/**
 * @param {Object} fixture
 */
function isWorldCupRelatedFriendly(fixture) {
  const round = String(fixture?.league?.round || '').toLowerCase();
  const name = String(fixture?.league?.name || '').toLowerCase();

  if (!round.includes('friendly') && !name.includes('friendly') && !name.includes('friend')) {
    return false;
  }

  return (
    round.includes('world cup') ||
    round.includes('worldcup') ||
    round.includes('fifa') ||
    name.includes('world cup') ||
    name.includes('mundial')
  );
}

/**
 * @param {Object} fixture
 */
function isInternationalFriendlyFixture(fixture) {
  const leagueId = Number(fixture?.league?.id);
  if (INTERNATIONAL_FRIENDLY_LEAGUE_IDS.has(leagueId)) {
    return true;
  }

  if (isWorldCupRelatedFriendly(fixture)) {
    return true;
  }

  const type = String(fixture?.league?.type || '').toLowerCase();
  const name = String(fixture?.league?.name || '').toLowerCase();

  if (type !== 'friendly') {
    return false;
  }

  return (
    name.includes('friend') ||
    name.includes('amist') ||
    name.includes('international')
  );
}

/**
 * @param {Object} fixture
 */
function buildInternationalFriendlyCompetitionMeta(fixture) {
  const leagueId = Number(fixture?.league?.id) || 10;
  const worldCupRelated = isWorldCupRelatedFriendly(fixture);

  return {
    id: leagueId,
    name: worldCupRelated
      ? 'World Cup Friendlies'
      : fixture?.league?.name || 'International Friendlies',
    country: fixture?.league?.country || 'World',
    logo: fixture?.league?.logo || `https://media.api-sports.io/football/leagues/${leagueId}.png`,
    domain: 'selection',
    type: 'Friendly',
    format: 'friendly',
    participantType: 'national_team',
    priority: worldCupRelated ? 2 : 10,
    seasonMode: 'calendar_year',
    features: {
      hasTransfers: false,
      hasInjuries: false,
      hasLeagueStats: false,
      hasSquad: true,
      hasStandings: false,
      hasKnockout: false,
    },
  };
}

/**
 * Resuelve competición del catálogo o amistoso internacional para scopes selection/all.
 * @param {Object} fixture
 * @param {Map<number, Object>} competitionLookup
 * @param {'club'|'selection'|'all'} scope
 */
function resolveCompetitionForScopedFixture(fixture, competitionLookup, scope) {
  const leagueId = Number(fixture?.league?.id);
  if (competitionLookup.has(leagueId)) {
    return competitionLookup.get(leagueId);
  }

  if ((scope === 'selection' || scope === 'all') && isInternationalFriendlyFixture(fixture)) {
    return buildInternationalFriendlyCompetitionMeta(fixture);
  }

  return null;
}

/**
 * Deduplica fixtures crudos de API por fixture.id.
 * @param {Array} fixtures
 */
function dedupeRawFixtures(fixtures) {
  const map = new Map();
  (fixtures || []).forEach((fixture) => {
    const id = fixture?.fixture?.id;
    if (id == null) return;
    map.set(String(id), fixture);
  });
  return Array.from(map.values());
}

module.exports = {
  INTERNATIONAL_FRIENDLY_LEAGUE_IDS,
  WORLD_CUP_ECOSYSTEM_LEAGUE_IDS,
  getSupplementarySelectionLeagueIds,
  isWorldCupRelatedFriendly,
  isInternationalFriendlyFixture,
  buildInternationalFriendlyCompetitionMeta,
  resolveCompetitionForScopedFixture,
  dedupeRawFixtures,
};
