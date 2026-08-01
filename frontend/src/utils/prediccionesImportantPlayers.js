/**
 * Jugadores importantes del partido — normalización, índices y ranking por relevancia.
 */

import { resolvePlayerPhotoUrl } from './matchLineups.js';

const GOALKEEPER_POSITIONS = new Set(['G', 'GK', 'Goalkeeper']);
const TOP_LIMIT = 3;

/**
 * @param {*} value
 * @param {number} [fallback=0]
 */
function toNumber(value, fallback = 0) {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * @param {string|null|undefined} position
 */
function isGoalkeeper(position) {
  return GOALKEEPER_POSITIONS.has(String(position || '').trim());
}

/**
 * @param {Object|null} entry — { player, statistics }
 */
export function normalizeImportantPlayerEntry(entry) {
  if (!entry?.player) {
    return null;
  }

  const stats = Array.isArray(entry.statistics) ? entry.statistics[0] : entry.statistics;
  if (!stats) {
    return null;
  }

  const shotsTotal = toNumber(stats.shots?.total);
  const shotsOn = toNumber(stats.shots?.on);
  const shotsOff =
    stats.shots?.off != null ? toNumber(stats.shots.off) : Math.max(0, shotsTotal - shotsOn);

  const passesTotal = toNumber(stats.passes?.total);
  const passesKey = toNumber(stats.passes?.key);
  const dribblesAttempts = toNumber(stats.dribbles?.attempts);
  const dribblesSuccess = toNumber(stats.dribbles?.success);
  const duelsTotal = toNumber(stats.duels?.total);
  const duelsWon = toNumber(stats.duels?.won);
  const touches = stats.touches != null ? toNumber(stats.touches) : null;

  const participationIndex =
    passesTotal * 0.25 +
    passesKey * 3 +
    dribblesAttempts * 1.2 +
    duelsTotal * 0.4 +
    duelsWon * 0.8 +
    (touches != null ? touches * 0.15 : 0);

  const interceptions = toNumber(stats.tackles?.interceptions ?? stats.interceptions);
  const blocks = toNumber(stats.tackles?.blocks ?? stats.blocks);
  const crossesAccurate = toNumber(stats.crosses?.accurate ?? stats.passes?.crosses);
  const foulsCommitted = toNumber(stats.fouls?.committed);
  const foulsDrawn = toNumber(stats.fouls?.drawn);

  const otherScore =
    foulsCommitted * 0.5 +
    foulsDrawn * 0.5 +
    interceptions * 2 +
    blocks * 1.5 +
    crossesAccurate * 1.2 +
    dribblesSuccess * 1.3 +
    passesKey;

  return {
    id: entry.player.id,
    name: entry.player.name || 'Jugador',
    photo: resolvePlayerPhotoUrl(entry.player),
    position: stats.games?.position || null,
    minutes: toNumber(stats.games?.minutes),
    shots: { total: shotsTotal, on: shotsOn, off: shotsOff },
    passes: { total: passesTotal, key: passesKey },
    dribbles: { attempts: dribblesAttempts, success: dribblesSuccess },
    duels: { total: duelsTotal, won: duelsWon },
    fouls: { committed: foulsCommitted, drawn: foulsDrawn },
    saves: toNumber(stats.goals?.saves),
    interceptions,
    blocks,
    crossesAccurate,
    touches,
    participationIndex,
    otherScore,
  };
}

/**
 * @param {Array<Object>} players
 */
function normalizePlayerList(players) {
  const seen = new Set();
  const normalized = [];

  for (const entry of players || []) {
    const player = normalizeImportantPlayerEntry(entry);
    if (!player || seen.has(player.id)) {
      continue;
    }
    seen.add(player.id);
    normalized.push(player);
  }

  return normalized;
}

/**
 * @param {Object|null} fixturePlayersResponse
 * @param {string|number} teamId
 */
function extractFixtureTeamPlayers(fixturePlayersResponse, teamId) {
  const teams = fixturePlayersResponse?.response || [];
  const block = teams.find((teamEntry) => String(teamEntry?.team?.id) === String(teamId));
  return block?.players || [];
}

/**
 * @param {Object|null} fixturePlayersResponse
 */
function hasFixturePlayerStats(fixturePlayersResponse) {
  const teams = fixturePlayersResponse?.response || [];
  return teams.some((teamEntry) =>
    (teamEntry?.players || []).some((entry) => {
      const player = normalizeImportantPlayerEntry(entry);
      return player && (player.minutes > 0 || player.shots.total > 0 || player.passes.total > 0);
    })
  );
}

/**
 * @param {Object} player
 */
function buildHighlightLabel(player) {
  const candidates = [
    { label: 'Pases clave', value: player.passes.key },
    { label: 'Intercepciones', value: player.interceptions },
    { label: 'Bloqueos', value: player.blocks },
    { label: 'Regates exitosos', value: player.dribbles.success },
    { label: 'Centros precisos', value: player.crossesAccurate },
    { label: 'Faltas recibidas', value: player.fouls.drawn },
    { label: 'Faltas cometidas', value: player.fouls.committed },
  ]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const top = candidates[0];
  return top ? `${top.label}: ${top.value}` : null;
}

/**
 * @param {Array<Object>} players
 * @param {string} teamName
 */
function buildTeamImportantPlayers(players, teamName) {
  const normalized = normalizePlayerList(players);

  const topShooters = [...normalized]
    .filter((player) => player.shots.total > 0)
    .sort(
      (a, b) =>
        b.shots.total - a.shots.total ||
        b.shots.on - a.shots.on ||
        b.shots.off - a.shots.off
    )
    .slice(0, TOP_LIMIT);

  const topParticipation = [...normalized]
    .filter((player) => !isGoalkeeper(player.position))
    .sort((a, b) => b.participationIndex - a.participationIndex)
    .slice(0, TOP_LIMIT);

  const startingGoalkeeper =
    [...normalized]
      .filter((player) => isGoalkeeper(player.position))
      .sort((a, b) => b.saves - a.saves || b.minutes - a.minutes)[0] || null;

  const otherHighlights = [...normalized]
    .filter((player) => player.otherScore > 0)
    .sort((a, b) => b.otherScore - a.otherScore)
    .slice(0, TOP_LIMIT)
    .map((player) => ({
      id: player.id,
      name: player.name,
      photo: player.photo,
      highlight: buildHighlightLabel(player),
      stats: {
        foulsCommitted: player.fouls.committed,
        foulsDrawn: player.fouls.drawn,
        interceptions: player.interceptions,
        blocks: player.blocks,
        crossesAccurate: player.crossesAccurate,
        dribblesSuccess: player.dribbles.success,
        keyPasses: player.passes.key,
        touches: player.touches,
      },
    }))
    .filter((player) => player.highlight);

  return {
    teamName,
    topShooters,
    topParticipation,
    startingGoalkeeper,
    otherHighlights,
    hasData:
      topShooters.length > 0 ||
      topParticipation.length > 0 ||
      Boolean(startingGoalkeeper) ||
      otherHighlights.length > 0,
  };
}

/**
 * @param {Object|null} fixtureStatisticsResponse
 * @param {string|number} teamAId
 * @param {string|number} teamBId
 */
function extractFixtureTeamStatistics(fixtureStatisticsResponse, teamAId, teamBId) {
  const rows = fixtureStatisticsResponse?.response || [];
  const map = {};

  for (const row of rows) {
    const teamId = row?.team?.id;
    if (teamId == null) {
      continue;
    }

    const statsMap = {};
    for (const stat of row.statistics || []) {
      if (stat?.type) {
        statsMap[stat.type] = stat.value;
      }
    }
    map[String(teamId)] = statsMap;
  }

  return {
    equipoA: map[String(teamAId)] || null,
    equipoB: map[String(teamBId)] || null,
  };
}

/**
 * Combina fixtures/players con estadísticas de temporada como respaldo.
 */
export function buildImportantPlayersViewModel({
  fixturePlayersResponse = null,
  seasonPlayersResponseA = null,
  seasonPlayersResponseB = null,
  fixtureStatisticsResponse = null,
  teamAId,
  teamBId,
  teamAName = 'Equipo A',
  teamBName = 'Equipo B',
}) {
  const useFixtureSource = hasFixturePlayerStats(fixturePlayersResponse);

  const playersA = useFixtureSource
    ? extractFixtureTeamPlayers(fixturePlayersResponse, teamAId)
    : seasonPlayersResponseA?.response || [];

  const playersB = useFixtureSource
    ? extractFixtureTeamPlayers(fixturePlayersResponse, teamBId)
    : seasonPlayersResponseB?.response || [];

  const equipoA = buildTeamImportantPlayers(playersA, teamAName);
  const equipoB = buildTeamImportantPlayers(playersB, teamBName);

  return {
    available: equipoA.hasData || equipoB.hasData,
    source: useFixtureSource ? 'fixture' : 'season',
    fixtureStatistics: extractFixtureTeamStatistics(fixtureStatisticsResponse, teamAId, teamBId),
    equipoA,
    equipoB,
  };
}

/**
 * @param {Array<Object>} players
 * @param {(player: Object) => number} selector
 */
export function sortPlayersByRelevance(players, selector) {
  return [...(players || [])].sort((a, b) => selector(b) - selector(a));
}
