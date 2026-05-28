/**
 * Utilidades para normalizar y posicionar alineaciones (API-Football v3).
 */

const DEFAULT_COLORS = {
  primary: '#1a5f2a',
  number: '#ffffff',
  border: '#0d3d18',
  gkPrimary: '#f59e0b',
};

const API_SPORTS_PLAYER_PHOTO = (id) =>
  `https://media.api-sports.io/football/players/${id}.png`;

/**
 * Extrae el array de alineaciones de la respuesta del backend.
 * @param {Object|Array|null} payload
 * @returns {Array}
 */
export function extractLineupsResponse(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.response)) return payload.response;
  if (Array.isArray(payload.lineups)) return payload.lineups;
  return [];
}

/**
 * @param {number|string|null} a
 * @param {number|string|null} b
 */
export function isSameTeamId(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * Normaliza color hex de la API (con o sin #).
 * @param {string|null|undefined} color
 * @param {string} fallback
 */
export function normalizeJerseyColor(color, fallback) {
  if (!color) return fallback;
  const value = String(color).trim();
  if (!value) return fallback;
  if (value.startsWith('#')) return value;
  if (/^[0-9a-fA-F]{3,8}$/.test(value)) return `#${value}`;
  return value;
}

/**
 * Foto del jugador: API directa o CDN API-Sports por id.
 * @param {{ id?: number|string, photo?: string|null }} player
 */
export function resolvePlayerPhotoUrl(player) {
  if (player?.photo) return player.photo;
  const id = player?.id;
  if (id != null && Number(id) > 0) {
    return API_SPORTS_PLAYER_PHOTO(id);
  }
  return null;
}

/**
 * Nombre corto para la cancha (apellido / última palabra).
 * @param {string} name
 */
export function formatPlayerShortName(name) {
  if (!name) return 'Jugador';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'Jugador';
  return parts[parts.length - 1];
}

/**
 * Parsea formación "4-3-3" → [4, 3, 3]
 * @param {string} formation
 * @returns {number[]}
 */
export function parseFormation(formation) {
  if (!formation || typeof formation !== 'string') return [4, 4, 2];
  const parts = formation
    .split('-')
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n) && n > 0);
  return parts.length > 0 ? parts : [4, 4, 2];
}

/**
 * Máxima columna por fila según grid real del XI (API-Football).
 * @param {Array<{ player?: { grid?: string }, grid?: string }>} startXI
 * @returns {Record<number, number>}
 */
export function getRowColumnCounts(startXI = []) {
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
 * Agrupa entradas del XI por fila de grid.
 * @param {Array} startXI
 * @returns {Map<number, Array<{ col: number, entry: Object }>>}
 */
export function groupStartXIByGridRow(startXI = []) {
  const byRow = new Map();
  startXI.forEach((entry) => {
    const grid = entry?.player?.grid ?? entry?.grid;
    if (!grid || !String(grid).includes(':')) return;
    const [row, col] = String(grid).split(':').map((v) => parseInt(v, 10));
    if (!row || !col) return;
    if (!byRow.has(row)) byRow.set(row, []);
    byRow.get(row).push({ col, entry });
  });
  byRow.forEach((items) => {
    items.sort((a, b) => a.col - b.col);
  });
  return byRow;
}

/**
 * Calcula Y según fila y formación.
 * @param {number} row
 * @param {string} formation
 */
export function rowToPitchY(row, formation) {
  const lines = parseFormation(formation);
  const totalRows = lines.length + 1;
  const rowIndex = Math.max(0, row - 1);
  const rowRatio = totalRows <= 1 ? 0 : rowIndex / (totalRows - 1);
  return 92 - rowRatio * 78;
}

/**
 * Posiciona titulares usando grid; reparte en fila por índice si hay huecos en columnas.
 * @param {Array} startXI
 * @param {string} formation
 * @returns {Map<string|number, { pitchX: number, pitchY: number }>}
 */
export function assignPositionsFromGrid(startXI, formation) {
  const positions = new Map();
  const byRow = groupStartXIByGridRow(startXI);

  byRow.forEach((items, row) => {
    const count = items.length;
    const pitchY = rowToPitchY(row, formation);

    items.forEach((item, index) => {
      const pitchX = ((index + 0.5) / Math.max(count, 1)) * 88 + 6;
      const p = item.entry?.player || item.entry || {};
      const id = p.id ?? `${p.name}-${p.number}`;
      positions.set(id, {
        pitchX: Math.min(94, Math.max(6, pitchX)),
        pitchY: Math.min(94, Math.max(6, pitchY)),
      });
    });
  });

  return positions;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Separa nodos que quedaron demasiado cerca (evita solapamiento visual).
 * @param {Array<{ id: string|number, pitchX: number, pitchY: number }>} players
 * @param {number} minDistance
 */
export function spreadOverlappingPlayers(players, minDistance = 7) {
  const result = players.map((p) => ({ ...p }));

  for (let pass = 0; pass < 16; pass += 1) {
    let adjusted = false;

    for (let i = 0; i < result.length; i += 1) {
      for (let j = i + 1; j < result.length; j += 1) {
        const dx = result[j].pitchX - result[i].pitchX;
        const dy = result[j].pitchY - result[i].pitchY;
        const dist = Math.hypot(dx, dy);

        if (dist >= minDistance || dist < 0.01) continue;

        const push = (minDistance - dist) / 2;
        const nx = dist < 0.01 ? 1 : dx / dist;
        const ny = dist < 0.01 ? 0 : dy / dist;

        result[i].pitchX = clamp(result[i].pitchX - nx * push, 6, 94);
        result[i].pitchY = clamp(result[i].pitchY - ny * push, 6, 94);
        result[j].pitchX = clamp(result[j].pitchX + nx * push, 6, 94);
        result[j].pitchY = clamp(result[j].pitchY + ny * push, 6, 94);
        adjusted = true;
      }
    }

    if (!adjusted) break;
  }

  return result;
}

/**
 * Convierte grid API ("fila:col") a coordenadas % en cancha individual del equipo.
 * Portero (fila 1) abajo; ataque hacia arriba (vista profesional por equipo).
 *
 * @param {string|null} grid
 * @param {string} formation
 * @param {Record<number, number>} rowColumnCounts
 * @returns {{ pitchX: number, pitchY: number }|null}
 */
export function gridToPitchPosition(grid, formation, rowColumnCounts = {}) {
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
  const rowRatio = totalRows <= 1 ? 0 : rowIndex / (totalRows - 1);
  const pitchY = 92 - rowRatio * 78;

  return {
    pitchX: Math.min(94, Math.max(6, pitchX)),
    pitchY: Math.min(94, Math.max(6, pitchY)),
  };
}

/**
 * Posiciones de respaldo cuando no hay grid en la API.
 * @param {import('./matchLineups').LineupPlayer[]} players
 * @param {string} formation
 */
export function assignFallbackPitchPositions(players, formation) {
  const lines = parseFormation(formation);
  const buckets = { G: [], D: [], M: [], F: [] };

  players.forEach((p) => {
    const pos = (p.position || 'M').toUpperCase();
    if (pos === 'G' || pos === 'GK') buckets.G.push(p);
    else if (pos === 'D' || pos === 'DF') buckets.D.push(p);
    else if (pos === 'F' || pos === 'FW' || pos === 'A') buckets.F.push(p);
    else buckets.M.push(p);
  });

  const lineOrder = [
    { key: 'G', count: 1 },
    { key: 'D', count: lines[0] || 4 },
    { key: 'M', count: (lines[1] ?? lines[0]) || 4 },
    { key: 'F', count: (lines[2] ?? lines[lines.length - 1]) || 2 },
  ];

  const result = [];
  let rowIndex = 0;
  const totalRows = lineOrder.length;

  lineOrder.forEach(({ key, count }) => {
    const group = buckets[key].slice(0, count);
    group.forEach((player, colIdx) => {
      const pitchX = ((colIdx + 0.5) / Math.max(group.length, 1)) * 88 + 6;
      const rowRatio = rowIndex / Math.max(totalRows - 1, 1);
      const pitchY = 92 - rowRatio * 78;
      result.push({ ...player, pitchX, pitchY });
    });
    rowIndex += 1;
  });

  const placed = new Set(result.map((p) => p.id));
  players
    .filter((p) => !placed.has(p.id))
    .forEach((p, i) => {
      result.push({
        ...p,
        pitchX: 20 + (i % 5) * 15,
        pitchY: 70,
      });
    });

  return result;
}

/**
 * @param {Object} entry
 * @param {string} formation
 * @param {Record<number, number>} rowColumnCounts
 */
export function normalizePlayerEntry(entry, formation, rowColumnCounts = {}) {
  const p = entry?.player || entry || {};
  const grid = p.grid ?? null;
  const position = (p.pos || p.position || 'M').toString();
  const coords = grid ? gridToPitchPosition(grid, formation, rowColumnCounts) : null;
  const photo = resolvePlayerPhotoUrl(p);
  const name = p.name || 'Jugador';

  const base = {
    id: p.id ?? `${name}-${p.number}`,
    name,
    shortName: formatPlayerShortName(name),
    number: p.number ?? '–',
    position,
    photo,
    grid,
    pitchX: 50,
    pitchY: 50,
  };

  if (coords) {
    return { ...base, ...coords };
  }

  return base;
}

/**
 * @param {Object} apiLineup
 * @param {{ id?: number, name?: string, logo?: string }} teamMeta
 */
export function normalizeLineupFromApi(apiLineup, teamMeta = {}) {
  const formation = apiLineup?.formation || '4-4-2';
  const startXI = apiLineup?.startXI || [];
  const rowColumnCounts = getRowColumnCounts(startXI);
  const gridPositions = assignPositionsFromGrid(startXI, formation);

  const playerColors = apiLineup?.team?.colors?.player || {};
  const gkColors = apiLineup?.team?.colors?.goalkeeper || {};

  const colors = {
    primary: normalizeJerseyColor(playerColors.primary, DEFAULT_COLORS.primary),
    number: normalizeJerseyColor(playerColors.number, DEFAULT_COLORS.number),
    border: normalizeJerseyColor(playerColors.border, DEFAULT_COLORS.border),
    gkPrimary: normalizeJerseyColor(gkColors.primary, DEFAULT_COLORS.gkPrimary),
  };

  let starters = startXI.map((entry) => {
    const player = normalizePlayerEntry(entry, formation, rowColumnCounts);
    const fromGrid = gridPositions.get(player.id);
    if (fromGrid) {
      return { ...player, ...fromGrid };
    }
    return player;
  });

  const missingCoords = starters.filter((p) => {
    if (!p.grid) return true;
    return !gridPositions.has(p.id);
  });

  if (missingCoords.length === starters.length) {
    starters = assignFallbackPitchPositions(starters, formation);
  } else if (missingCoords.length > 0) {
    const positioned = assignFallbackPitchPositions(missingCoords, formation);
    const positionedById = new Map(positioned.map((p) => [p.id, p]));
    starters = starters.map((p) => positionedById.get(p.id) || p);
  }

  starters = spreadOverlappingPlayers(starters);

  const substitutes = (apiLineup?.substitutes || []).map((entry) => {
    const p = entry?.player || entry || {};
    const name = p.name || 'Jugador';
    return {
      id: p.id ?? `${name}-sub`,
      name,
      shortName: formatPlayerShortName(name),
      number: p.number ?? '–',
      position: (p.pos || p.position || 'M').toString(),
      photo: resolvePlayerPhotoUrl(p),
      grid: null,
      pitchX: 0,
      pitchY: 0,
    };
  });

  return {
    teamId: apiLineup?.team?.id ?? teamMeta.id,
    name: apiLineup?.team?.name ?? teamMeta.name ?? 'Equipo',
    logo: apiLineup?.team?.logo ?? teamMeta.logo ?? null,
    formation,
    coach: {
      id: apiLineup?.coach?.id,
      name: apiLineup?.coach?.name || null,
      photo: apiLineup?.coach?.photo || null,
    },
    colors,
    starters,
    substitutes,
  };
}

/**
 * Empareja alineaciones API con local / visitante del partido.
 * @param {Array} rawLineups
 * @param {{ id?: number|string }} homeMeta
 * @param {{ id?: number|string }} awayMeta
 */
export function pairLineupsWithFixture(rawLineups, homeMeta, awayMeta) {
  const list = rawLineups || [];
  if (list.length === 0) {
    return { homeRaw: null, awayRaw: null };
  }

  let homeRaw = list.find((l) => isSameTeamId(l.team?.id, homeMeta.id));
  let awayRaw = list.find((l) => isSameTeamId(l.team?.id, awayMeta.id));

  if (!homeRaw && !awayRaw && list.length >= 2) {
    homeRaw = list[0];
    awayRaw = list[1];
  } else if (!homeRaw) {
    homeRaw = list.find((l) => !isSameTeamId(l.team?.id, awayMeta.id)) || list[0];
  }
  if (!awayRaw) {
    awayRaw = list.find((l) => !isSameTeamId(l.team?.id, homeRaw?.team?.id)) || null;
  }

  return { homeRaw, awayRaw };
}

/**
 * Datos de ejemplo para desarrollo UI (solo con useMock explícito).
 */
export function getMockMatchLineups() {
  const buildTeam = (name, formation, primary) => {
    const fakeStarters = [];
    let id = 1;
    const rowColumnCounts = {};

    fakeStarters.push({
      id: id++,
      name: 'Portero',
      shortName: 'Portero',
      number: 1,
      position: 'G',
      photo: null,
      grid: '1:1',
      ...gridToPitchPosition('1:1', formation, { 1: 1 }),
    });
    rowColumnCounts[1] = 1;

    const lines = parseFormation(formation);
    let row = 2;
    lines.forEach((count) => {
      rowColumnCounts[row] = count;
      for (let c = 1; c <= count; c += 1) {
        fakeStarters.push({
          id: id++,
          name: `Jugador ${id}`,
          shortName: `Jugador ${id}`,
          number: id,
          position: row === 2 ? 'D' : row === lines.length + 1 ? 'F' : 'M',
          photo: null,
          grid: `${row}:${c}`,
          ...gridToPitchPosition(`${row}:${c}`, formation, rowColumnCounts),
        });
      }
      row += 1;
    });

    return {
      teamId: name,
      name,
      logo: null,
      formation,
      coach: { name: 'Entrenador', photo: null },
      colors: {
        primary,
        number: '#fff',
        border: '#000',
        gkPrimary: '#f59e0b',
      },
      starters: fakeStarters,
      substitutes: [
        { id: 90, name: 'Suplente 1', shortName: 'Suplente 1', number: 12, position: 'M', photo: null, grid: null, pitchX: 0, pitchY: 0 },
        { id: 91, name: 'Suplente 2', shortName: 'Suplente 2', number: 13, position: 'F', photo: null, grid: null, pitchX: 0, pitchY: 0 },
      ],
    };
  };

  return {
    home: buildTeam('Equipo Local', '4-3-3', '#1565c0'),
    away: buildTeam('Equipo Visitante', '4-4-2', '#c62828'),
  };
}
