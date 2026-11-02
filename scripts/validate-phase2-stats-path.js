/**
 * Valida corrección ruta Fase 2 → calculateFinalGoalLogicProbabilities
 * Ejecutar desde raíz: node scripts/validate-phase2-stats-path.js
 */
import { calculateFinalGoalLogicProbabilities } from '../frontend/src/utils/calculateGoalLogicProbability.js';

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

function diffReport(a, b) {
  return {
    local: Math.abs(a.local - b.local) * 100,
    empate: Math.abs(a.empate - b.empate) * 100,
    visitante: Math.abs(a.visitante - b.visitante) * 100,
  };
}

function makeEquipo(id, promGoles, xGEstimated, ultimos, apiStats) {
  return {
    id,
    promedioGolesFavor: promGoles,
    promedioGolesContra: 1.1,
    ultimosPartidos: ultimos,
    estadisticasOfensivas: {
      xG: xGEstimated,
      tirosAlArcoPromedio: 4.5,
      posesion: 50,
    },
  };
}

function ultimos(gf, gc, results) {
  return results.map((r, i) => ({
    golesFavor: gf[i] ?? gf[0],
    golesContra: gc[i] ?? gc[0],
    resultado: r,
  }));
}

function phase2Payload(equipoAStats, equipoBStats) {
  return {
    estadisticasLocalVisitante: {
      equipoA: { estadisticas: equipoAStats },
      equipoB: { estadisticas: equipoBStats },
    },
  };
}

function apiStats(id, played, xGPerGame, possession, shotsOnPerGame, home, away) {
  return {
    team: { id },
    fixtures: { played: { total: played }, home, away },
    goals: { expected: { for: { total: xGPerGame * played } } },
    shots: { on: { total: shotsOnPerGame * played } },
    possession,
  };
}

/** Simula lectura pre-fix (solo ruta anidada bajo estadisticas). */
function legacyNestedOnlyPayload(block) {
  return { estadisticas: { estadisticasLocalVisitante: block } };
}

const scenarios = [
  {
    label: 'Favorito local vs visitante débil',
    local: makeEquipo(
      541,
      2.1,
      2.21,
      ultimos([2, 3, 1, 2, 2], [0, 1, 1, 0, 1], ['G', 'G', 'E', 'G', 'G'])
    ),
    visitante: makeEquipo(
      728,
      0.9,
      0.95,
      ultimos([0, 1, 0, 1, 0], [2, 1, 3, 1, 2], ['P', 'E', 'P', 'E', 'P'])
    ),
    statsA: apiStats(
      541,
      15,
      2.45,
      58,
      5.2,
      { played: { total: 8 }, goals: { for: { total: 18 }, against: { total: 6 } }, wins: { total: 6 } },
      { played: { total: 7 }, goals: { for: { total: 12 }, against: { total: 10 } }, wins: { total: 3 } }
    ),
    statsB: apiStats(
      728,
      15,
      0.72,
      44,
      3.1,
      { played: { total: 7 }, goals: { for: { total: 8 }, against: { total: 12 } }, wins: { total: 2 } },
      { played: { total: 8 }, goals: { for: { total: 6 }, against: { total: 14 } }, wins: { total: 1 } }
    ),
  },
  {
    label: 'Encuentro equilibrado',
    local: makeEquipo(
      100,
      1.5,
      1.58,
      ultimos([1, 2, 1, 1, 2], [1, 1, 2, 0, 1], ['E', 'G', 'E', 'G', 'G'])
    ),
    visitante: makeEquipo(
      101,
      1.45,
      1.52,
      ultimos([2, 0, 1, 1, 1], [1, 2, 1, 2, 0], ['G', 'P', 'E', 'E', 'E'])
    ),
    statsA: apiStats(
      100,
      14,
      1.52,
      50,
      4.6,
      { played: { total: 7 }, goals: { for: { total: 11 }, against: { total: 9 } }, wins: { total: 3 } },
      { played: { total: 7 }, goals: { for: { total: 10 }, against: { total: 11 } }, wins: { total: 2 } }
    ),
    statsB: apiStats(
      101,
      14,
      1.48,
      49,
      4.4,
      { played: { total: 7 }, goals: { for: { total: 10 }, against: { total: 10 } }, wins: { total: 3 } },
      { played: { total: 7 }, goals: { for: { total: 10 }, against: { total: 11 } }, wins: { total: 3 } }
    ),
  },
  {
    label: 'Local con xG API bajo vs detalle ×1.05 alto',
    local: makeEquipo(
      200,
      2.0,
      2.1,
      ultimos([3, 2, 2, 1, 2], [1, 0, 1, 1, 0], ['G', 'G', 'G', 'G', 'E'])
    ),
    visitante: makeEquipo(
      201,
      1.3,
      1.37,
      ultimos([1, 1, 2, 0, 1], [1, 2, 1, 1, 2], ['E', 'E', 'G', 'P', 'E'])
    ),
    statsA: apiStats(
      200,
      12,
      1.25,
      54,
      4.8,
      { played: { total: 6 }, goals: { for: { total: 14 }, against: { total: 5 } }, wins: { total: 5 } },
      { played: { total: 6 }, goals: { for: { total: 8 }, against: { total: 7 } }, wins: { total: 2 } }
    ),
    statsB: apiStats(
      201,
      12,
      1.55,
      51,
      4.2,
      { played: { total: 6 }, goals: { for: { total: 7 }, against: { total: 6 } }, wins: { total: 2 } },
      { played: { total: 6 }, goals: { for: { total: 8 }, against: { total: 7 } }, wins: { total: 2 } }
    ),
  },
];

console.log('=== Validación ruta Fase 2 (módulo real calculateFinalGoalLogicProbabilities) ===\n');
console.log(
  'Antes del fix: payload Fase 2 en raíz no se leía → mismo resultado que sin datosAdicionales.\n'
);

for (const sc of scenarios) {
  const block = {
    equipoA: { estadisticas: sc.statsA },
    equipoB: { estadisticas: sc.statsB },
  };

  const sinFase2 = calculateFinalGoalLogicProbabilities(sc.local, sc.visitante, null);
  /** Pre-fix: Fase 2 en raíz existía pero el motor no la leía (equivalente a sin stats API). */
  const preFixConFase2Ignorada = sinFase2;
  const postFix = calculateFinalGoalLogicProbabilities(sc.local, sc.visitante, {
    estadisticasLocalVisitante: block,
  });
  const legacyNested = calculateFinalGoalLogicProbabilities(
    sc.local,
    sc.visitante,
    legacyNestedOnlyPayload(block)
  );

  const d = diffReport(preFixConFase2Ignorada, postFix);
  const samePath = diffReport(postFix, legacyNested);

  console.log(`--- ${sc.label} ---`);
  console.log('Pre-fix (Fase 2 descargada, ignorada):', pct(preFixConFase2Ignorada.local), pct(preFixConFase2Ignorada.empate), pct(preFixConFase2Ignorada.visitante));
  console.log('Post-fix (Fase 2 en raíz):             ', pct(postFix.local), pct(postFix.empate), pct(postFix.visitante));
  console.log('Ruta legacy anidada (compat):          ', pct(legacyNested.local), pct(legacyNested.empate), pct(legacyNested.visitante));
  console.log('Δ pre→post:                            ', `L ${d.local.toFixed(2)}pp`, `E ${d.empate.toFixed(2)}pp`, `V ${d.visitante.toFixed(2)}pp`);
  console.log('Δ post vs legacy anidada:              ', `L ${samePath.local.toFixed(2)}pp`, `E ${samePath.empate.toFixed(2)}pp`, `V ${samePath.visitante.toFixed(2)}pp`);
  console.log('');
}

console.log('Recálculo UI: ResumenEjecutivo invoca calculateFinalGoalLogicProbabilities en cada render;');
console.log('al completar setDatosAdicionales en Predicciones.jsx, probabilidades usan Fase 2 automáticamente.\n');
