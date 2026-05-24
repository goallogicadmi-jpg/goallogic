import React, { useState } from 'react';
import tokens from '../../styles/tokens';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';

/**
 * Componente de Transparencia Completa de Predicciones
 * Muestra información detallada sobre el origen de datos y métodos usados
 */
function PrediccionTransparency({ 
  metricas_avanzadas, 
  prediction, 
  profile 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!metricas_avanzadas && !prediction) {
    return null;
  }

  const styles = {
    container: {
      marginTop: tokens.spacing.md,
      padding: tokens.spacing.md,
      backgroundColor: tokens.colors.bgSecondary,
      borderRadius: tokens.radius.md,
      border: `1px solid ${tokens.colors.borderDefault}`,
      fontSize: tokens.typography.fontSizeSm
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      cursor: 'pointer',
      userSelect: 'none'
    },
    title: {
      fontSize: tokens.typography.fontSizeBase,
      fontWeight: tokens.typography.fontWeightSemiBold,
      color: tokens.colors.textPrimary,
      margin: 0
    },
    toggleButton: {
      fontSize: tokens.typography.fontSizeLg,
      color: tokens.colors.accentInfo,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: tokens.spacing.xs
    },
    content: {
      marginTop: tokens.spacing.md,
      display: isExpanded ? 'block' : 'none'
    },
    section: {
      marginBottom: tokens.spacing.md
    },
    sectionTitle: {
      fontSize: tokens.typography.fontSizeBase,
      fontWeight: tokens.typography.fontWeightSemiBold,
      color: tokens.colors.textPrimary,
      marginBottom: tokens.spacing.sm
    },
    dataItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: tokens.spacing.xs,
      marginBottom: tokens.spacing.xs,
      backgroundColor: tokens.colors.bgTertiary,
      borderRadius: tokens.radius.sm
    },
    dataLabel: {
      color: tokens.colors.textSecondary,
      fontWeight: tokens.typography.fontWeightMedium
    },
    dataValue: {
      color: tokens.colors.textPrimary
    },
    badge: {
      display: 'inline-block',
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      borderRadius: tokens.radius.sm,
      fontSize: tokens.typography.fontSizeXs,
      fontWeight: tokens.typography.fontWeightMedium,
      marginLeft: tokens.spacing.xs
    },
    badgeApi: {
      backgroundColor: tokens.colors.accentPositive + '20',
      color: tokens.colors.accentPositive
    },
    badgeCalculated: {
      backgroundColor: tokens.colors.accentInfo + '20',
      color: tokens.colors.accentInfo
    },
    badgeEstimated: {
      backgroundColor: tokens.colors.accentWarning + '20',
      color: tokens.colors.accentWarning
    },
    explanation: {
      marginTop: tokens.spacing.sm,
      padding: tokens.spacing.sm,
      backgroundColor: tokens.colors.bgTertiary,
      borderRadius: tokens.radius.sm,
      fontSize: tokens.typography.fontSizeXs,
      color: tokens.colors.textMuted,
      fontStyle: 'italic'
    }
  };

  const getDataSource = (value, source) => {
    if (source === 'api') {
      return { label: 'Mercado', badge: 'badgeApi' };
    } else if (source === 'estimated') {
      return { label: 'Estimado', badge: 'badgeEstimated' };
    } else {
      return { label: 'Calculado', badge: 'badgeCalculated' };
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={() => setIsExpanded(!isExpanded)}>
        <h5 style={styles.title}>
          ℹ️ Detalles de la Predicción
        </h5>
        <button style={styles.toggleButton}>
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div style={styles.content}>
          {/* Origen de Datos */}
          <div style={styles.section}>
            <h6 style={styles.sectionTitle}>Origen de Datos</h6>
            
            <div style={styles.dataItem}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={{ ...styles.dataLabel, ...getAdvancedMetricLabelStyle() }}>{ML.xGLocal}:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.xG_local?.toFixed(2) || 'N/A'}
                {metricas_avanzadas?.xgSource?.xG_local && (
                  <span style={{ ...styles.badge, ...styles[getDataSource(null, metricas_avanzadas.xgSource.xG_local).badge] }}>
                    {getDataSource(null, metricas_avanzadas.xgSource.xG_local).label}
                  </span>
                )}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={{ ...styles.dataLabel, ...getAdvancedMetricLabelStyle() }}>{ML.xGALocal}:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.xGA_local?.toFixed(2) || 'N/A'}
                {metricas_avanzadas?.xgSource?.xGA_local && (
                  <span style={{ ...styles.badge, ...styles[getDataSource(null, metricas_avanzadas.xgSource.xGA_local).badge] }}>
                    {getDataSource(null, metricas_avanzadas.xgSource.xGA_local).label}
                  </span>
                )}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={{ ...styles.dataLabel, ...getAdvancedMetricLabelStyle() }}>{ML.xGVisitante}:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.xG_visita?.toFixed(2) || 'N/A'}
                {metricas_avanzadas?.xgSource?.xG_visita && (
                  <span style={{ ...styles.badge, ...styles[getDataSource(null, metricas_avanzadas.xgSource.xG_visita).badge] }}>
                    {getDataSource(null, metricas_avanzadas.xgSource.xG_visita).label}
                  </span>
                )}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={{ ...styles.dataLabel, ...getAdvancedMetricLabelStyle() }}>{ML.xGAVisitante}:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.xGA_visita?.toFixed(2) || 'N/A'}
                {metricas_avanzadas?.xgSource?.xGA_visita && (
                  <span style={{ ...styles.badge, ...styles[getDataSource(null, metricas_avanzadas.xgSource.xGA_visita).badge] }}>
                    {getDataSource(null, metricas_avanzadas.xgSource.xGA_visita).label}
                  </span>
                )}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Forma Local:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.forma_local || 'N/A'}
                <span style={{ ...styles.badge, ...styles.badgeCalculated }}>Calculado</span>
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Forma Visitante:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.forma_visita || 'N/A'}
                <span style={{ ...styles.badge, ...styles.badgeCalculated }}>Calculado</span>
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Rendimiento Local:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.rendimiento_local?.toFixed(1) || 'N/A'}%
                <span style={{ ...styles.badge, ...styles.badgeCalculated }}>Calculado</span>
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Rendimiento Visitante:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.rendimiento_visita?.toFixed(1) || 'N/A'}%
                <span style={{ ...styles.badge, ...styles.badgeCalculated }}>Calculado</span>
              </span>
            </div>
          </div>

          {/* Métodos Usados */}
          <div style={styles.section}>
            <h6 style={styles.sectionTitle}>Métodos de Cálculo</h6>
            
            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Modelo Poisson:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.poisson_used ? '✅ Aplicado' : '❌ No aplicado'}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>xG Normalizado por Liga:</span>
              <span style={styles.dataValue}>
                {metricas_avanzadas?.xg_normalized ? '✅ Aplicado' : '❌ No aplicado'}
              </span>
            </div>

            <div style={styles.dataItem}>
              <span style={styles.dataLabel}>Perfil de Predicción:</span>
              <span style={styles.dataValue}>
                {profile || 'Balanceado'}
              </span>
            </div>
          </div>

          {/* Explicación de Cálculo */}
          <div style={styles.section}>
            <h6 style={styles.sectionTitle}>Cómo se Calculan las Probabilidades</h6>
            <div style={styles.explanation}>
              {metricas_avanzadas?.poisson_used ? (
                <>
                  <p><strong>Modelo Poisson (80% del peso):</strong></p>
                  <p>Se calcula la tasa de goles esperados (lambda) para cada equipo basándose en:</p>
                  <ul style={{ marginLeft: tokens.spacing.md, marginTop: tokens.spacing.xs }}>
                    <li>Promedio de goles a favor del equipo</li>
                    <li>Promedio de goles en contra del oponente</li>
                    <li>Ajuste por ventaja local</li>
                    <li>Ajuste por promedios de liga (si están disponibles)</li>
                  </ul>
                  <p style={{ marginTop: tokens.spacing.xs }}>
                    Luego se genera una matriz de probabilidades de marcador usando la distribución de Poisson,
                    y se calculan las probabilidades de victoria local, empate y victoria visitante.
                  </p>
                  <p style={{ marginTop: tokens.spacing.xs }}>
                    <strong>Factores Tradicionales (20% del peso):</strong>
                  </p>
                  <ul style={{ marginLeft: tokens.spacing.md, marginTop: tokens.spacing.xs }}>
                    <li>Forma reciente (últimos 5 partidos)</li>
                    <li>Ventaja local</li>
                    <li>xG/xGA normalizado</li>
                    <li>Rachas</li>
                    <li>Rendimiento histórico</li>
                    <li>Estadísticas base (win rate)</li>
                  </ul>
                  <p style={{ marginTop: tokens.spacing.xs }}>
                    Las probabilidades finales combinan ambos métodos según el perfil seleccionado.
                  </p>
                </>
              ) : (
                <p>
                  Las probabilidades se calculan usando factores tradicionales:
                  forma reciente, ventaja local, xG/xGA, rachas, rendimiento histórico y estadísticas base.
                  Los pesos de cada factor dependen del perfil seleccionado.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PrediccionTransparency;
