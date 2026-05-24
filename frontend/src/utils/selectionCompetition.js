/**
 * Helpers para competiciones de selecciones (grupos / copa).
 */

export function resolveGroupKey(group, index = 0) {
  if (typeof group === 'string') {
    return `legacy-${index}-${group}`;
  }
  return group?.groupKey || `${String.fromCharCode(65 + index)}`;
}

export function resolveGroupLabel(group, index = 0) {
  if (typeof group === 'string') {
    return group;
  }
  return (
    group?.groupLabel ||
    group?.groupName ||
    group?.name ||
    group?.group ||
    `Grupo ${String.fromCharCode(65 + index)}`
  );
}

export function normalizeCupStanding(standing, groupLabel) {
  const team = standing?.team || {};
  return {
    posicion: standing?.rank ?? standing?.position ?? 0,
    equipo: team?.name || standing?.name || 'Equipo',
    equipoId: team?.id ?? standing?.teamId ?? standing?.id ?? null,
    jugados: standing?.all?.played ?? standing?.played ?? 0,
    golesFavor: standing?.all?.goals?.for ?? standing?.goalsFor ?? 0,
    golesContra: standing?.all?.goals?.against ?? standing?.goalsAgainst ?? 0,
    puntos: standing?.points ?? 0,
    diferencia:
      (standing?.all?.goals?.for ?? standing?.goalsFor ?? 0) -
      (standing?.all?.goals?.against ?? standing?.goalsAgainst ?? 0),
    grupo: groupLabel,
    forma: standing?.form || standing?.forma || '',
    rendimiento: standing?.rendimiento ?? null,
    tendencias: standing?.tendencias || [],
  };
}

export function flattenCupGroupsToTeams(groups = []) {
  const teams = [];
  groups.forEach((group, index) => {
    const label = resolveGroupLabel(group, index);
    const standings = Array.isArray(group?.standings) ? group.standings : [];
    standings.forEach((standing) => {
      teams.push(normalizeCupStanding(standing, label));
    });
  });
  return teams;
}

export function getGroupStandingsSorted(group) {
  const standings = Array.isArray(group?.standings) ? [...group.standings] : [];
  return standings.sort((a, b) => {
    const rankA = Number(a?.rank ?? a?.position ?? 999);
    const rankB = Number(b?.rank ?? b?.position ?? 999);
    return rankA - rankB;
  });
}

export function getLeaderGroupFromCup(groups = []) {
  if (!groups.length) return { groupLabel: null, tabla: [] };

  const primary =
    groups.find((g) => {
      const label = resolveGroupLabel(g, 0).toLowerCase();
      return label.includes('grupo a') || label.includes('group a');
    }) || groups[0];

  const index = groups.indexOf(primary);
  const groupLabel = resolveGroupLabel(primary, index >= 0 ? index : 0);
  const tabla = getGroupStandingsSorted(primary).map((s) => normalizeCupStanding(s, groupLabel));

  return { groupLabel, tabla };
}

export function getSelectionHighlights(teams = []) {
  const withGames = teams.filter((t) => (t.jugados || 0) > 0);
  if (!withGames.length) {
    return { mejorAtaque: null, mejorDefensa: null };
  }

  return {
    mejorAtaque: [...withGames].sort((a, b) => (b.golesFavor || 0) - (a.golesFavor || 0))[0],
    mejorDefensa: [...withGames].sort((a, b) => (a.golesContra || 0) - (b.golesContra || 0))[0],
  };
}

/** Copa con fase de grupos (Mundial, Euro, etc.). */
export function competitionExpectsGroupPhase(competitionInfo) {
  if (!competitionInfo) return false;
  return (
    competitionInfo.format === 'group_and_knockout' ||
    competitionInfo.type === 'Cup'
  );
}

/** Convierte grupos de /estadisticas/torneo al formato de copa (GroupStandings). */
export function convertTorneoGruposToCupGroups(grupos = []) {
  if (!Array.isArray(grupos)) return [];

  return grupos
    .map((grupo, index) => {
      const tabla = Array.isArray(grupo?.tabla) ? grupo.tabla : [];
      if (!tabla.length || !grupo?.groupName) return null;

      const rawGroupName = String(grupo.groupName);
      const letterMatch = rawGroupName.match(/(?:group|grupo)\s+([A-Z0-9]+)/i);
      const groupLetter = letterMatch?.[1]?.toUpperCase() || String.fromCharCode(65 + index);

      const standings = tabla.map((row) => ({
        rank: row.posicion,
        position: row.posicion,
        team: {
          id: row.equipoId,
          name: row.equipo,
          logo: row.logo || null,
        },
        points: row.puntos,
        played: row.jugados,
        goalsFor: row.golesFavor,
        goalsAgainst: row.golesContra,
        all: {
          played: row.jugados ?? 0,
          win: row.ganados ?? 0,
          draw: row.empatados ?? 0,
          lose: row.perdidos ?? 0,
          goals: {
            for: row.golesFavor ?? 0,
            against: row.golesContra ?? 0,
          },
        },
        form: row.forma || '',
      }));

      return {
        groupKey: groupLetter,
        groupLabel: `Grupo ${groupLetter}`,
        groupName: `Grupo ${groupLetter}`,
        groupType: 'group',
        standings,
        teams: standings
          .map((entry) => ({
            id: entry.team?.id,
            name: entry.team?.name,
            logo: entry.team?.logo,
          }))
          .filter((team) => team.id),
      };
    })
    .filter(Boolean);
}

export function groupHasStandings(group) {
  return Array.isArray(group?.standings) && group.standings.length > 0;
}

export function mergeTorneoFormaIntoTeams(teams, torneoTabla = []) {
  const formaByName = new Map(
    torneoTabla.map((t) => [String(t.equipo || '').toLowerCase(), t])
  );

  return teams.map((team) => {
    const extra = formaByName.get(String(team.equipo || '').toLowerCase());
    if (!extra) return team;
    return {
      ...team,
      forma: extra.forma || team.forma,
      rendimiento: extra.rendimiento ?? team.rendimiento,
      tendencias: extra.tendencias?.length ? extra.tendencias : team.tendencias,
      equipoId: team.equipoId || extra.equipoId,
    };
  });
}
