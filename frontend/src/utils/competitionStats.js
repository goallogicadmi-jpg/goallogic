/**
 * KPIs y merges para el tab Estadísticas de competición.
 * Usa el mismo shape que /estadisticas/torneo y /estadisticas/avanzadas.
 */

export function computeTorneoKpis(tabla) {
  if (!tabla?.length) return null;

  const totalGF = tabla.reduce((s, t) => s + (t.golesFavor || 0), 0);
  const totalGC = tabla.reduce((s, t) => s + (t.golesContra || 0), 0);
  const totalPJ = tabla.reduce((s, t) => s + (t.jugados || 0), 0);
  const teamCount = tabla.length;
  const matchCount = totalPJ > 0 ? totalPJ / 2 : 0;

  const golesPorPartido =
    matchCount > 0 ? Number((totalGF / matchCount).toFixed(2)) : null;
  const promedioGF = teamCount > 0 ? Number((totalGF / teamCount).toFixed(1)) : null;
  const promedioGC = teamCount > 0 ? Number((totalGC / teamCount).toFixed(1)) : null;

  const withGames = tabla.filter((t) => (t.jugados || 0) > 0);
  const topScorer = [...withGames].sort((a, b) => (b.golesFavor || 0) - (a.golesFavor || 0))[0];
  const bestDefense = [...withGames].sort(
    (a, b) => (a.golesContra || 0) - (b.golesContra || 0)
  )[0];

  return {
    golesPorPartido,
    promedioGF,
    promedioGC,
    topScorer,
    bestDefense,
    totalGF,
    totalGC,
    matchCount,
  };
}

export function getHighlightTeams(tabla) {
  const withGames = (tabla || []).filter((t) => (t.jugados || 0) > 0);
  if (!withGames.length) {
    return { mejorAtaque: null, mejorDefensa: null, mejorForma: null };
  }

  const formaScore = (forma) =>
    (forma || '').split('').reduce((sum, c) => {
      if (c === 'W') return sum + 3;
      if (c === 'D') return sum + 1;
      return sum;
    }, 0);

  return {
    mejorAtaque: [...withGames].sort((a, b) => (b.golesFavor || 0) - (a.golesFavor || 0))[0],
    mejorDefensa: [...withGames].sort((a, b) => (a.golesContra || 0) - (b.golesContra || 0))[0],
    mejorForma: [...withGames].sort((a, b) => formaScore(b.forma) - formaScore(a.forma))[0],
  };
}

export function mergeAvanzadasWithTabla(tabla, equiposAvanzadas = []) {
  const byName = new Map(
    equiposAvanzadas.map((e) => [String(e.equipo || '').toLowerCase(), e])
  );

  return (tabla || []).map((team) => {
    const adv = byName.get(String(team.equipo || '').toLowerCase());
    const goles = adv?.goles ?? team.golesFavor ?? 0;
    const golesContra = team.golesContra ?? 0;
    const ratio = goles > 0 && adv?.xG ? adv.xG / goles : 0.9;
    const xGA_estimado =
      golesContra > 0 ? Number((golesContra * (ratio || 0.9)).toFixed(2)) : 0;

    return {
      ...team,
      xG: adv?.xG ?? null,
      xA: adv?.xA ?? null,
      posesion: adv?.posesion ?? null,
      tiros: adv?.tiros ?? null,
      eficiencia: adv?.eficiencia ?? null,
      xGA_estimado,
    };
  });
}

export function getTendenciaColor(resultado) {
  if (resultado === 'Victoria') return '#22c55e';
  if (resultado === 'Derrota') return '#ef4444';
  return '#f59e0b';
}
