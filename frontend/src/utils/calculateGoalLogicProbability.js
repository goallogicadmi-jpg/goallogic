/**
 * Fase 2 guarda en raíz; lectura legacy bajo datosAdicionales.estadisticas.
 * @param {Object} datosAdicionales
 * @returns {Object}
 */
function getEstadisticasLocalVisitante(datosAdicionales) {
  return (
    datosAdicionales?.estadisticasLocalVisitante ||
    datosAdicionales?.estadisticas?.estadisticasLocalVisitante ||
    {}
  );
}

function limitar(valor) {
  return Math.min(Math.max(valor, 0), 1);
}

/**
 * Desglose R/L/A/C — misma lógica que el motor 1X2.
 * @returns {{ R, L, A, C, C_LES, P_equipo, meta }}
 */
export function computeGoalLogicModules(equipo, equipoOponente, datosAdicionales, tipo) {
  const ultimosPartidos = equipo.ultimosPartidos || [];
  const ultimos5 = ultimosPartidos.slice(0, 5);

  let promedioGolesAnotados = 0;
  let promedioGolesRecibidos = 0;
  let sumaForma = 0;

  if (ultimos5.length > 0) {
    const totalGolesAnotados = ultimos5.reduce((sum, p) => sum + (p.golesFavor || 0), 0);
    const totalGolesRecibidos = ultimos5.reduce((sum, p) => sum + (p.golesContra || 0), 0);
    promedioGolesAnotados = totalGolesAnotados / ultimos5.length;
    promedioGolesRecibidos = totalGolesRecibidos / ultimos5.length;
    sumaForma = ultimos5.reduce((sum, p) => {
      if (p.resultado === 'G') return sum + 1;
      if (p.resultado === 'E') return sum + 0.5;
      return sum + 0;
    }, 0);
  }

  const estadisticasLocalVisitante = getEstadisticasLocalVisitante(datosAdicionales);
  const equipoAId = estadisticasLocalVisitante.equipoA?.estadisticas?.team?.id;
  const equipoBId = estadisticasLocalVisitante.equipoB?.estadisticas?.team?.id;

  let esEquipoA = false;
  if (equipoAId && equipo.id === equipoAId) {
    esEquipoA = true;
  } else if (equipoBId && equipo.id === equipoBId) {
    esEquipoA = false;
  } else {
    esEquipoA = tipo === 'local';
  }

  const estadisticasEquipo = esEquipoA
    ? estadisticasLocalVisitante.equipoA?.estadisticas || {}
    : estadisticasLocalVisitante.equipoB?.estadisticas || {};

  const estadisticasLocal = estadisticasEquipo.fixtures?.home || {};
  const estadisticasVisitante = estadisticasEquipo.fixtures?.away || {};

  let golesLocalOVist = 0;
  let golesRecibLocalOVist = 0;
  let porcentajeVictorias = 0;

  if (tipo === 'local') {
    const golesFavorLocal = estadisticasLocal.goals?.for?.total || estadisticasLocal.goals?.for || 0;
    const partidosLocal = estadisticasLocal.played?.total || estadisticasLocal.played || 1;
    golesLocalOVist = partidosLocal > 0 ? golesFavorLocal / partidosLocal : equipo.promedioGolesFavor || 0;
    const golesContraLocal = estadisticasLocal.goals?.against?.total || estadisticasLocal.goals?.against || 0;
    golesRecibLocalOVist = partidosLocal > 0 ? golesContraLocal / partidosLocal : equipo.promedioGolesContra || 0;
    const victoriasLocal = estadisticasLocal.wins?.total || estadisticasLocal.wins || 0;
    porcentajeVictorias = partidosLocal > 0 ? (victoriasLocal / partidosLocal) * 100 : 0;
  } else {
    const golesFavorVisitante = estadisticasVisitante.goals?.for?.total || estadisticasVisitante.goals?.for || 0;
    const partidosVisitante = estadisticasVisitante.played?.total || estadisticasVisitante.played || 1;
    golesLocalOVist =
      partidosVisitante > 0 ? golesFavorVisitante / partidosVisitante : equipo.promedioGolesFavor || 0;
    const golesContraVisitante = estadisticasVisitante.goals?.against?.total || estadisticasVisitante.goals?.against || 0;
    golesRecibLocalOVist =
      partidosVisitante > 0 ? golesContraVisitante / partidosVisitante : equipo.promedioGolesContra || 0;
    const victoriasVisitante = estadisticasVisitante.wins?.total || estadisticasVisitante.wins || 0;
    porcentajeVictorias = partidosVisitante > 0 ? (victoriasVisitante / partidosVisitante) * 100 : 0;
  }

  const posesion =
    estadisticasEquipo.possession ||
    equipo.estadisticasOfensivas?.posesion ||
    equipo.estadisticas?.posesion ||
    50;

  const tirosAlArcoTotal = estadisticasEquipo.shots?.on?.total || estadisticasEquipo.shots?.on || 0;
  const partidosTotales =
    estadisticasEquipo.fixtures?.played?.total ||
    estadisticasEquipo.fixtures?.played ||
    equipo.ultimosPartidos?.length ||
    1;
  const tirosPuerta =
    partidosTotales > 0
      ? tirosAlArcoTotal / partidosTotales
      : equipo.estadisticasOfensivas?.tirosAlArcoPromedio || equipo.estadisticasOfensivas?.tirosAlArco || 0;

  const xGTotal = estadisticasEquipo.goals?.expected?.for?.total || estadisticasEquipo.goals?.expected?.for || null;
  const xGFromPhase2 = xGTotal !== null && xGTotal !== undefined && partidosTotales > 0;
  const xG = xGFromPhase2 ? xGTotal / partidosTotales : equipo.estadisticasOfensivas?.xG ?? null;

  let xGSource = 'none';
  if (xGFromPhase2) {
    xGSource = 'api_phase2';
  } else if (xG != null && equipo.estadisticasOfensivas?.xGSource === 'api') {
    xGSource = 'api';
  } else if (xG != null) {
    xGSource = 'estimated';
  }

  const lesionesBloque = esEquipoA ? datosAdicionales?.lesiones?.equipoA : datosAdicionales?.lesiones?.equipoB;
  const factorLesionesEvaluado = lesionesBloque?.resumenImpacto?.factor;

  const diasDescanso = 3;
  const importancia = 3;

  const R_GF = limitar(promedioGolesAnotados / 4);
  const R_GA = limitar(1 - promedioGolesRecibidos / 4);
  const R_FORM = limitar(sumaForma / 5);
  const R = (R_GF + R_GA + R_FORM) / 3;

  const L_GF = limitar(golesLocalOVist / 4);
  const L_GA = limitar(1 - golesRecibLocalOVist / 4);
  const L_WIN = limitar(porcentajeVictorias / 100);
  const L = (L_GF + L_GA + L_WIN) / 3;

  const A_POS = limitar(posesion / 100);
  const A_SHOTS = limitar(tirosPuerta / 10);
  let A;
  if (xG !== null && xG !== undefined) {
    const A_XG = limitar(xG / 3);
    A = (A_POS + A_SHOTS + A_XG) / 3;
  } else {
    A = (A_POS + A_SHOTS) / 2;
  }

  let C_LES = 1;
  if (typeof factorLesionesEvaluado === 'number' && Number.isFinite(factorLesionesEvaluado)) {
    C_LES = limitar(factorLesionesEvaluado);
  }
  const C_REST = limitar(diasDescanso / 7);
  const C_IMP = limitar(importancia / 5);
  const C = (C_LES + C_REST + C_IMP) / 3;

  const P_equipo = R * 0.4 + L * 0.25 + A * 0.25 + C * 0.1;

  return {
    R,
    L,
    A,
    C,
    C_LES,
    P_equipo: limitar(P_equipo),
    meta: {
      ultimos5Count: ultimos5.length,
      xGPerGame: xG,
      xGSource,
      usesPhase2Stats: Boolean(estadisticasEquipo?.fixtures?.played?.total),
      contexto: tipo,
      golesContexto: golesLocalOVist,
      golesRecibContexto: golesRecibLocalOVist,
      porcentajeVictorias,
      tirosPuerta,
      posesion,
      factorLesiones: typeof factorLesionesEvaluado === 'number' ? factorLesionesEvaluado : 1,
      resumenImpacto: lesionesBloque?.resumenImpacto || null,
    },
  };
}

/**
 * Calcula la probabilidad GoalLogic para un equipo según las fórmulas exactas proporcionadas
 */
export function calculateGoalLogicProbability(equipo, equipoOponente, datosAdicionales, tipo) {
  return computeGoalLogicModules(equipo, equipoOponente, datosAdicionales, tipo).P_equipo;
}

/**
 * Calcula las probabilidades finales GoalLogic para ambos equipos con normalización
 */
export function calculateFinalGoalLogicProbabilities(equipoLocal, equipoVisitante, datosAdicionales) {
  const P_local = calculateGoalLogicProbability(equipoLocal, equipoVisitante, datosAdicionales, 'local');
  const P_visitante = calculateGoalLogicProbability(equipoVisitante, equipoLocal, datosAdicionales, 'visitante');

  const DIF = Math.abs(P_local - P_visitante);
  let P_empate = 0.25 - DIF * 0.2;
  P_empate = Math.max(0.15, Math.min(P_empate, 0.30));

  const S = P_local + P_visitante;
  let probLocal = (P_local / S) * (1 - P_empate);
  let probVisitante = (P_visitante / S) * (1 - P_empate);

  const total = probLocal + probVisitante + P_empate;
  if (total > 0) {
    probLocal = probLocal / total;
    probVisitante = probVisitante / total;
    P_empate = P_empate / total;
  }

  return {
    local: probLocal,
    visitante: probVisitante,
    empate: P_empate,
    raw: { P_local, P_visitante, P_empate_pre_norm: P_empate },
  };
}
