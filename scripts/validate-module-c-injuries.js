/**
 * Validación Módulo C — impacto resumenImpacto.factor en 1X2
 * node scripts/validate-module-c-injuries.js
 */
import { calculateFinalGoalLogicProbabilities } from '../frontend/src/utils/calculateGoalLogicProbability.js';

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

function diff(a, b) {
  return {
    local: (b.local - a.local) * 100,
    empate: (b.empate - a.empate) * 100,
    visitante: (b.visitante - a.visitante) * 100,
  };
}

function makeEquipo(id, nombre) {
  const ultimos = [
    { golesFavor: 2, golesContra: 1, resultado: 'G' },
    { golesFavor: 1, golesContra: 1, resultado: 'E' },
    { golesFavor: 2, golesContra: 0, resultado: 'G' },
    { golesFavor: 1, golesContra: 2, resultado: 'P' },
    { golesFavor: 2, golesContra: 1, resultado: 'G' },
  ];
  return {
    id,
    nombre,
    promedioGolesFavor: 1.75,
    promedioGolesContra: 1.1,
    ultimosPartidos: ultimos,
    estadisticasOfensivas: { xG: 1.68, xGSource: 'estimated', tirosAlArcoPromedio: 4.5 },
    estadisticasDefensivas: { xGA: 1.16, xGASource: 'estimated' },
  };
}

function lesionesBlock(factorLocal = 1, factorVisitante = 1) {
  const bloque = (factor) => ({
    jugadores: factor < 1 ? [{ jugador: 'Test', impacto: 'alto' }] : [],
    resumenImpacto: { factor, nivel: factor < 0.5 ? 'alto' : 'bajo', etiqueta: 'test' },
  });
  return {
    lesiones: {
      equipoA: bloque(factorLocal),
      equipoB: bloque(factorVisitante),
    },
  };
}

const local = makeEquipo(1, 'Local');
const visitante = makeEquipo(2, 'Visitante');

const baseline = calculateFinalGoalLogicProbabilities(local, visitante, lesionesBlock(1, 1));
const unaAltaLocal = calculateFinalGoalLogicProbabilities(local, visitante, lesionesBlock(0.68, 1));
const dosAltasLocal = calculateFinalGoalLogicProbabilities(local, visitante, lesionesBlock(0.45, 1));
const visitanteGrave = calculateFinalGoalLogicProbabilities(local, visitante, lesionesBlock(1, 0.45));

console.log('=== Módulo C — lesiones vía resumenImpacto.factor (motor real) ===\n');
console.log('Equipos de referencia: mismos R/L/A; solo cambia C_LES del bando indicado.\n');

console.log('1) Sin bajas relevantes (factor 1 / 1):');
console.log('  ', pct(baseline.local), pct(baseline.empate), pct(baseline.visitante));

console.log('\n2) Local: 1 baja importante (factor 0,68 ≈ evaluateInjuryImpact 1× alto):');
console.log('  ', pct(unaAltaLocal.local), pct(unaAltaLocal.empate), pct(unaAltaLocal.visitante));
console.log('  Δ vs baseline:', diff(baseline, unaAltaLocal));

console.log('\n3) Local: varias bajas graves (factor 0,45 = techo penalización):');
console.log('  ', pct(dosAltasLocal.local), pct(dosAltasLocal.empate), pct(dosAltasLocal.visitante));
console.log('  Δ vs baseline:', diff(baseline, dosAltasLocal));

console.log('\n4) Visitante: factor 0,45 (local intacto):');
console.log('  ', pct(visitanteGrave.local), pct(visitanteGrave.empate), pct(visitanteGrave.visitante));
console.log('  Δ vs baseline:', diff(baseline, visitanteGrave));

console.log('\nNota: Tras Fase 2, datosAdicionales.lesiones alimenta el mismo factor en producción.');
