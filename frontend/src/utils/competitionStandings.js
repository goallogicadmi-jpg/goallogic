import { getZone } from '../logic/leagueClassification';

/**
 * Extrae la tabla principal desde la respuesta de /estadisticas/torneo.
 */
export function getTablaFromTorneoResponse(data) {
  if (!data) return [];

  if (Array.isArray(data.tabla) && data.tabla.length > 0) {
    return [...data.tabla].sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
  }

  if (Array.isArray(data.grupos) && data.grupos.length > 0) {
    const firstGroup = data.grupos[0]?.tabla;
    if (Array.isArray(firstGroup)) {
      return [...firstGroup].sort((a, b) => (a.posicion || 0) - (b.posicion || 0));
    }
  }

  return [];
}

export function getLeaderFromTabla(tabla) {
  if (!tabla?.length) return null;
  return tabla[0];
}

export function getRelegationTeams(tabla, leagueId) {
  if (!tabla?.length) return [];
  const total = tabla.length;
  return tabla.filter((team) => getZone(team.posicion, Number(leagueId), total) === 'relegation');
}

export function formatFormLetter(letra) {
  if (letra === 'W') return 'G';
  if (letra === 'D') return 'E';
  if (letra === 'L') return 'P';
  return letra;
}

export function getFormBadgeClass(letra) {
  if (letra === 'W' || letra === 'G') return 'win';
  if (letra === 'L' || letra === 'P') return 'loss';
  if (letra === 'D' || letra === 'E') return 'draw';
  return '';
}

export function buildTendenciasSummary(tendencias = []) {
  if (!tendencias.length) return null;
  const wins = tendencias.filter((t) => t.resultado === 'Victoria').length;
  const draws = tendencias.filter((t) => t.resultado === 'Empate').length;
  const losses = tendencias.filter((t) => t.resultado === 'Derrota').length;
  return { wins, draws, losses, total: tendencias.length };
}
