import {
  computeGoalLogicModules,
  calculateFinalGoalLogicProbabilities,
} from './calculateGoalLogicProbability';
import { IMPACTO_NIVEL } from './evaluateInjuryImpact';

const WEIGHTS = { R: 0.4, L: 0.25, A: 0.25, C: 0.1 };
const MODULE_MIN_ADVANTAGE = 0.015;
const CLOSE_PROB_PP = 3;
const INJURY_FACTOR_THRESHOLD = 0.985;

function pct(prob) {
  return (prob * 100).toFixed(1);
}

function normalizeDatosAdicionales(datosAdicionales) {
  return (
    datosAdicionales || {
      lesiones: {
        equipoA: { jugadores: [], resumenImpacto: { factor: 1 } },
        equipoB: { jugadores: [], resumenImpacto: { factor: 1 } },
      },
    }
  );
}

function resolveFavorite(probs, nombreLocal, nombreVisitante) {
  const options = [
    { side: 'local', prob: probs.local, nombre: nombreLocal || 'Local' },
    { side: 'empate', prob: probs.empate, nombre: 'Empate' },
    { side: 'visitante', prob: probs.visitante, nombre: nombreVisitante || 'Visitante' },
  ];
  const sorted = [...options].sort((a, b) => b.prob - a.prob);
  const top = sorted[0];
  const second = sorted[1];
  const marginPp = (top.prob - second.prob) * 100;
  const isClose = marginPp < CLOSE_PROB_PP;
  return { favorite: top, isClose, marginPp, sorted };
}

function weightedAdvantage(modFav, modOpp, moduleKey) {
  const w = WEIGHTS[moduleKey];
  return w * (modFav[moduleKey] - modOpp[moduleKey]);
}

function buildFormaText(favNombre, modFav, modOpp) {
  const parts = [];
  if (modFav.meta.ultimos5Count < 3) {
    return `${favNombre} aporta ventaja en forma reciente según los últimos partidos disponibles (módulo R, 40 % del modelo).`;
  }
  if (modFav.R - modOpp.R >= 0.08) {
    parts.push('mejor rendimiento en los últimos 5 partidos');
  }
  if (modFav.meta.golesContexto > modOpp.meta.golesContexto + 0.2) {
    parts.push('mayor producción ofensiva reciente');
  }
  const detail = parts.length ? parts.join(' y ') : 'mejor puntuación agregada de forma';
  return `${favNombre} ${detail} (módulo Forma, 40 % del modelo).`;
}

function buildLocalVisitanteText(favNombre, favSide, modFav) {
  const ctx = modFav.meta.contexto === 'local' ? 'como local' : 'como visitante';
  const gf = modFav.meta.golesContexto?.toFixed(2) ?? '—';
  const gc = modFav.meta.golesRecibContexto?.toFixed(2) ?? '—';
  const win = modFav.meta.porcentajeVictorias?.toFixed(0) ?? '0';
  return `${favNombre} presenta mejores números ${ctx} en temporada (${gf} goles a favor, ${gc} en contra, ${win} % victorias en ese contexto; módulo Local/Visitante, 25 %).`;
}

function buildAvanzadasText(favNombre, modFav, modOpp) {
  const src = modFav.meta.xGSource;
  const apiBacked = src === 'api_phase2' || src === 'api';
  if (apiBacked && modFav.meta.xGPerGame != null && modOpp.meta.xGPerGame != null) {
    return `${favNombre} supera en ocasiones de temporada (xG ${modFav.meta.xGPerGame.toFixed(2)} vs ${modOpp.meta.xGPerGame.toFixed(2)} por partido) y métricas de volumen del módulo Avanzadas (25 %).`;
  }
  if (modFav.A - modOpp.A >= 0.05) {
    return `${favNombre} suma ventaja en posesión, tiros a puerta y volumen ofensivo del módulo Avanzadas (25 %); el xG del panel puede estar estimado si aún no hay stats de temporada.`;
  }
  return `${favNombre} lidera el submódulo Avanzadas (25 %) por control y volumen de juego.`;
}

const MODULE_BUILDERS = {
  R: (favNombre, favSide, modFav, modOpp) => ({
    module: 'R',
    label: '[Forma 40%]',
    texto: buildFormaText(favNombre, modFav, modOpp),
  }),
  L: (favNombre, favSide, modFav) => ({
    module: 'L',
    label: '[Local/Visitante 25%]',
    texto: buildLocalVisitanteText(favNombre, favSide, modFav),
  }),
  A: (favNombre, favSide, modFav, modOpp) => ({
    module: 'A',
    label: '[Avanzadas 25%]',
    texto: buildAvanzadasText(favNombre, modFav, modOpp),
  }),
};

function buildLesionesConclusions(equipoLocal, equipoVisitante, datos) {
  const items = [];
  const pairs = [
    { equipo: equipoLocal, bloque: datos.lesiones?.equipoA, role: 'local' },
    { equipo: equipoVisitante, bloque: datos.lesiones?.equipoB, role: 'visitante' },
  ];

  for (const { equipo, bloque } of pairs) {
    const factor = bloque?.resumenImpacto?.factor;
    if (typeof factor !== 'number' || factor >= INJURY_FACTOR_THRESHOLD) continue;

    const nombre = equipo?.nombre || 'Equipo';
    const resumen = bloque?.resumenImpacto;
    const etiqueta = resumen?.etiqueta || 'Impacto en plantel';
    const nivel = resumen?.nivel;
    let detalle = `factor de lesiones ${factor.toFixed(2)} en el módulo Contexto (10 %).`;

    if (nivel === IMPACTO_NIVEL.ALTO) {
      detalle = `bajas de impacto alto (${etiqueta.toLowerCase()}); ${detalle}`;
    } else if (nivel === IMPACTO_NIVEL.MODERADO) {
      detalle = `bajas con impacto moderado; ${detalle}`;
    }

    items.push({
      equipo: nombre,
      factor,
      texto: `${nombre}: ${detalle}`,
    });
  }
  return items;
}

function buildCautelas({
  phase2Complete,
  ligaIdA,
  ligaIdB,
  isClose,
  modLocal,
  modVisit,
  porQueIncludesA,
}) {
  const cautelas = [];

  if (!phase2Complete) {
    cautelas.push(
      'Completando estadísticas de temporada (Fase 2): el 1X2 y estas conclusiones se afinan al terminar la carga.'
    );
  }

  if (ligaIdA && ligaIdB && String(ligaIdA) !== String(ligaIdB)) {
    cautelas.push(
      'Los equipos provienen de competiciones distintas; compara con cautela localía y nivel de liga.'
    );
  }

  if (isClose) {
    cautelas.push(
      'Las probabilidades están muy parejas (diferencia inferior a 3 pp); el desenlace puede definirse por detalles.'
    );
  }

  const aUsesEstimated =
    (modLocal.meta.xGSource === 'estimated' || modVisit.meta.xGSource === 'estimated') &&
    !modLocal.meta.usesPhase2Stats &&
    !modVisit.meta.usesPhase2Stats;

  if (porQueIncludesA && aUsesEstimated) {
    cautelas.push(
      'Las ocasiones (xG) del módulo Avanzadas usan estimación cuando no hay datos de API-Football; prioriza forma y contexto local/visitante.'
    );
  }

  return cautelas;
}

/**
 * Conclusiones alineadas al motor GoalLogic (R/L/A/C + 1X2).
 */
export function buildGoalLogicConclusions({
  equipoLocal,
  equipoVisitante,
  datosAdicionales,
  ligaIdA,
  ligaIdB,
  phase2Complete = false,
}) {
  const datos = normalizeDatosAdicionales(datosAdicionales);
  const nombreLocal = equipoLocal?.nombre || 'Local';
  const nombreVisitante = equipoVisitante?.nombre || 'Visitante';

  const probs = calculateFinalGoalLogicProbabilities(equipoLocal, equipoVisitante, datos);
  const modLocal = computeGoalLogicModules(equipoLocal, equipoVisitante, datos, 'local');
  const modVisit = computeGoalLogicModules(equipoVisitante, equipoLocal, datos, 'visitante');

  const { favorite, isClose } = resolveFavorite(probs, nombreLocal, nombreVisitante);

  let favSide = favorite.side;
  let favNombre = favorite.nombre;
  let modFav = favSide === 'local' ? modLocal : favSide === 'visitante' ? modVisit : modLocal;
  let modOpp = favSide === 'local' ? modVisit : favSide === 'visitante' ? modLocal : modVisit;

  if (favSide === 'empate' && !isClose) {
    favSide = modLocal.P_equipo >= modVisit.P_equipo ? 'local' : 'visitante';
    favNombre = favSide === 'local' ? nombreLocal : nombreVisitante;
    modFav = favSide === 'local' ? modLocal : modVisit;
    modOpp = favSide === 'local' ? modVisit : modLocal;
  }

  const moduleKeys = ['R', 'L', 'A'];
  const ranked = moduleKeys
    .map((key) => ({
      key,
      advantage:
        favSide === 'local'
          ? weightedAdvantage(modLocal, modVisit, key)
          : favSide === 'visitante'
            ? weightedAdvantage(modVisit, modLocal, key)
            : Math.abs(weightedAdvantage(modLocal, modVisit, key)),
    }))
    .filter((item) => item.advantage >= MODULE_MIN_ADVANTAGE)
    .sort((a, b) => b.advantage - a.advantage)
    .slice(0, 3);

  const porQue = ranked.map(({ key }) => {
    const builder = MODULE_BUILDERS[key];
    return builder(favNombre, favSide, modFav, modOpp);
  });

  if (porQue.length === 0 && !isClose) {
    porQue.push({
      module: 'R',
      label: '[Forma 40%]',
      texto: `${favNombre} concentra la ventaja global del modelo en los cuatro módulos ponderados (R/L/A/C).`,
    });
  }

  if (isClose && porQue.length === 0) {
    porQue.push({
      module: 'balance',
      label: '[Modelo]',
      texto:
        'GoalLogic no detecta ventaja clara en un solo módulo; el reparto de probabilidades refleja un duelo equilibrado.',
    });
  }

  const lesiones = buildLesionesConclusions(equipoLocal, equipoVisitante, datos);
  const cautelas = buildCautelas({
    phase2Complete,
    ligaIdA,
    ligaIdB,
    isClose,
    modLocal,
    modVisit,
    porQueIncludesA: ranked.some((r) => r.key === 'A'),
  });

  const favoritoLabel = isClose
    ? 'Partido equilibrado (sin favorito claro)'
    : `Favorito GoalLogic: ${favNombre}`;

  return {
    veredicto: {
      local: probs.local,
      empate: probs.empate,
      visitante: probs.visitante,
      localPct: pct(probs.local),
      empatePct: pct(probs.empate),
      visitantePct: pct(probs.visitante),
      favoritoSide: isClose ? 'equilibrado' : favorite.side,
      favoritoNombre: isClose ? null : favorite.nombre,
      favoritoLabel,
    },
    porQue,
    lesiones,
    cautelas,
  };
}
