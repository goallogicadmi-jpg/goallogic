const LIGA_BETPLAY_LEAGUE_ID = 239;

/** Primera temporada con playoffs de eliminación directa (cuartos → final) en la API. */
const FIRST_DIRECT_KNOCKOUT_SEASON = 2026;

function isLigaBetPlay(leagueId) {
  return Number(leagueId) === LIGA_BETPLAY_LEAGUE_ID;
}

function usesDirectKnockoutFormat(season) {
  const year = Number(season);
  return Number.isFinite(year) && year >= FIRST_DIRECT_KNOCKOUT_SEASON;
}

function isCuadrangularGroup(groupName, teamCount) {
  const name = String(groupName || "").trim();
  const size = Number(teamCount) || 0;
  if (size > 0 && size <= 6) {
    if (/^group\s+[a-z]$/i.test(name)) return true;
    if (/grupo\s+[a-z]$/i.test(name)) return true;
    if (/,\s*group\s+[a-z]$/i.test(name)) return true;
  }
  return false;
}

function isMainLeagueTableGroup(groupName, teamCount) {
  const name = String(groupName || "").toLowerCase();
  const size = Number(teamCount) || 0;
  if (isCuadrangularGroup(groupName, teamCount)) return false;
  if (size >= 10) return true;
  return /apertura|clausura|primera\s*a|primera\s*division|primera\s*dimayor/.test(name);
}

/**
 * Filtra y ordena grupos de standings para Liga BetPlay según la temporada.
 */
function filterLigaBetPlayGrupos(grupos, season) {
  if (!Array.isArray(grupos) || grupos.length === 0) {
    return [];
  }

  let filtered = grupos;

  if (usesDirectKnockoutFormat(season)) {
    filtered = grupos.filter((grupo) => {
      const size = Array.isArray(grupo.tabla) ? grupo.tabla.length : 0;
      return isMainLeagueTableGroup(grupo.groupName, size);
    });
  }

  const leagueGroups = [];
  const cuadrangularGroups = [];
  const otherGroups = [];

  filtered.forEach((grupo) => {
    const size = Array.isArray(grupo.tabla) ? grupo.tabla.length : 0;
    if (isCuadrangularGroup(grupo.groupName, size)) {
      cuadrangularGroups.push(grupo);
    } else if (isMainLeagueTableGroup(grupo.groupName, size)) {
      leagueGroups.push(grupo);
    } else {
      otherGroups.push(grupo);
    }
  });

  return [...leagueGroups, ...otherGroups, ...cuadrangularGroups];
}

function applyLigaBetPlayStandingsResponse(respuesta, leagueId, requestedSeason) {
  if (!isLigaBetPlay(leagueId) || !respuesta) {
    return respuesta;
  }

  const season = Number(requestedSeason) || Number(respuesta.temporada);
  const filtered = filterLigaBetPlayGrupos(respuesta.grupos || [], season);
  const hasMultipleGroups = filtered.length > 1;

  return {
    ...respuesta,
    temporada: String(season),
    grupos: filtered,
    tabla: filtered.length > 0 ? filtered[0].tabla : [],
    hasMultipleGroups,
    ligaBetPlayFormat: usesDirectKnockoutFormat(season) ? "direct_knockout" : "cuadrangulares",
  };
}

module.exports = {
  LIGA_BETPLAY_LEAGUE_ID,
  FIRST_DIRECT_KNOCKOUT_SEASON,
  isLigaBetPlay,
  usesDirectKnockoutFormat,
  isCuadrangularGroup,
  isMainLeagueTableGroup,
  filterLigaBetPlayGrupos,
  applyLigaBetPlayStandingsResponse,
};
