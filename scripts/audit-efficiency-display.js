/**
 * Ejemplos panel ofensivo/defensivo — eficiencia solo con xG/xGA API
 * node scripts/audit-efficiency-display.js
 */

function resolveDisplayXg(equipo) {
  const off = equipo?.estadisticasOfensivas;
  if (off?.xG != null) return { value: off.xG, source: off.xGSource || 'api' };
  const prom = Number(equipo?.promedioGolesFavor);
  if (Number.isFinite(prom) && prom > 0) {
    return { value: parseFloat((prom * 1.05).toFixed(2)), source: 'estimated' };
  }
  return { value: null, source: null };
}

function resolveDisplayXga(equipo) {
  const def = equipo?.estadisticasDefensivas;
  if (def?.xGA != null) return { value: def.xGA, source: def.xGASource || 'api' };
  const prom = Number(equipo?.promedioGolesContra);
  if (Number.isFinite(prom) && prom > 0) {
    return { value: parseFloat((prom * 1.05).toFixed(2)), source: 'estimated' };
  }
  return { value: null, source: null };
}

function resolveOffensiveEfficiencyPercent(equipo, xgDisplay) {
  if (xgDisplay?.source !== 'api') return null;
  const xG = xgDisplay?.value;
  if (xG == null || xG === 0) return null;
  const goles = Number(equipo?.promedioGolesFavor);
  if (!Number.isFinite(goles)) return null;
  return ((goles / xG) * 100).toFixed(1);
}

function resolveDefensiveEfficiencyPercent(equipo, xgaDisplay) {
  if (xgaDisplay?.source !== 'api') return null;
  const xGA = xgaDisplay?.value;
  if (xGA == null || xGA === 0) return null;
  const golesRecibidos = Number(equipo?.promedioGolesContra);
  if (!Number.isFinite(golesRecibidos)) return null;
  return ((golesRecibidos / xGA) * 100).toFixed(1);
}

function formatEfficiencyDisplay(p) {
  return p == null ? 'N/D' : `${p}%`;
}

function row(equipo) {
  const xg = resolveDisplayXg(equipo);
  const xga = resolveDisplayXga(equipo);
  const effOff = resolveOffensiveEfficiencyPercent(equipo, xg);
  const effDef = resolveDefensiveEfficiencyPercent(equipo, xga);
  const oldOff =
    xg.value > 0 ? (((equipo.promedioGolesFavor || 0) / xg.value) * 100).toFixed(1) + '%' : 'N/D';
  const oldDef =
    xga.value > 0
      ? (((equipo.promedioGolesContra || 0) / xga.value) * 100).toFixed(1) + '%'
      : 'N/D';

  return {
    nombre: equipo.nombre,
    goles: equipo.promedioGolesFavor?.toFixed(2),
    xG: xg.value?.toFixed(2),
    xGSource: xg.source,
    effOffAntes: oldOff,
    effOffAhora: formatEfficiencyDisplay(effOff),
    golesRec: equipo.promedioGolesContra?.toFixed(2),
    xGA: xga.value?.toFixed(2),
    xGASource: xga.source,
    effDefAntes: oldDef,
    effDefAhora: formatEfficiencyDisplay(effDef),
  };
}

const casos = [
  {
    titulo: 'Caso típico /detalle (promedio goles → xG estimado ×1.05)',
    equipo: {
      nombre: 'Equipo Liga (detalle)',
      promedioGolesFavor: 1.5,
      promedioGolesContra: 1.2,
      estadisticasOfensivas: { xG: 1.58, xGSource: 'estimated' },
      estadisticasDefensivas: { xGA: 1.26, xGASource: 'estimated' },
    },
  },
  {
    titulo: 'xG/xGA desde fixtures API (sin estimación goles)',
    equipo: {
      nombre: 'Equipo sin promedios útiles',
      promedioGolesFavor: 2.0,
      promedioGolesContra: 0.9,
      estadisticasOfensivas: { xG: 1.85, xGSource: 'api' },
      estadisticasDefensivas: { xGA: 1.1, xGASource: 'api' },
    },
  },
  {
    titulo: 'Mixto: xG API real, xGA estimado',
    equipo: {
      nombre: 'Ataque medido / defensa estimada',
      promedioGolesFavor: 1.8,
      promedioGolesContra: 1.0,
      estadisticasOfensivas: { xG: 1.72, xGSource: 'api' },
      estadisticasDefensivas: { xGA: 1.05, xGASource: 'estimated' },
    },
  },
  {
    titulo: 'Solo fallback cliente (sin bloque estadísticas)',
    equipo: {
      nombre: 'Payload mínimo',
      promedioGolesFavor: 2.1,
      promedioGolesContra: 1.4,
    },
  },
  {
    titulo: 'Finalizador eficiente (API)',
    equipo: {
      nombre: 'Sobreperform real',
      promedioGolesFavor: 2.4,
      promedioGolesContra: 1.0,
      estadisticasOfensivas: { xG: 1.9, xGSource: 'api' },
      estadisticasDefensivas: { xGA: 1.35, xGASource: 'api' },
    },
  },
];

console.log('=== Eficiencia ofensiva/defensiva — Predicciones (ComparacionConTabs) ===\n');

for (const c of casos) {
  const r = row(c.equipo);
  console.log(`--- ${c.titulo} ---`);
  console.log(`  ${r.nombre}`);
  console.log(`  Ofensivo: goles ${r.goles} | xG ${r.xG} (${r.xGSource})`);
  console.log(`    Eficiencia antes: ${r.effOffAntes} → ahora: ${r.effOffAhora}`);
  console.log(`  Defensivo: recibidos ${r.golesRec} | xGA ${r.xGA} (${r.xGASource})`);
  console.log(`    Eficiencia antes: ${r.effDefAntes} → ahora: ${r.effDefAhora}`);
  console.log('');
}

console.log(
  'Nota: /api/equipos/detalle suele marcar xGSource/xGASource = estimated cuando hay promedios de goles;'
);
console.log('en análisis habituales verás N/D en eficiencia y el resto de métricas sin cambios.\n');
