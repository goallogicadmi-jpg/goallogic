/**
 * Utilidades para ordenar y seleccionar enfrentamientos H2H (más recientes primero).
 */

export const MAX_H2H_FIXTURES_VISIBLE = 4;

/**
 * @param {object} fixture - Respuesta API-Football (fixture en raíz)
 * @returns {number}
 */
export function getFixtureTimestamp(fixture) {
  const date = fixture?.fixture?.date;
  if (!date) return 0;
  const ts = Date.parse(date);
  return Number.isNaN(ts) ? 0 : ts;
}

/**
 * Ordena enfrentamientos de más reciente a más antiguo.
 * @param {object[]} fixtures
 * @returns {object[]}
 */
export function sortH2HFixturesByDateDesc(fixtures) {
  if (!Array.isArray(fixtures)) return [];
  return [...fixtures].sort((a, b) => {
    const diff = getFixtureTimestamp(b) - getFixtureTimestamp(a);
    if (diff !== 0) return diff;
    return (b.fixture?.id ?? 0) - (a.fixture?.id ?? 0);
  });
}

/**
 * Devuelve los N enfrentamientos más recientes.
 * @param {object[]} fixtures
 * @param {number} [max]
 */
export function selectRecentH2HFixtures(fixtures, max = MAX_H2H_FIXTURES_VISIBLE) {
  const limit = Math.max(1, max);
  return sortH2HFixturesByDateDesc(fixtures).slice(0, limit);
}

/**
 * @param {object} partido - Fixture API-Football
 */
export function mapH2HFixtureToDetalle(partido) {
  return {
    fecha: partido.fixture?.date ?? null,
    fixtureId: partido.fixture?.id ?? null,
    local: partido.teams?.home?.name ?? 'Local',
    visitante: partido.teams?.away?.name ?? 'Visitante',
    localId: partido.teams?.home?.id ?? null,
    visitanteId: partido.teams?.away?.id ?? null,
    logoLocal: partido.teams?.home?.logo ?? null,
    logoVisitante: partido.teams?.away?.logo ?? null,
    golesLocal: partido.goals?.home ?? null,
    golesVisitante: partido.goals?.away ?? null,
    resultado: partido.fixture?.status?.short ?? null,
    competicion: partido.league?.name ?? null,
    competicionLogo: partido.league?.logo ?? null,
  };
}

/**
 * Estructura H2H para Predicciones: total histórico + últimos N detallados.
 * @param {object[]} rawFixtures
 * @param {number} [max]
 */
export function buildH2HDisplayData(rawFixtures, max = MAX_H2H_FIXTURES_VISIBLE) {
  const all = Array.isArray(rawFixtures) ? rawFixtures : [];
  const recentRaw = selectRecentH2HFixtures(all, max);

  return {
    totalPartidos: all.length,
    partidos: all,
    partidosDetallados: recentRaw.map(mapH2HFixtureToDetalle),
    partidosRecientes: recentRaw,
  };
}
