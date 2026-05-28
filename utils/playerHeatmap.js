/**
 * Construcción de mapa de calor por jugador a partir de eventos y alineación (API-Football).
 * Si los eventos incluyen pos.x/pos.y se usan; si no, se infieren zonas a partir del grid y el tipo de acción.
 */

const MAX_POINTS = 300;

const EVENT_WEIGHTS = {
  goal: 3,
  goal_penalty: 3,
  goal_own: 2.5,
  penalty_missed: 2,
  card_yellow: 1.2,
  card_red: 1.2,
  card_second_yellow: 1.2,
  injury: 1,
  var: 1.5,
  touch: 1,
};

/**
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {string} formation
 */
function parseFormation(formation) {
  if (!formation || typeof formation !== 'string') return [4, 4, 2];
  const parts = formation
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  return parts.length > 0 ? parts : [4, 4, 2];
}

/**
 * @param {number} row
 * @param {string} formation
 */
function rowToPitchY(row, formation) {
  const lines = parseFormation(formation);
  const totalRows = lines.length + 1;
  const rowIndex = Math.max(0, row - 1);
  const rowRatio = totalRows <= 1 ? 0 : rowIndex / (totalRows - 1);
  return 92 - rowRatio * 78;
}

/**
 * Grid API ("fila:col") → coordenadas 0–100 (ataque hacia arriba, y menor).
 * @param {string|null} grid
 * @param {string} formation
 * @param {Record<number, number>} [rowColumnCounts]
 */
function gridToPitchPosition(grid, formation, rowColumnCounts = {}) {
  if (!grid || !String(grid).includes(':')) return null;

  const [row, col] = String(grid).split(':').map((v) => parseInt(v, 10));
  if (!row || !col) return null;

  const lines = parseFormation(formation);
  const totalRows = lines.length + 1;
  const rowIndex = Math.max(0, row - 1);

  let playersInRow = 1;
  if (row === 1) {
    playersInRow = 1;
  } else if (rowColumnCounts[row]) {
    playersInRow = rowColumnCounts[row];
  } else if (rowIndex > 0) {
    playersInRow = lines[rowIndex - 1] || 1;
  }

  const pitchX = ((col - 0.5) / Math.max(playersInRow, 1)) * 88 + 6;
  const pitchY = rowToPitchY(row, formation);

  return {
    x: clamp(pitchX, 2, 98),
    y: clamp(pitchY, 2, 98),
  };
}

/**
 * @param {Object} event
 */
function extractRawEventCoords(event) {
  const candidates = [
    event?.position,
    event?.pos,
    event?.coordinates,
    event?.location,
  ];

  for (const pos of candidates) {
    if (!pos || typeof pos !== 'object') continue;
    const x = pos.x ?? pos.X ?? pos.lng ?? pos.lon;
    const y = pos.y ?? pos.Y ?? pos.lat;
    if (x == null || y == null) continue;

    let nx = Number(x);
    let ny = Number(y);
    if (!Number.isFinite(nx) || !Number.isFinite(ny)) continue;

    if (nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1) {
      nx *= 100;
      ny *= 100;
    } else if (nx > 100 || ny > 100) {
      nx = (nx / 120) * 100;
      ny = (ny / 80) * 100;
    }

    return {
      x: clamp(nx, 0, 100),
      y: clamp(ny, 0, 100),
    };
  }

  return null;
}

/**
 * @param {string} type
 * @param {string} detail
 */
function classifyEvent(type, detail) {
  const t = String(type || '').toLowerCase();
  const d = String(detail || '').toLowerCase();

  if (t === 'goal') {
    if (d.includes('own goal')) return 'goal_own';
    if (d.includes('missed penalty')) return 'penalty_missed';
    if (d.includes('penalty')) return 'goal_penalty';
    return 'goal';
  }
  if (t === 'card') {
    if (d.includes('second yellow')) return 'card_second_yellow';
    if (d.includes('red')) return 'card_red';
    return 'card_yellow';
  }
  if (t === 'var') return 'var';
  if (t === 'injury') return 'injury';
  return 'touch';
}

/**
 * @param {string} kind
 * @param {number} baseX
 * @param {number} baseY
 * @param {number} minute
 * @param {number} seed
 */
function inferCoordsFromEventKind(kind, baseX, baseY, minute = 0, seed = 0) {
  const progress = clamp(minute / 90, 0, 1) * 6;
  let dx = ((seed % 11) - 5) * 1.2;
  let dy = -progress + ((Math.floor(seed / 11) % 11) - 5) * 1.2;
  let weight = EVENT_WEIGHTS[kind] || 1;

  switch (kind) {
    case 'goal':
    case 'goal_penalty':
      dy -= 14;
      dx *= 0.6;
      break;
    case 'goal_own':
      dy += 12;
      break;
    case 'penalty_missed':
      dy -= 16;
      weight = 2;
      break;
    case 'card_yellow':
    case 'card_red':
    case 'card_second_yellow':
      dx *= 0.5;
      dy *= 0.5;
      break;
    case 'var':
      dy -= 8;
      break;
    case 'injury':
      dx *= 0.4;
      dy *= 0.4;
      break;
    default:
      break;
  }

  return {
    x: clamp(baseX + dx, 2, 98),
    y: clamp(baseY + dy, 2, 98),
    weight,
  };
}

/**
 * @param {number} baseX
 * @param {number} baseY
 * @param {string} position
 * @param {number} count
 * @param {number} seedBase
 */
function scatterActivityPoints(baseX, baseY, position, count, seedBase = 0) {
  const pos = String(position || 'M').toUpperCase();
  const isGk = pos === 'G' || pos === 'GK';
  const spreadX = isGk ? 12 : pos.startsWith('D') ? 18 : pos.startsWith('F') ? 22 : 20;
  const spreadY = isGk ? 8 : pos.startsWith('D') ? 14 : pos.startsWith('F') ? 18 : 16;

  const points = [];
  for (let i = 0; i < count; i += 1) {
    const seed = seedBase + i * 17;
    const angle = (seed % 360) * (Math.PI / 180);
    const radius = ((seed % 100) / 100) * spreadX * 0.45;
    const x = baseX + Math.cos(angle) * radius;
    const y = baseY + Math.sin(angle) * spreadY * 0.35 - (i % 3);
    points.push({
      x: clamp(x, 2, 98),
      y: clamp(y, 2, 98),
      weight: 1,
    });
  }
  return points;
}

/**
 * @param {Array<{x:number,y:number,weight?:number}>} points
 * @param {number} max
 */
function sampleHeatmapPoints(points, max = MAX_POINTS) {
  if (points.length <= max) return points;

  const step = points.length / max;
  const sampled = [];
  for (let i = 0; i < max; i += 1) {
    sampled.push(points[Math.floor(i * step)]);
  }
  return sampled;
}

/**
 * @param {Array} startXI
 */
function getRowColumnCounts(startXI = []) {
  const rowMaxCol = {};
  startXI.forEach((entry) => {
    const grid = entry?.player?.grid ?? entry?.grid;
    if (!grid || !String(grid).includes(':')) return;
    const [row, col] = String(grid).split(':').map((v) => parseInt(v, 10));
    if (!row || !col) return;
    rowMaxCol[row] = Math.max(rowMaxCol[row] || 0, col);
  });
  return rowMaxCol;
}

/**
 * @param {Array} lineupsResponse
 * @param {string|number} playerId
 */
function findPlayerLineupContext(lineupsResponse, playerId) {
  const teams = Array.isArray(lineupsResponse) ? lineupsResponse : [];
  const id = String(playerId);

  for (const teamBlock of teams) {
    const formation = teamBlock?.formation || '4-4-2';
    const startXI = teamBlock?.startXI || [];
    const substitutes = teamBlock?.substitutes || [];
    const rowColumnCounts = getRowColumnCounts(startXI);

    const inXI = startXI.find((e) => String(e?.player?.id) === id);
    if (inXI?.player?.grid) {
      const pos = gridToPitchPosition(inXI.player.grid, formation, rowColumnCounts);
      if (pos) {
        return {
          formation,
          position: inXI.player.pos || inXI.player.position || 'M',
          base: pos,
          teamId: teamBlock?.team?.id,
        };
      }
    }

    const sub = substitutes.find((e) => String(e?.player?.id) === id);
    if (sub?.player) {
      const posChar = (sub.player.pos || sub.player.position || 'M').toUpperCase();
      const fallbackY = posChar === 'G' || posChar === 'GK' ? 88 : posChar.startsWith('D') ? 72 : posChar.startsWith('F') ? 28 : 50;
      return {
        formation,
        position: posChar,
        base: { x: 50, y: fallbackY },
        teamId: teamBlock?.team?.id,
      };
    }
  }

  return null;
}

/**
 * @param {Array} events
 * @param {string|number} playerId
 * @param {{ base: {x:number,y:number} }} lineupContext
 */
function pointsFromEvents(events, playerId, lineupContext) {
  const id = String(playerId);
  const base = lineupContext?.base || { x: 50, y: 50 };
  const points = [];
  let seed = 0;

  (events || []).forEach((event) => {
    const evPlayerId = event?.player?.id;
    if (evPlayerId == null || String(evPlayerId) !== id) return;

    const raw = extractRawEventCoords(event);
    const minute = Number(event?.time?.elapsed ?? 0);
    const kind = classifyEvent(event?.type, event?.detail);

    if (raw) {
      points.push({
        x: raw.x,
        y: raw.y,
        weight: EVENT_WEIGHTS[kind] || 1,
      });
    } else {
      points.push(inferCoordsFromEventKind(kind, base.x, base.y, minute, seed));
    }
    seed += 1;
  });

  return points;
}

/**
 * @param {Object|null} playerEntry — entrada fixtures/players
 * @param {{ base: {x:number,y:number}, position: string }} lineupContext
 */
function pointsFromPlayerStats(playerEntry, lineupContext) {
  if (!playerEntry || !lineupContext?.base) return [];

  const stats = Array.isArray(playerEntry.statistics)
    ? playerEntry.statistics[0] || {}
    : playerEntry.statistics || {};

  const games = stats.games || {};
  const minutes = Number(games.minutes ?? 0);
  if (minutes <= 0) return [];

  const passes = Number(stats.passes?.total ?? 0);
  const shots = Number(stats.shots?.total ?? 0);
  const dribbles = Number(stats.dribbles?.attempts ?? stats.dribbles?.success ?? 0);
  const duels = Number(stats.duels?.total ?? stats.duels?.won ?? 0);
  const tackles = Number(stats.tackles?.total ?? 0);

  const activityScore = passes + shots * 2 + dribbles + duels * 0.5 + tackles;
  const pointCount = clamp(Math.floor(activityScore / 4), 8, 120);

  return scatterActivityPoints(
    lineupContext.base.x,
    lineupContext.base.y,
    lineupContext.position || games.position,
    pointCount,
    Number(playerEntry.player?.id) || 1
  );
}

/**
 * @param {Object} params
 * @param {Array} params.events
 * @param {Array} params.lineups
 * @param {Object|null} params.playerEntry
 * @param {string|number} params.playerId
 */
function buildPlayerHeatmapPoints({ events = [], lineups = [], playerEntry = null, playerId }) {
  const lineupContext = findPlayerLineupContext(lineups, playerId);

  if (!lineupContext) {
    return { points: [], source: 'none' };
  }

  const fromEvents = pointsFromEvents(events, playerId, lineupContext);
  const fromStats = pointsFromPlayerStats(playerEntry, lineupContext);

  let merged = [...fromEvents, ...fromStats];

  if (merged.length === 0 && lineupContext.base) {
    merged = scatterActivityPoints(
      lineupContext.base.x,
      lineupContext.base.y,
      lineupContext.position,
      24,
      Number(playerId) || 7
    );
  }

  const points = sampleHeatmapPoints(merged, MAX_POINTS);

  const hasRawCoords = (events || []).some((ev) => {
    if (String(ev?.player?.id) !== String(playerId)) return false;
    return Boolean(extractRawEventCoords(ev));
  });

  const source = hasRawCoords
    ? 'coordinates'
    : fromEvents.length > 0
      ? 'events_inferred'
      : 'activity_inferred';

  return {
    points,
    source,
    meta: {
      base: lineupContext.base,
      formation: lineupContext.formation,
    },
  };
}

module.exports = {
  MAX_POINTS,
  buildPlayerHeatmapPoints,
  extractRawEventCoords,
  gridToPitchPosition,
  sampleHeatmapPoints,
};
