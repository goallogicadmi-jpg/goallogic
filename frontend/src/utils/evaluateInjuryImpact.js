/**
 * Evalúa el impacto de lesiones sobre el rendimiento del equipo.
 * Usa estadísticas de plantilla (API-Football players) cuando están disponibles.
 */

export const IMPACTO_NIVEL = {
  BAJO: 'bajo',
  MODERADO: 'moderado',
  ALTO: 'alto',
};

export const MAX_LESIONES_VISIBLES = 5;

const IMPACTO_PRIORIDAD = [IMPACTO_NIVEL.ALTO, IMPACTO_NIVEL.MODERADO, IMPACTO_NIVEL.BAJO];

const POSITION_GROUP = {
  G: 'GK',
  GK: 'GK',
  Goalkeeper: 'GK',
  D: 'DEF',
  DEF: 'DEF',
  Defender: 'DEF',
  M: 'MID',
  MID: 'MID',
  Midfielder: 'MID',
  F: 'FWD',
  FWD: 'FWD',
  Attacker: 'FWD',
  Forward: 'FWD',
};

function normalizeName(name = '') {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getPositionGroup(position) {
  if (!position) return 'MID';
  const key = String(position).trim();
  return POSITION_GROUP[key] || POSITION_GROUP[key.slice(0, 1)] || 'MID';
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parseRating(rating) {
  const n = parseFloat(rating);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convierte entrada de /players?team= a perfil de plantilla.
 */
export function mapApiPlayerToSquadProfile(entry) {
  const stat = entry?.statistics?.[0];
  if (!stat) return null;

  const games = stat.games || {};
  const appearances = Number(games.appearences ?? games.appearances ?? 0) || 0;
  const lineups = Number(games.lineups ?? 0) || 0;
  const minutes = Number(games.minutes ?? 0) || 0;
  const rating = parseRating(games.rating);
  const position = games.position || entry.player?.position || 'MID';

  const goals = Number(stat.goals?.total ?? 0) || 0;
  const assists = Number(stat.goals?.assists ?? 0) || 0;
  const tackles = Number(stat.tackles?.total ?? 0) || 0;
  const interceptions = Number(stat.interceptions?.total ?? 0) || 0;
  const saves = Number(stat.goals?.saves ?? 0) || 0;
  const conceded = Number(stat.goals?.conceded ?? 0) || 0;

  return {
    id: entry.player?.id,
    nombre: entry.player?.name || 'Jugador',
    posicion: position,
    grupoPosicion: getPositionGroup(position),
    partidos: appearances,
    titularidades: lineups,
    minutos: minutes,
    minutosPorPartido: appearances > 0 ? minutes / appearances : 0,
    ratioTitular: appearances > 0 ? lineups / appearances : 0,
    goles: goals,
    asistencias: assists,
    contribucionOfensiva: goals * 3 + assists * 2,
    tackles,
    intercepciones: interceptions,
    atajadas: saves,
    golesRecibidos: conceded,
    rating,
  };
}

export function buildSquadFromPlayersResponse(playersResponse) {
  const list = playersResponse?.response || playersResponse || [];
  if (!Array.isArray(list)) return [];

  return list
    .map(mapApiPlayerToSquadProfile)
    .filter(Boolean)
    .sort((a, b) => b.minutos - a.minutos);
}

function findPlayerInSquad(injury, squad) {
  const injuryId = injury?.player?.id ?? injury?.id;
  if (injuryId) {
    const byId = squad.find((p) => p.id === injuryId);
    if (byId) return byId;
  }

  const injuryName = normalizeName(injury?.player?.name ?? injury?.jugador ?? '');
  if (!injuryName) return null;

  return (
    squad.find((p) => normalizeName(p.nombre) === injuryName) ||
    squad.find((p) => normalizeName(p.nombre).includes(injuryName)) ||
    squad.find((p) => injuryName.includes(normalizeName(p.nombre)))
  );
}

function scoreTitularidad(player) {
  const ratioTitular = clamp(player.ratioTitular, 0, 1);
  const minutosNorm = clamp(player.minutosPorPartido / 85, 0, 1);
  return ratioTitular * 0.55 + minutosNorm * 0.45;
}

function scoreOfensivo(player, squad) {
  const maxContrib =
    Math.max(...squad.map((p) => p.contribucionOfensiva), 1);
  const contribNorm = player.contribucionOfensiva / maxContrib;
  const grupo = player.grupoPosicion;
  const pesoPosicion = grupo === 'FWD' ? 1 : grupo === 'MID' ? 0.85 : 0.35;
  return contribNorm * pesoPosicion;
}

function scoreDefensivo(player, squad) {
  const grupo = player.grupoPosicion;
  if (grupo === 'FWD') return 0.15;

  const maxDef = Math.max(
    ...squad.map((p) => p.tackles + p.intercepciones + (p.grupoPosicion === 'GK' ? p.atajadas * 0.5 : 0)),
    1
  );
  const defRaw =
    player.tackles +
    player.intercepciones +
    (player.grupoPosicion === 'GK' ? player.atajadas * 0.5 : 0);
  const defNorm = defRaw / maxDef;

  const gkBonus =
    player.grupoPosicion === 'GK' && player.titularidades >= 3 ? 0.35 : 0;
  const pesoPosicion = grupo === 'DEF' || grupo === 'GK' ? 1 : 0.55;

  return clamp(defNorm * pesoPosicion + gkBonus, 0, 1);
}

function scoreRating(player) {
  if (!player.rating) return 0.35;
  return clamp((player.rating - 6) / 2.5, 0, 1);
}

function scorePosicionCritica(player) {
  const weights = { GK: 1, DEF: 0.75, MID: 0.55, FWD: 0.7 };
  return weights[player.grupoPosicion] ?? 0.5;
}

/**
 * Profundidad: compara al lesionado con el mejor suplente de su línea.
 * Valor alto = poca profundidad = más impacto.
 */
function scoreFaltaProfundidad(player, squad, injuredNames) {
  const sameLine = squad.filter(
    (p) =>
      p.grupoPosicion === player.grupoPosicion &&
      !injuredNames.has(normalizeName(p.nombre))
  );

  if (sameLine.length === 0) return 0.9;

  const sorted = [...sameLine].sort((a, b) => b.minutos - a.minutos);
  const backup = sorted[0];
  if (!backup) return 0.85;

  const playerScore = player.minutos + player.contribucionOfensiva * 8 + player.rating * 12;
  const backupScore = backup.minutos + backup.contribucionOfensiva * 8 + backup.rating * 12;

  if (playerScore <= 0) return 0.4;
  const ratio = backupScore / playerScore;
  return clamp(1 - ratio, 0, 1);
}

function mapInjuryStatus(tipo) {
  const t = String(tipo || '').toLowerCase();
  if (t.includes('doubt') || t.includes('question')) return 'dudoso';
  return 'baja';
}

function scoreToNivel(score) {
  if (score >= 0.62) return IMPACTO_NIVEL.ALTO;
  if (score >= 0.38) return IMPACTO_NIVEL.MODERADO;
  return IMPACTO_NIVEL.BAJO;
}

function buildImpactSummary(factores) {
  const parts = [];
  if (factores.titularidad >= 0.65) parts.push('titular habitual');
  if (factores.ofensivo >= 0.55) parts.push('aporte ofensivo relevante');
  if (factores.defensivo >= 0.55) parts.push('peso defensivo');
  if (factores.rating >= 0.6) parts.push('alto rendimiento');
  if (factores.profundidad >= 0.6) parts.push('poca profundidad en su puesto');
  if (parts.length === 0) return 'Rol complementario en la rotación actual.';
  return parts.join(', ');
}

/**
 * Evalúa un jugador lesionado.
 */
export function evaluateInjuredPlayer(injury, squad, injuredNamesSet) {
  const player = findPlayerInSquad(injury, squad);
  const estado = mapInjuryStatus(injury?.player?.type ?? injury?.tipo);
  const nombre = injury?.player?.name ?? injury?.jugador ?? 'Jugador';
  const posicion = injury?.player?.position ?? injury?.posicion ?? player?.posicion ?? '—';
  const razon = injury?.player?.reason ?? injury?.razon ?? null;

  if (!player) {
    const baseScore = estado === 'dudoso' ? 0.22 : 0.35;
    return {
      jugador: nombre,
      posicion,
      tipo: injury?.player?.type ?? injury?.tipo,
      estado,
      razon,
      impacto: scoreToNivel(baseScore),
      puntuacionImpacto: Math.round(baseScore * 100),
      factores: null,
      resumen: 'Sin estadísticas de temporada; impacto estimado conservador.',
      datosDisponibles: false,
    };
  }

  const factores = {
    titularidad: scoreTitularidad(player),
    ofensivo: scoreOfensivo(player, squad),
    defensivo: scoreDefensivo(player, squad),
    rating: scoreRating(player),
    posicion: scorePosicionCritica(player),
    profundidad: scoreFaltaProfundidad(player, squad, injuredNamesSet),
  };

  let score =
    factores.titularidad * 0.28 +
    factores.ofensivo * 0.2 +
    factores.defensivo * 0.18 +
    factores.rating * 0.14 +
    factores.posicion * 0.08 +
    factores.profundidad * 0.12;

  if (estado === 'dudoso') score *= 0.55;

  const impacto = scoreToNivel(score);

  return {
    jugador: nombre,
    jugadorId: player.id,
    posicion: player.posicion || posicion,
    grupoPosicion: player.grupoPosicion,
    tipo: injury?.player?.type ?? injury?.tipo,
    estado,
    razon,
    impacto,
    puntuacionImpacto: Math.round(score * 100),
    factores: {
      titularidad: Math.round(factores.titularidad * 100),
      ofensivo: Math.round(factores.ofensivo * 100),
      defensivo: Math.round(factores.defensivo * 100),
      rating: Math.round(factores.rating * 100),
      profundidad: Math.round(factores.profundidad * 100),
    },
    estadisticas: {
      partidos: player.partidos,
      titularidades: player.titularidades,
      minutos: player.minutos,
      goles: player.goles,
      asistencias: player.asistencias,
      rating: player.rating || null,
    },
    resumen: buildImpactSummary(factores),
    datosDisponibles: true,
  };
}

/**
 * Factor 0–1 para módulo GoalLogic (1 = sin penalización).
 */
export function computeInjuryFactorFromEvaluations(evaluados = []) {
  if (!evaluados.length) return 1;

  const weights = { bajo: 0.08, moderado: 0.18, alto: 0.32 };
  let penalty = 0;
  for (const item of evaluados) {
    penalty += weights[item.impacto] ?? 0.12;
    if (item.estado === 'dudoso') penalty *= 0.85;
  }

  return clamp(1 - Math.min(penalty, 0.55), 0.45, 1);
}

export function summarizeTeamInjuryImpact(evaluados = []) {
  if (!evaluados.length) {
    return {
      nivel: IMPACTO_NIVEL.BAJO,
      etiqueta: 'Sin bajas registradas',
      factor: 1,
      altos: 0,
      moderados: 0,
      bajos: 0,
    };
  }

  const altos = evaluados.filter((e) => e.impacto === IMPACTO_NIVEL.ALTO).length;
  const moderados = evaluados.filter((e) => e.impacto === IMPACTO_NIVEL.MODERADO).length;
  const bajos = evaluados.filter((e) => e.impacto === IMPACTO_NIVEL.BAJO).length;
  const factor = computeInjuryFactorFromEvaluations(evaluados);

  let nivel = IMPACTO_NIVEL.BAJO;
  if (altos >= 2 || (altos >= 1 && moderados >= 2)) nivel = IMPACTO_NIVEL.ALTO;
  else if (altos >= 1 || moderados >= 2) nivel = IMPACTO_NIVEL.MODERADO;
  else if (moderados >= 1) nivel = IMPACTO_NIVEL.MODERADO;

  const etiquetas = {
    [IMPACTO_NIVEL.ALTO]: 'Impacto alto en el rendimiento',
    [IMPACTO_NIVEL.MODERADO]: 'Impacto moderado en el rendimiento',
    [IMPACTO_NIVEL.BAJO]: 'Impacto bajo en el rendimiento',
  };

  return {
    nivel,
    etiqueta: etiquetas[nivel],
    factor,
    altos,
    moderados,
    bajos,
    total: evaluados.length,
  };
}

function sortByImpactScoreDesc(a, b) {
  return (b.puntuacionImpacto ?? 0) - (a.puntuacionImpacto ?? 0);
}

/**
 * Selecciona hasta `max` lesionados: primero alto, luego moderado, luego bajo.
 * Dentro de cada nivel, prioriza mayor puntuacionImpacto del motor.
 */
export function selectInjuriesByImpactPriority(jugadores, max = MAX_LESIONES_VISIBLES) {
  if (!Array.isArray(jugadores) || jugadores.length === 0) return [];

  const limit = Math.max(1, max);
  const pools = IMPACTO_PRIORIDAD.map((nivel) =>
    jugadores.filter((j) => j.impacto === nivel).sort(sortByImpactScoreDesc)
  );

  const selected = [];
  for (const pool of pools) {
    for (const jugador of pool) {
      if (selected.length >= limit) return selected;
      selected.push(jugador);
    }
  }

  return selected;
}

/**
 * Conclusión cuando hay al menos una baja de impacto alto.
 */
export function buildHighImpactInjuryConclusion(nombreEquipo, jugadores) {
  const altos = (jugadores || [])
    .filter((j) => j.impacto === IMPACTO_NIVEL.ALTO)
    .sort(sortByImpactScoreDesc);

  if (altos.length === 0) return null;

  const nombres = altos.slice(0, 3).map((j) => j.jugador);
  const listaNombres =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;

  const extra =
    altos.length > 3 ? ` (y ${altos.length - 3} baja${altos.length - 3 > 1 ? 's' : ''} más de alto impacto)` : '';

  return `${nombreEquipo} tiene ${altos.length} baja${altos.length > 1 ? 's' : ''} de impacto alto. La ausencia de ${listaNombres}${extra} puede afectar de forma importante el rendimiento del equipo según el modelo GoalLogic.`;
}

/**
 * Enriquece lesiones de un equipo con evaluación de impacto.
 */
export function enrichTeamInjuries(injuriesResponse, playersStatsResponse) {
  const rawInjuries = injuriesResponse?.response || [];
  const squad = buildSquadFromPlayersResponse(playersStatsResponse);

  const injuredNames = new Set(
    rawInjuries.map((i) => normalizeName(i?.player?.name)).filter(Boolean)
  );

  const evaluados = rawInjuries.map((injury) =>
    evaluateInjuredPlayer(injury, squad, injuredNames)
  );

  const jugadores = evaluados.map((e) => ({
    jugador: e.jugador,
    jugadorId: e.jugadorId,
    posicion: e.posicion,
    tipo: e.tipo,
    estado: e.estado,
    razon: e.razon,
    impacto: e.impacto,
    puntuacionImpacto: e.puntuacionImpacto,
    factores: e.factores,
    estadisticas: e.estadisticas,
    resumen: e.resumen,
    datosDisponibles: e.datosDisponibles,
  }));

  const jugadoresVisibles = selectInjuriesByImpactPriority(jugadores, MAX_LESIONES_VISIBLES);

  return {
    total: jugadores.length,
    jugadores,
    jugadoresVisibles,
    totalVisibles: jugadoresVisibles.length,
    evaluados,
    resumenImpacto: summarizeTeamInjuryImpact(evaluados),
    plantillaAnalizada: squad.length,
  };
}
