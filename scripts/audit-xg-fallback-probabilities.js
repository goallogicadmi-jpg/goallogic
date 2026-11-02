/**
 * Auditoría: impacto xG estimado vs real en calculateFinalGoalLogicProbabilities
 * Ejecutar: node scripts/audit-xg-fallback-probabilities.js
 */

function limitar(valor) {
  return Math.min(Math.max(valor, 0), 1);
}

function computeP(equipo, datosAdicionales, tipo) {
  const ultimos5 = (equipo.ultimosPartidos || []).slice(0, 5);
  let promedioGolesAnotados = 0;
  let promedioGolesRecibidos = 0;
  let sumaForma = 0;
  if (ultimos5.length > 0) {
    promedioGolesAnotados = ultimos5.reduce((s, p) => s + (p.golesFavor || 0), 0) / ultimos5.length;
    promedioGolesRecibidos = ultimos5.reduce((s, p) => s + (p.golesContra || 0), 0) / ultimos5.length;
    sumaForma = ultimos5.reduce((s, p) => {
      if (p.resultado === 'G') return s + 1;
      if (p.resultado === 'E') return s + 0.5;
      return s;
    }, 0);
  }

  const estadisticasLocalVisitante =
    datosAdicionales?.estadisticas?.estadisticasLocalVisitante ||
    datosAdicionales?.estadisticasLocalVisitante ||
    {};

  let esEquipoA = tipo === 'local';
  const equipoAId = estadisticasLocalVisitante.equipoA?.estadisticas?.team?.id;
  const equipoBId = estadisticasLocalVisitante.equipoB?.estadisticas?.team?.id;
  if (equipoAId && equipo.id === equipoAId) esEquipoA = true;
  else if (equipoBId && equipo.id === equipoBId) esEquipoA = false;

  const estadisticasEquipo = esEquipoA
    ? estadisticasLocalVisitante.equipoA?.estadisticas || {}
    : estadisticasLocalVisitante.equipoB?.estadisticas || {};

  const estadisticasLocal = estadisticasEquipo.fixtures?.home || {};
  const estadisticasVisitante = estadisticasEquipo.fixtures?.away || {};

  let golesLocalOVist = 0;
  let golesRecibLocalOVist = 0;
  let porcentajeVictorias = 0;

  if (tipo === 'local') {
    const gf = estadisticasLocal.goals?.for?.total || 0;
    const pl = estadisticasLocal.played?.total || 1;
    golesLocalOVist = pl > 0 ? gf / pl : equipo.promedioGolesFavor || 0;
    const gc = estadisticasLocal.goals?.against?.total || 0;
    golesRecibLocalOVist = pl > 0 ? gc / pl : equipo.promedioGolesContra || 0;
    const w = estadisticasLocal.wins?.total || 0;
    porcentajeVictorias = pl > 0 ? (w / pl) * 100 : 0;
  } else {
    const gf = estadisticasVisitante.goals?.for?.total || 0;
    const pl = estadisticasVisitante.played?.total || 1;
    golesLocalOVist = pl > 0 ? gf / pl : equipo.promedioGolesFavor || 0;
    const gc = estadisticasVisitante.goals?.against?.total || 0;
    golesRecibLocalOVist = pl > 0 ? gc / pl : equipo.promedioGolesContra || 0;
    const w = estadisticasVisitante.wins?.total || 0;
    porcentajeVictorias = pl > 0 ? (w / pl) * 100 : 0;
  }

  const posesion = estadisticasEquipo.possession || equipo.estadisticasOfensivas?.posesion || 50;
  const tirosAlArcoTotal = estadisticasEquipo.shots?.on?.total || 0;
  const partidosTotales = estadisticasEquipo.fixtures?.played?.total || equipo.ultimosPartidos?.length || 1;
  const tirosPuerta =
    partidosTotales > 0
      ? tirosAlArcoTotal / partidosTotales
      : equipo.estadisticasOfensivas?.tirosAlArcoPromedio || 4;

  const xGTotal = estadisticasEquipo.goals?.expected?.for?.total ?? null;
  const xG =
    xGTotal !== null && xGTotal !== undefined && partidosTotales > 0
      ? xGTotal / partidosTotales
      : equipo.estadisticasOfensivas?.xG ?? null;

  const R =
    (limitar(promedioGolesAnotados / 4) +
      limitar(1 - promedioGolesRecibidos / 4) +
      limitar(sumaForma / 5)) /
    3;
  const L =
    (limitar(golesLocalOVist / 4) +
      limitar(1 - golesRecibLocalOVist / 4) +
      limitar(porcentajeVictorias / 100)) /
    3;

  const A_POS = limitar(posesion / 100);
  const A_SHOTS = limitar(tirosPuerta / 10);
  let A;
  if (xG !== null && xG !== undefined) {
    A = (A_POS + A_SHOTS + limitar(xG / 3)) / 3;
  } else {
    A = (A_POS + A_SHOTS) / 2;
  }

  const C = (1 + limitar(3 / 7) + limitar(3 / 5)) / 3;
  return limitar(R * 0.4 + L * 0.25 + A * 0.25 + C * 0.1);
}

function finalProbs(local, visitante, datosAdicionales) {
  const P_local = computeP(local, datosAdicionales, 'local');
  const P_visitante = computeP(visitante, datosAdicionales, 'visitante');
  const DIF = Math.abs(P_local - P_visitante);
  let P_empate = Math.max(0.15, Math.min(0.25 - DIF * 0.2, 0.3));
  const S = P_local + P_visitante;
  let probLocal = (P_local / S) * (1 - P_empate);
  let probVisitante = (P_visitante / S) * (1 - P_empate);
  const total = probLocal + probVisitante + P_empate;
  return {
    local: probLocal / total,
    empate: P_empate / total,
    visitante: probVisitante / total,
    P_local_raw: P_local,
    P_visitante_raw: P_visitante,
  };
}

function makeEquipo(id, nombre, promGoles, xGEstimated, xGRealPerGame, ultimos, statsExtras = {}) {
  const played = statsExtras.playedTotal || 15;
  const xGTotal = xGRealPerGame * played;
  return {
    id,
    nombre,
    promedioGolesFavor: promGoles,
    promedioGolesContra: statsExtras.promContra ?? 1.1,
    ultimosPartidos: ultimos,
    estadisticasOfensivas: {
      xG: xGEstimated,
      xGSource: 'estimated',
      tirosAlArcoPromedio: statsExtras.tiros ?? 4.5,
      posesion: statsExtras.posesion,
    },
    _apiStats: {
      team: { id },
      fixtures: { played: { total: played }, home: statsExtras.homeFixtures, away: statsExtras.awayFixtures },
      goals: { expected: { for: { total: xGTotal } } },
      shots: { on: { total: (statsExtras.tiros ?? 4.5) * played } },
      possession: statsExtras.posesion ?? 52,
    },
  };
}

function ultimosDefault(gf, gc, results) {
  return results.map((r, i) => ({
    golesFavor: gf[i] ?? gf[0],
    golesContra: gc[i] ?? gc[0],
    resultado: r,
  }));
}

function wrapDatosAdicionales(equipoA, equipoB, useBrokenPath) {
  const block = {
    equipoA: { estadisticas: equipoA._apiStats },
    equipoB: { estadisticas: equipoB._apiStats },
  };
  if (useBrokenPath) {
    return { estadisticas: { estadisticasLocalVisitante: block } };
  }
  return { estadisticasLocalVisitante: block };
}

function pct(x) {
  return (x * 100).toFixed(2) + '%';
}

function diffReport(a, b) {
  return {
    local: Math.abs(a.local - b.local) * 100,
    empate: Math.abs(a.empate - b.empate) * 100,
    visitante: Math.abs(a.visitante - b.visitante) * 100,
  };
}

const scenarios = [
  {
    name: 'Favorito claro vs débil (La Liga tipo)',
    local: makeEquipo(1, 'Local', 2.1, 2.21, 2.45, ultimosDefault([2, 3, 1, 2, 2], [0, 1, 1, 0, 1], ['G', 'G', 'E', 'G', 'G']), {
      homeFixtures: { played: { total: 8 }, goals: { for: { total: 18 }, against: { total: 6 } }, wins: { total: 6 } },
      posesion: 58,
      tiros: 5.2,
    }),
    visitante: makeEquipo(2, 'Visitante', 0.9, 0.95, 0.72, ultimosDefault([0, 1, 0, 1, 0], [2, 1, 3, 1, 2], ['P', 'E', 'P', 'E', 'P']), {
      awayFixtures: { played: { total: 8 }, goals: { for: { total: 6 }, against: { total: 14 } }, wins: { total: 1 } },
      posesion: 44,
      tiros: 3.1,
    }),
  },
  {
    name: 'Partido equilibrado (xG real ≈ estimado)',
    local: makeEquipo(10, 'A', 1.5, 1.58, 1.52, ultimosDefault([1, 2, 1, 1, 2], [1, 1, 2, 0, 1], ['E', 'G', 'E', 'G', 'G']), {
      homeFixtures: { played: { total: 10 }, goals: { for: { total: 16 }, against: { total: 12 } }, wins: { total: 4 } },
      posesion: 50,
    }),
    visitante: makeEquipo(11, 'B', 1.45, 1.52, 1.48, ultimosDefault([2, 0, 1, 1, 1], [1, 2, 1, 2, 0], ['G', 'P', 'E', 'E', 'E']), {
      awayFixtures: { played: { total: 10 }, goals: { for: { total: 14 }, against: { total: 13 } }, wins: { total: 4 } },
      posesion: 49,
    }),
  },
  {
    name: 'Ataque sobreperform vs xG bajo (estimado alto, real bajo)',
    local: makeEquipo(20, 'Local', 2.0, 2.1, 1.25, ultimosDefault([3, 2, 2, 1, 2], [1, 0, 1, 1, 0], ['G', 'G', 'G', 'G', 'E']), {
      homeFixtures: { played: { total: 9 }, goals: { for: { total: 17 }, against: { total: 8 } }, wins: { total: 6 } },
      posesion: 54,
    }),
    visitante: makeEquipo(21, 'Visit', 1.3, 1.37, 1.55, ultimosDefault([1, 1, 2, 0, 1], [1, 2, 1, 1, 2], ['E', 'E', 'G', 'P', 'E']), {
      awayFixtures: { played: { total: 9 }, goals: { for: { total: 11 }, against: { total: 10 } }, wins: { total: 3 } },
      posesion: 51,
    }),
  },
];

console.log('=== Auditoría xG fallback — modelo cliente Predicciones (Visión Estratégica) ===\n');
console.log('Peso xG en P_equipo: módulo A = 25% del total; xG es 1/3 de A cuando existe → ~8.33% del score bruto.\n');

for (const sc of scenarios) {
  const { local, visitante } = sc;

  const currentProdPath = wrapDatosAdicionales(local, visitante, true);
  const brokenAsInUI = {};

  const withEstOnly = finalProbs(local, visitante, brokenAsInUI);

  const withEstDetalle = finalProbs(local, visitante, currentProdPath);

  const localReal = { ...local, estadisticasOfensivas: { ...local.estadisticasOfensivas, xG: null } };
  const visitReal = { ...visitante, estadisticasOfensivas: { ...visitante.estadisticasOfensivas, xG: null } };
  const fixedPathRealXg = wrapDatosAdicionales(local, visitante, false);
  const withRealApi = finalProbs(localReal, visitReal, fixedPathRealXg);

  const localWrongPath = finalProbs(local, visitante, { estadisticasLocalVisitante: currentProdPath.estadisticas.estadisticasLocalVisitante });

  console.log(`--- ${sc.name} ---`);
  console.log('A) Producción actual (sin stats fase 2 en ruta):', pct(withEstOnly.local), pct(withEstOnly.empate), pct(withEstOnly.visitante));
  console.log('B) Ruta anidada correcta + xG detalle estimado:', pct(withEstDetalle.local), pct(withEstDetalle.empate), pct(withEstDetalle.visitante));
  console.log('C) Ruta fase 2 correcta + xG API real (sin xG detalle):', pct(withRealApi.local), pct(withRealApi.empate), pct(withRealApi.visitante));
  console.log('D) Bug ruta plana (estadisticasLocalVisitante en raíz):', pct(localWrongPath.local), pct(localWrongPath.empate), pct(localWrongPath.visitante));

  const dBC = diffReport(withEstDetalle, withRealApi);
  const dAB = diffReport(withEstOnly, withEstDetalle);
  console.log('Δ |B−C| (estimado vs API real, ruta OK):', `L ${dBC.local.toFixed(2)}pp`, `E ${dBC.empate.toFixed(2)}pp`, `V ${dBC.visitante.toFixed(2)}pp`);
  console.log('Δ |A−B| (sin stats vs stats+estimado):', `L ${dAB.local.toFixed(2)}pp`, `E ${dAB.empate.toFixed(2)}pp`, `V ${dAB.visitante.toFixed(2)}pp`);
  console.log('');
}

console.log('=== Solo xG: estimado (×1.05) vs API real — mismos inputs en L/R/C ===');
{
  const promL = 2.0;
  const promV = 1.3;
  const xgEstL = +(promL * 1.05).toFixed(2);
  const xgEstV = +(promV * 1.05).toFixed(2);
  const xgRealL = 1.25;
  const xgRealV = 1.55;
  const ultL = ultimosDefault([3, 2, 2, 1, 2], [1, 0, 1, 1, 0], ['G', 'G', 'G', 'G', 'E']);
  const ultV = ultimosDefault([1, 1, 2, 0, 1], [1, 2, 1, 1, 2], ['E', 'E', 'G', 'P', 'E']);

  const mk = (prom, xg, id) => ({
    id,
    promedioGolesFavor: prom,
    promedioGolesContra: 1.1,
    ultimosPartidos: id === 1 ? ultL : ultV,
    estadisticasOfensivas: { xG: xg, tirosAlArcoPromedio: 4.5 },
  });

  const est = finalProbs(mk(promL, xgEstL, 1), mk(promV, xgEstV, 2), {});
  const real = finalProbs(mk(promL, xgRealL, 1), mk(promV, xgRealV, 2), {});
  const d = diffReport(est, real);
  console.log(`Estimado L xG=${xgEstL} V xG=${xgEstV}:`, pct(est.local), pct(est.empate), pct(est.visitante));
  console.log(`Real     L xG=${xgRealL} V xG=${xgRealV}:`, pct(real.local), pct(real.empate), pct(real.visitante));
  console.log('Δ pp:', `L ${d.local.toFixed(2)}`, `E ${d.empate.toFixed(2)}`, `V ${d.visitante.toFixed(2)}`);
}

console.log('\n=== Sensibilidad: solo cambiar xG en módulo A (equipo local, resto fijo) ===');
const base = scenarios[0].local;
const visit = scenarios[0].visitante;
const datos = {};
for (const xg of [0.7, 1.0, 1.37, 1.58, 2.1, 2.21, 2.45, 3.0]) {
  const eq = {
    ...base,
    estadisticasOfensivas: { ...base.estadisticasOfensivas, xG: xg },
  };
  const p = finalProbs(eq, visit, datos);
  console.log(`xG=${xg.toFixed(2)} → P_local_norm ${pct(p.local)} (raw ${p.P_local_raw.toFixed(4)})`);
}
