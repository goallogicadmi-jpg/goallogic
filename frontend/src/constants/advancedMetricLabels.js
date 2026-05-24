import { tokens } from '../styles/tokens';

/**
 * Etiquetas de métricas: nombre técnico → nombre entendible para el usuario.
 * Fuente única para toda la plataforma.
 */
export const ADVANCED_METRIC_LABELS = {
  xGPromedio: 'Ataque: Promedio de Ocasiones Generadas',
  xGAPromedio: 'Defensa: Promedio de Ocasiones Concedidas',
  cleanSheets: 'Defensa: Arco en Cero',
  over25: 'Ritmo de Goles del Equipo',
  xGLocal: 'Ataque: Promedio de Ocasiones Generadas (Local)',
  xGVisitante: 'Ataque: Promedio de Ocasiones Generadas (Visitante)',
  xGALocal: 'Defensa: Promedio de Ocasiones Concedidas (Local)',
  xGAVisitante: 'Defensa: Promedio de Ocasiones Concedidas (Visitante)',
};

/** Clase CSS global para títulos de métricas avanzadas */
export const ADVANCED_METRIC_LABEL_CLASS = 'advanced-metric-label';

/** Variante compacta (módulo Predicciones, filas de KPIs) */
export const ADVANCED_METRIC_LABEL_CLASS_COMPACT = 'advanced-metric-label--compact';

/** Mapeo de etiquetas antiguas → nombres completos */
export const LEGACY_ADVANCED_METRIC_LABELS = {
  'xG Promedio': ADVANCED_METRIC_LABELS.xGPromedio,
  'xGA Promedio': ADVANCED_METRIC_LABELS.xGAPromedio,
  'Clean Sheets': ADVANCED_METRIC_LABELS.cleanSheets,
  'Over 2.5': ADVANCED_METRIC_LABELS.over25,
  'Over 2.5 Promedio': ADVANCED_METRIC_LABELS.over25,
  'Portería a Cero': ADVANCED_METRIC_LABELS.cleanSheets,
  'xG Local': ADVANCED_METRIC_LABELS.xGLocal,
  'xG Visitante': ADVANCED_METRIC_LABELS.xGVisitante,
  'xGA Local': ADVANCED_METRIC_LABELS.xGALocal,
  'xGA Visitante': ADVANCED_METRIC_LABELS.xGAVisitante,
};

export function resolveAdvancedMetricLabel(label) {
  if (!label) return label;
  return LEGACY_ADVANCED_METRIC_LABELS[label] || label;
}

/** Estilo compartido: títulos visibles en fondos oscuros */
export const ADVANCED_METRIC_LABEL_STYLE = {
  fontSize: tokens.typography.fontSizeMd,
  color: 'rgba(255, 255, 255, 0.94)',
  fontWeight: tokens.typography.fontWeightMedium,
  lineHeight: 1.45,
  marginBottom: tokens.spacing.xs,
  display: 'block',
  letterSpacing: '0.01em',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

const ADVANCED_METRIC_LABEL_STYLE_LIGHT = {
  ...ADVANCED_METRIC_LABEL_STYLE,
  fontSize: tokens.typography.fontSizeSm,
  color: '#475569',
};

/** Estilo equilibrado para grillas en una sola fila (Predicciones) */
export const ADVANCED_METRIC_LABEL_STYLE_COMPACT = {
  fontSize: tokens.typography.fontSizeSm,
  color: 'rgba(255, 255, 255, 0.92)',
  fontWeight: tokens.typography.fontWeightMedium,
  lineHeight: 1.35,
  marginBottom: tokens.spacing.xs,
  display: 'block',
  letterSpacing: '0.01em',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
};

const ADVANCED_METRIC_LABEL_STYLE_COMPACT_LIGHT = {
  ...ADVANCED_METRIC_LABEL_STYLE_COMPACT,
  color: '#64748b',
};

/**
 * @param {object} [overrides]
 * @param {'dark'|'light'} [theme]
 * @param {'default'|'compact'} [variant]
 */
export function getAdvancedMetricLabelStyle(overrides = {}, theme = 'dark', variant = 'default') {
  let base;
  if (variant === 'compact') {
    base = theme === 'light' ? ADVANCED_METRIC_LABEL_STYLE_COMPACT_LIGHT : ADVANCED_METRIC_LABEL_STYLE_COMPACT;
  } else {
    base = theme === 'light' ? ADVANCED_METRIC_LABEL_STYLE_LIGHT : ADVANCED_METRIC_LABEL_STYLE;
  }
  return { ...base, ...overrides };
}
