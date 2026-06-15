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
