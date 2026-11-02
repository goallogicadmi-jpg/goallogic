import { ADVANCED_METRIC_LABELS } from '../constants/advancedMetricLabels';

/**
 * Etiqueta de métrica xG con indicador de estimación.
 */
export function formatXgLabel(baseLabel, source) {
  if (source === 'estimated') {
    return `${baseLabel} (estimado)`;
  }
  return baseLabel;
}

export function formatXgPromedioLabel(source) {
  return formatXgLabel(ADVANCED_METRIC_LABELS.xGPromedio, source);
}

export function formatXgaPromedioLabel(source) {
  return formatXgLabel(ADVANCED_METRIC_LABELS.xGAPromedio, source);
}

/**
 * Valor xG para mostrar (backend debería enviarlo; fallback cliente por compatibilidad).
 */
export function resolveDisplayXg(equipo) {
  const off = equipo?.estadisticasOfensivas;
  if (off?.xG != null && off?.xG !== undefined) {
    return { value: off.xG, source: off.xGSource || 'api' };
  }
  const prom = Number(equipo?.promedioGolesFavor);
  if (Number.isFinite(prom) && prom > 0) {
    return { value: parseFloat((prom * 1.05).toFixed(2)), source: 'estimated' };
  }
  return { value: null, source: null };
}

export function resolveDisplayXga(equipo) {
  const def = equipo?.estadisticasDefensivas;
  if (def?.xGA != null && def?.xGA !== undefined) {
    return { value: def.xGA, source: def.xGASource || 'api' };
  }
  const prom = Number(equipo?.promedioGolesContra);
  if (Number.isFinite(prom) && prom > 0) {
    return { value: parseFloat((prom * 1.05).toFixed(2)), source: 'estimated' };
  }
  return { value: null, source: null };
}

/** Eficiencia solo cuando xG/xGA provienen de API (no estimación goles × 1.05). */
export function isApiSourcedXgMetric(source) {
  return source === 'api';
}

/**
 * (goles / xG) × 100 — misma fórmula; null si xG no es de API.
 * @returns {string|null} porcentaje con 1 decimal
 */
export function resolveOffensiveEfficiencyPercent(equipo, xgDisplay) {
  if (!isApiSourcedXgMetric(xgDisplay?.source)) return null;
  const xG = xgDisplay?.value;
  if (xG == null || xG === 0) return null;
  const goles = Number(equipo?.promedioGolesFavor);
  if (!Number.isFinite(goles)) return null;
  return ((goles / xG) * 100).toFixed(1);
}

/**
 * (goles recibidos / xGA) × 100 — misma fórmula; null si xGA no es de API.
 * @returns {string|null} porcentaje con 1 decimal
 */
export function resolveDefensiveEfficiencyPercent(equipo, xgaDisplay) {
  if (!isApiSourcedXgMetric(xgaDisplay?.source)) return null;
  const xGA = xgaDisplay?.value;
  if (xGA == null || xGA === 0) return null;
  const golesRecibidos = Number(equipo?.promedioGolesContra);
  if (!Number.isFinite(golesRecibidos)) return null;
  return ((golesRecibidos / xGA) * 100).toFixed(1);
}

export function formatEfficiencyDisplay(percentOneDecimal) {
  if (percentOneDecimal == null) return 'N/D';
  return `${percentOneDecimal}%`;
}
