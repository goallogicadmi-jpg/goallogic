/**
 * Normalización de estadísticas de jugador por partido (API-Football fixtures/players).
 */

import { resolvePlayerPhotoUrl } from './matchLineups.js';

const POSITION_LABELS = {
  G: 'Portero',
  GK: 'Portero',
  D: 'Defensor',
  M: 'Mediocampista',
  F: 'Delantero',
  Goalkeeper: 'Portero',
  Defender: 'Defensor',
  Midfielder: 'Mediocampista',
  Attacker: 'Delantero',
  Forward: 'Delantero',
};

/**
 * @param {string|null|undefined} position
 */
export function translatePlayerPosition(position) {
  if (!position) return 'N/D';
  const key = String(position).trim();
  return POSITION_LABELS[key] || key;
}

/**
 * @param {*} value
 */
function toNumberOrNull(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Object|Array|null} payload
 */
export function extractFixturePlayerResponse(payload) {
  if (!payload) return null;
  if (payload.response && typeof payload.response === 'object') {
    return payload.response;
  }
  if (payload.player) return payload;
  return null;
}

/**
 * @param {Object|null} entry — { player, statistics, team }
 * @param {Object|null} [lineupPlayer]
 */
export function normalizeFixturePlayerStats(entry, lineupPlayer = null) {
  if (!entry?.player) {
    return {
      player: lineupPlayer
        ? {
            id: lineupPlayer.id,
            name: lineupPlayer.name,
            photo: resolvePlayerPhotoUrl(lineupPlayer),
            number: lineupPlayer.number,
            position: lineupPlayer.position,
            age: null,
            nationality: null,
          }
        : null,
      team: null,
      matchStats: null,
      hasStats: false,
    };
  }

  const stats = Array.isArray(entry.statistics)
    ? entry.statistics[0] || {}
    : entry.statistics || {};

  const games = stats.games || {};
  const goals = stats.goals || {};
  const shots = stats.shots || {};
  const passes = stats.passes || {};
  const duels = stats.duels || {};
  const fouls = stats.fouls || {};
  const cards = stats.cards || {};

  const matchStats = {
    minutes: toNumberOrNull(games.minutes),
    rating: games.rating != null ? String(games.rating) : null,
    goals: toNumberOrNull(goals.total),
    assists: toNumberOrNull(goals.assists),
    xg: toNumberOrNull(goals.expected ?? shots.expected ?? stats.expected_goals),
    xa: toNumberOrNull(passes.expected ?? stats.expected_assists),
    shotsTotal: toNumberOrNull(shots.total),
    shotsOn: toNumberOrNull(shots.on),
    keyPasses: toNumberOrNull(passes.key),
    duelsWon: toNumberOrNull(duels.won),
    foulsCommitted: toNumberOrNull(fouls.committed),
    foulsDrawn: toNumberOrNull(fouls.drawn),
    yellowCards: toNumberOrNull(cards.yellow),
    redCards: toNumberOrNull(cards.red),
  };

  const hasStats = Boolean(
    entry.statistics && (Array.isArray(entry.statistics) ? entry.statistics.length > 0 : true)
  );

  const player = entry.player;

  return {
    player: {
      id: player.id,
      name: player.name || lineupPlayer?.name || 'Jugador',
      photo: resolvePlayerPhotoUrl(player) || resolvePlayerPhotoUrl(lineupPlayer),
      number: games.number ?? lineupPlayer?.number ?? '–',
      position: games.position ?? lineupPlayer?.position ?? null,
      age: player.age ?? null,
      nationality: player.nationality ?? null,
    },
    team: entry.team || null,
    matchStats,
    hasStats,
  };
}

/**
 * @param {Object|null} entry
 * @param {Object|null} lineupPlayer
 */
export function buildPlayerStatsViewModel(entry, lineupPlayer = null) {
  const normalized = normalizeFixturePlayerStats(entry, lineupPlayer);
  const { player, matchStats, hasStats, team } = normalized;

  const formatVal = (v) => (v == null ? '—' : String(v));

  const shotsLabel =
    matchStats.shotsTotal != null
      ? `${matchStats.shotsTotal}${matchStats.shotsOn != null ? ` / ${matchStats.shotsOn} a puerta` : ''}`
      : '—';

  const statCards = hasStats
    ? [
        { key: 'goals', label: 'Goles', value: formatVal(matchStats.goals) },
        { key: 'assists', label: 'Asistencias', value: formatVal(matchStats.assists) },
        { key: 'xg', label: 'xG', value: formatVal(matchStats.xg) },
        { key: 'xa', label: 'xA', value: formatVal(matchStats.xa) },
        { key: 'shots', label: 'Tiros / a puerta', value: shotsLabel },
        { key: 'keyPasses', label: 'Pases clave', value: formatVal(matchStats.keyPasses) },
        { key: 'duelsWon', label: 'Duelos ganados', value: formatVal(matchStats.duelsWon) },
        {
          key: 'fouls',
          label: 'Faltas',
          value: `${matchStats.foulsCommitted ?? 0} / ${matchStats.foulsDrawn ?? 0}`,
          hint: 'Cometidas / recibidas',
        },
        {
          key: 'cards',
          label: 'Tarjetas',
          value: `🟨 ${matchStats.yellowCards ?? 0}  🟥 ${matchStats.redCards ?? 0}`,
        },
      ]
    : [];

  return {
    player,
    team,
    matchStats,
    hasStats,
    statCards,
  };
}
