/**
 * Vista táctica: posiciones promedio y red de pases inferida (API-Football).
 */

const { buildPlayerHeatmapPoints } = require('./playerHeatmap');

const MIN_PLAYERS = 6;
const MAX_LINK_DISTANCE = 42;
const MIN_LINK_COUNT = 1;
const MAX_LINK_COUNT_DISPLAY = 6;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isSameTeamId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

function normalizeColor(color, fallback) {
  if (!color) return fallback;
  const value = String(color).trim();
  if (!value) return fallback;
  if (value.startsWith('#')) return value;
  if (/^[0-9a-fA-F]{3,8}$/.test(value)) return `#${value}`;
  return value;
}

/**
 * @param {Array<{x:number,y:number}>} points
 */
function averagePoints(points) {
  if (!points?.length) return null;
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  return {
    x: clamp(sum.x / points.length, 2, 98),
    y: clamp(sum.y / points.length, 2, 98),
  };
}

/**
 * @param {Object} stats
 */
function extractPlayerStatsBundle(stats) {
  const s = stats || {};
  return {
    minutes: Number(s.games?.minutes ?? 0),
    passes: Number(s.passes?.total ?? 0),
    keyPasses: Number(s.passes?.key ?? 0),
    position: s.games?.position || 'M',
  };
}

/**
 * @param {Array} lineups
 * @param {string|number} teamId
 */
function findTeamLineup(lineups, teamId) {
  return (lineups || []).find((block) => isSameTeamId(block?.team?.id, teamId)) || null;
}

/**
 * @param {Array} teamsPlayers — response fixtures/players
 * @param {string|number} teamId
 */
function getTeamPlayerEntries(teamsPlayers, teamId) {
  const block = (teamsPlayers || []).find((t) => isSameTeamId(t?.team?.id, teamId));
  return block?.players || [];
}

/**
 * @param {Array} events
 * @param {string|number} teamId
 */
function filterTeamEvents(events, teamId) {
  return (events || []).filter((e) => isSameTeamId(e?.team?.id, teamId));
}

/**
 * @param {Map<string, Object>} linkMap
 * @param {string|number} fromId
 * @param {string|number} toId
 * @param {number} delta
 */
function addDirectedLink(linkMap, fromId, toId, delta) {
  if (fromId == null || toId == null) return;
  if (String(fromId) === String(toId)) return;
  const key = `${fromId}->${toId}`;
  const prev = linkMap.get(key) || { fromId, toId, count: 0 };
  prev.count += delta;
  linkMap.set(key, prev);
}

/**
 * @param {Array} players
 * @param {Array} events
 * @param {Map<string, Object>} statsByPlayerId
 */
function buildPassLinks(players, events, statsByPlayerId) {
  const linkMap = new Map();

  events.forEach((event) => {
    const type = String(event?.type || '').toLowerCase();
    const detail = String(event?.detail || '').toLowerCase();
    if (type !== 'goal') return;
    if (detail.includes('own goal')) return;

    const scorerId = event?.player?.id;
    const passerId = event?.assist?.id;
    if (scorerId && passerId) {
      addDirectedLink(linkMap, passerId, scorerId, 4);
    }
  });

  for (let i = 0; i < players.length; i += 1) {
    for (let j = 0; j < players.length; j += 1) {
      if (i === j) continue;

      const a = players[i];
      const b = players[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > MAX_LINK_DISTANCE) continue;

      const statsA = statsByPlayerId.get(String(a.playerId)) || {};
      const statsB = statsByPlayerId.get(String(b.playerId)) || {};
      const proximity = 1 - dist / MAX_LINK_DISTANCE;
      const passFactor = Math.sqrt((statsA.passes || 0) * (statsB.passes || 0)) / 10;
      const keyFactor = ((statsA.keyPasses || 0) + (statsB.keyPasses || 0)) * 0.35;
      const count = Math.max(
        MIN_LINK_COUNT,
        Math.round(proximity * (passFactor + keyFactor))
      );

      if (count > 0) {
        addDirectedLink(linkMap, a.playerId, b.playerId, count);
      }
    }
  }

  return Array.from(linkMap.values())
    .filter((l) => l.count > 0)
    .sort((a, b) => b.count - a.count);
}

/**
 * @param {Array} players
 * @param {number} cols
 * @param {number} rows
 */
function buildZoneIntensity(players, cols = 10, rows = 14) {
  const grid = new Float32Array(cols * rows);

  players.forEach((player) => {
    (player.samples || []).forEach((p) => {
      const gx = clamp(Math.floor((p.x / 100) * cols), 0, cols - 1);
      const gy = clamp(Math.floor((p.y / 100) * rows), 0, rows - 1);
      grid[gy * cols + gx] += 1;
    });
  });

  let max = 0;
  for (let i = 0; i < grid.length; i += 1) {
    if (grid[i] > max) max = grid[i];
  }

  const cells = [];
  for (let gy = 0; gy < rows; gy += 1) {
    for (let gx = 0; gx < cols; gx += 1) {
      const v = grid[gy * cols + gx];
      if (v <= 0) continue;
      cells.push({
        x: ((gx + 0.5) / cols) * 100,
        y: ((gy + 0.5) / rows) * 100,
        intensity: v / (max || 1),
      });
    }
  }

  return cells;
}

/**
 * @param {Object} teamLineup — bloque API lineups
 * @param {Array} teamEvents
 * @param {Array} playerEntries
 * @param {Array} allLineups
 */
function buildTeamTacticalData(teamLineup, teamEvents, playerEntries, allLineups) {
  if (!teamLineup) {
    return { players: [], links: [], zoneIntensity: [], colors: null, hasData: false };
  }

  const teamId = teamLineup.team?.id;
  const playerColors = teamLineup?.team?.colors?.player || {};
  const colors = {
    primary: normalizeColor(playerColors.primary, '#1565c0'),
    secondary: normalizeColor(playerColors.border || playerColors.number, '#0d3d18'),
    number: normalizeColor(playerColors.number, '#ffffff'),
  };

  const squadIds = new Set();
  (teamLineup.startXI || []).forEach((e) => {
    if (e?.player?.id != null) squadIds.add(String(e.player.id));
  });
  (teamLineup.substitutes || []).forEach((e) => {
    if (e?.player?.id != null) squadIds.add(String(e.player.id));
  });

  playerEntries.forEach((entry) => {
    const stats = extractPlayerStatsBundle(
      Array.isArray(entry.statistics) ? entry.statistics[0] : entry.statistics
    );
    if (stats.minutes > 0 && entry?.player?.id != null) {
      squadIds.add(String(entry.player.id));
    }
  });

  const statsByPlayerId = new Map();
  playerEntries.forEach((entry) => {
    const id = entry?.player?.id;
    if (id == null) return;
    const stats = extractPlayerStatsBundle(
      Array.isArray(entry.statistics) ? entry.statistics[0] : entry.statistics
    );
    statsByPlayerId.set(String(id), stats);
  });

  const players = [];

  squadIds.forEach((playerIdStr) => {
    const entry = playerEntries.find((e) => String(e?.player?.id) === playerIdStr);
    const stats = statsByPlayerId.get(playerIdStr);
    if (stats && stats.minutes <= 0 && !teamLineup.startXI?.some((e) => String(e?.player?.id) === playerIdStr)) {
      return;
    }

    const heatmap = buildPlayerHeatmapPoints({
      events: teamEvents,
      lineups: allLineups,
      playerEntry: entry || null,
      playerId: playerIdStr,
    });

    const avg = averagePoints(heatmap.points);
    if (!avg) return;

    const xiEntry = teamLineup.startXI?.find((e) => String(e?.player?.id) === playerIdStr);
    const subEntry = teamLineup.substitutes?.find((e) => String(e?.player?.id) === playerIdStr);
    const p = entry?.player || xiEntry?.player || subEntry?.player || {};

    players.push({
      playerId: p.id ?? playerIdStr,
      name: p.name || 'Jugador',
      number: p.number ?? stats?.number ?? '–',
      position: stats?.position || p.pos || p.position || 'M',
      x: Math.round(avg.x * 10) / 10,
      y: Math.round(avg.y * 10) / 10,
      samples: heatmap.points,
    });
  });

  const links = buildPassLinks(players, teamEvents, statsByPlayerId);
  const zoneIntensity = buildZoneIntensity(players);
  const hasData = players.length >= MIN_PLAYERS;

  return {
    players,
    links,
    zoneIntensity,
    colors,
    hasData,
    teamId,
    teamName: teamLineup.team?.name || null,
  };
}

/**
 * @param {{ lineups: Array, events: Array, playersFixture: Array, homeTeamId?: *, awayTeamId?: * }} params
 */
function buildTacticalViewResponse({
  lineups = [],
  events = [],
  playersFixture = [],
  homeTeamId,
  awayTeamId,
}) {
  const homeLineup = findTeamLineup(lineups, homeTeamId);
  const awayLineup = findTeamLineup(lineups, awayTeamId);

  const resolvedHomeId = homeLineup?.team?.id ?? homeTeamId;
  const resolvedAwayId = awayLineup?.team?.id ?? awayTeamId;

  const home = buildTeamTacticalData(
    homeLineup,
    filterTeamEvents(events, resolvedHomeId),
    getTeamPlayerEntries(playersFixture, resolvedHomeId),
    lineups
  );

  const away = buildTeamTacticalData(
    awayLineup,
    filterTeamEvents(events, resolvedAwayId),
    getTeamPlayerEntries(playersFixture, resolvedAwayId),
    lineups
  );

  return { home, away };
}

/**
 * @param {number} count
 * @param {number} maxCount
 */
function linkStrokeWidth(count, maxCount) {
  if (!maxCount || maxCount <= 0) return 1.2;
  const ratio = count / maxCount;
  return 1 + ratio * (MAX_LINK_COUNT_DISPLAY - 1);
}

module.exports = {
  MIN_PLAYERS,
  buildTacticalViewResponse,
  buildTeamTacticalData,
  linkStrokeWidth,
  averagePoints,
};
