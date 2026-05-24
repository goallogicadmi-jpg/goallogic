const EMPTY_MARKERS = new Set([
  'n/d',
  'n/a',
  'nd',
  'na',
  '-',
  '—',
  '--',
  's/d',
  'sin datos',
]);

/**
 * Indica si un valor estadístico debe mostrarse (no vacío ni marcador legacy).
 * @param {*} value
 * @returns {boolean}
 */
export function hasStatValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (EMPTY_MARKERS.has(trimmed.toLowerCase())) return false;
    return true;
  }
  return true;
}

/**
 * Formato de visualización alineado con el resto de la plataforma (CompetitionStats, etc.).
 * @param {*} value
 * @returns {string}
 */
export function formatStatDisplay(value) {
  if (!hasStatValue(value)) return '—';
  return String(value);
}

/**
 * Métricas de tabla/clasificación para «Estadísticas de la Temporada».
 * Solo incluye filas con valor real.
 * @param {object} stats - Fila de standings (API-Football)
 * @returns {{ label: string, value: * }[]}
 */
export function buildSeasonStandingStats(stats = {}) {
  const goalsFor = stats?.all?.goals?.for;
  const goalsAgainst = stats?.all?.goals?.against;
  let goalsDiff = stats?.goalsDiff;

  if (
    !hasStatValue(goalsDiff) &&
    hasStatValue(goalsFor) &&
    hasStatValue(goalsAgainst)
  ) {
    goalsDiff = Number(goalsFor) - Number(goalsAgainst);
  }

  const candidates = [
    { label: 'Posición', value: stats?.rank },
    { label: 'Puntos', value: stats?.points },
    { label: 'Partidos Jugados', value: stats?.all?.played },
    { label: 'Ganados', value: stats?.all?.win },
    { label: 'Empatados', value: stats?.all?.draw },
    { label: 'Perdidos', value: stats?.all?.lose },
    { label: 'Goles a Favor', value: goalsFor },
    { label: 'Goles en Contra', value: goalsAgainst },
    { label: 'Diferencia', value: goalsDiff },
  ];

  return candidates.filter((item) => hasStatValue(item.value));
}

/**
 * Indica si la sección «Estadísticas de la Temporada» debe mostrarse.
 * @param {object} stats - Fila de standings
 * @param {{ form?: string }} [options] - Cadena de forma (W/D/L) si viene aparte
 * @returns {boolean}
 */
export function hasSeasonStandingContent(stats = {}, options = {}) {
  if (buildSeasonStandingStats(stats).length > 0) return true;
  const form = options.form ?? stats?.form;
  return typeof form === 'string' && hasStatValue(form);
}
