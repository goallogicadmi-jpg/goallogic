import React, { useState, useMemo, memo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { tokens } from '../../styles/tokens';
import { generarInsights } from '../../utils/generarInsights';

/**
 * PanelAnalisis - Panel expandible con visualizaciones avanzadas
 */
function PanelAnalisis({ metricas, variant = 'extended', fixtureId = null, onExportar = null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Transformar datos para gráficos
  const datosGraficos = useMemo(() => {
    if (!metricas) return null;

    // Datos para gráfico de barras (xG/xGA)
    const datosBarras = [
      {
        name: 'xG',
        Local: metricas.xG_local || 0,
        Visitante: metricas.xG_visita || 0,
      },
      {
        name: 'xGA',
        Local: metricas.xGA_local || 0,
        Visitante: metricas.xGA_visita || 0,
      },
    ];

    // Datos para gráfico de líneas (forma)
    const convertirForma = (formaStr) => {
      if (!formaStr || formaStr === 'N/A') return [];
      return formaStr.split('').map(char => {
        if (char === 'W') return 3;
        if (char === 'D') return 1;
        if (char === 'L') return 0;
        return null;
      }).filter(val => val !== null);
    };

    const formaLocal = convertirForma(metricas.forma_local);
    const formaVisita = convertirForma(metricas.forma_visita);
    const maxLength = Math.max(formaLocal.length, formaVisita.length);

    const datosLineas = Array.from({ length: maxLength }, (_, i) => ({
      partido: `P${i + 1}`,
      Local: formaLocal[i] !== undefined ? formaLocal[i] : null,
      Visitante: formaVisita[i] !== undefined ? formaVisita[i] : null,
    }));

    // Datos para gráfico radial (rendimiento)
    const datosRadial = [
      {
        name: 'Local',
        value: metricas.rendimiento_local || 0,
        fill: tokens.colors.accentOrange,
      },
      {
        name: 'Visitante',
        value: metricas.rendimiento_visita || 0,
        fill: tokens.colors.accentInfo,
      },
    ];

    return {
      barras: datosBarras,
      lineas: datosLineas,
      radial: datosRadial,
    };
  }, [metricas]);

  // Generar insights
  const insights = useMemo(() => {
    if (!metricas) return [];
    return generarInsights(metricas);
  }, [metricas]);

  // Configuración de colores para gráficos
  const chartColors = {
    local: tokens.colors.accentOrange,
    visita: tokens.colors.accentInfo,
    grid: tokens.colors.borderDefault,
    text: tokens.colors.textSecondary,
  };

  if (!metricas) return null;

  return (
    <div style={{ marginTop: tokens.spacing.md }}>
      {/* Botón para expandir/colapsar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: tokens.spacing.md,
          backgroundColor: tokens.colors.bgTertiary,
          border: `1px solid ${tokens.colors.borderDefault}`,
          borderRadius: tokens.radius.md,
          color: tokens.colors.textPrimary,
          fontSize: tokens.typography.fontSizeMd,
          fontWeight: tokens.typography.fontWeightSemibold,
          cursor: 'pointer',
          transition: `all ${tokens.transitions.normal}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
          e.currentTarget.style.borderColor = tokens.colors.borderHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
          e.currentTarget.style.borderColor = tokens.colors.borderDefault;
        }}
      >
        <span>📊 Ver análisis completo</span>
        <span style={{ 
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: `transform ${tokens.transitions.normal}`
        }}>
          ▼
        </span>
      </button>

      {/* Panel expandible con animación */}
      <div
        style={{
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
          transition: `max-height 300ms ease-in-out, opacity 250ms ease-in-out, margin-top 250ms ease-in-out`,
          marginTop: isExpanded ? tokens.spacing.md : '0',
        }}
      >
        <div
          style={{
            backgroundColor: tokens.colors.bgSecondary,
            border: `1px solid ${tokens.colors.borderDefault}`,
            borderRadius: tokens.radius.lg,
            padding: tokens.spacing.lg,
          }}
        >
          {/* Gráfico de Barras - xG/xGA */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <h5 style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              marginBottom: tokens.spacing.md,
            }}>
              Expected Goals (xG) y Expected Goals Against (xGA)
            </h5>
            <ResponsiveContainer width="100%" height={variant === 'compact' ? 200 : 250}>
              <BarChart data={datosGraficos?.barras || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis 
                  dataKey="name" 
                  stroke={chartColors.text}
                  tick={{ fill: chartColors.text, fontSize: tokens.typography.fontSizeSm }}
                />
                <YAxis 
                  stroke={chartColors.text}
                  tick={{ fill: chartColors.text, fontSize: tokens.typography.fontSizeSm }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.colors.bgElevated,
                    border: `1px solid ${tokens.colors.borderDefault}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.textPrimary,
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: tokens.colors.textSecondary }}
                />
                <Bar dataKey="Local" fill={chartColors.local} radius={[tokens.radius.sm, tokens.radius.sm, 0, 0]} />
                <Bar dataKey="Visitante" fill={chartColors.visita} radius={[tokens.radius.sm, tokens.radius.sm, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico de Líneas - Forma */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <h5 style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              marginBottom: tokens.spacing.md,
            }}>
              Forma Reciente (Últimos 5 Partidos)
            </h5>
            <ResponsiveContainer width="100%" height={variant === 'compact' ? 200 : 250}>
              <LineChart data={datosGraficos?.lineas || []}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis 
                  dataKey="partido" 
                  stroke={chartColors.text}
                  tick={{ fill: chartColors.text, fontSize: tokens.typography.fontSizeSm }}
                />
                <YAxis 
                  stroke={chartColors.text}
                  tick={{ fill: chartColors.text, fontSize: tokens.typography.fontSizeSm }}
                  domain={[0, 3]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tokens.colors.bgElevated,
                    border: `1px solid ${tokens.colors.borderDefault}`,
                    borderRadius: tokens.radius.md,
                    color: tokens.colors.textPrimary,
                  }}
                  formatter={(value) => {
                    if (value === 3) return 'Victoria';
                    if (value === 1) return 'Empate';
                    if (value === 0) return 'Derrota';
                    return value;
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: tokens.colors.textSecondary }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Local" 
                  stroke={chartColors.local} 
                  strokeWidth={2}
                  dot={{ fill: chartColors.local, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="Visitante" 
                  stroke={chartColors.visita} 
                  strokeWidth={2}
                  dot={{ fill: chartColors.visita, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico Radial - Rendimiento */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <h5 style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              marginBottom: tokens.spacing.md,
            }}>
              Rendimiento (Porcentaje de Puntos)
            </h5>
            <div style={{ display: 'flex', justifyContent: 'center', gap: tokens.spacing.xl, flexWrap: variant === 'compact' ? 'wrap' : 'nowrap' }}>
              {datosGraficos?.radial?.map((item, index) => (
                <div key={index} style={{ textAlign: 'center' }}>
                  <ResponsiveContainer width={variant === 'compact' ? 150 : 200} height={variant === 'compact' ? 150 : 200}>
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="90%"
                      data={[item]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <RadialBar
                        dataKey="value"
                        cornerRadius={tokens.radius.md}
                        fill={item.fill}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: tokens.colors.bgElevated,
                          border: `1px solid ${tokens.colors.borderDefault}`,
                          borderRadius: tokens.radius.md,
                          color: tokens.colors.textPrimary,
                        }}
                        formatter={(value) => `${value.toFixed(1)}%`}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{
                    marginTop: tokens.spacing.sm,
                    color: tokens.colors.textSecondary,
                    fontSize: tokens.typography.fontSizeSm,
                    fontWeight: tokens.typography.fontWeightSemibold,
                  }}>
                    {item.name}: {item.value.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Indicadores Visuales */}
          <div style={{ marginBottom: tokens.spacing.xl }}>
            <h5 style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              marginBottom: tokens.spacing.md,
            }}>
              Indicadores Clave
            </h5>
            <div style={{
              display: 'grid',
              gridTemplateColumns: variant === 'compact' ? '1fr' : 'repeat(2, 1fr)',
              gap: tokens.spacing.md,
            }}>
              {/* Racha Local */}
              <div style={{
                backgroundColor: tokens.colors.bgTertiary,
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.borderDefault}`,
              }}>
                <div style={{
                  color: tokens.colors.textSecondary,
                  fontSize: tokens.typography.fontSizeSm,
                  marginBottom: tokens.spacing.xs,
                }}>
                  Racha Local
                </div>
                <div style={{
                  color: tokens.colors.accentPositive,
                  fontSize: tokens.typography.fontSize2xl,
                  fontWeight: tokens.typography.fontWeightBold,
                }}>
                  {metricas.racha_local || 0} partidos
                </div>
              </div>

              {/* Racha Visitante */}
              <div style={{
                backgroundColor: tokens.colors.bgTertiary,
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.borderDefault}`,
              }}>
                <div style={{
                  color: tokens.colors.textSecondary,
                  fontSize: tokens.typography.fontSizeSm,
                  marginBottom: tokens.spacing.xs,
                }}>
                  Racha Visitante
                </div>
                <div style={{
                  color: tokens.colors.accentPositive,
                  fontSize: tokens.typography.fontSize2xl,
                  fontWeight: tokens.typography.fontWeightBold,
                }}>
                  {metricas.racha_visita || 0} partidos
                </div>
              </div>

              {/* Promedio Goles Local */}
              {metricas.promedio_goles_local && (
                <div style={{
                  backgroundColor: tokens.colors.bgTertiary,
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.colors.borderDefault}`,
                }}>
                  <div style={{
                    color: tokens.colors.textSecondary,
                    fontSize: tokens.typography.fontSizeSm,
                    marginBottom: tokens.spacing.xs,
                  }}>
                    Promedio Goles Local
                  </div>
                  <div style={{
                    color: tokens.colors.textPrimary,
                    fontSize: tokens.typography.fontSizeLg,
                    fontWeight: tokens.typography.fontWeightBold,
                  }}>
                    {metricas.promedio_goles_local.a_favor?.toFixed(2) || '0.00'} / {metricas.promedio_goles_local.en_contra?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{
                    color: tokens.colors.textMuted,
                    fontSize: tokens.typography.fontSizeXs,
                    marginTop: tokens.spacing.xs,
                  }}>
                    A favor / En contra
                  </div>
                </div>
              )}

              {/* Promedio Goles Visitante */}
              {metricas.promedio_goles_visita && (
                <div style={{
                  backgroundColor: tokens.colors.bgTertiary,
                  padding: tokens.spacing.md,
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.colors.borderDefault}`,
                }}>
                  <div style={{
                    color: tokens.colors.textSecondary,
                    fontSize: tokens.typography.fontSizeSm,
                    marginBottom: tokens.spacing.xs,
                  }}>
                    Promedio Goles Visitante
                  </div>
                  <div style={{
                    color: tokens.colors.textPrimary,
                    fontSize: tokens.typography.fontSizeLg,
                    fontWeight: tokens.typography.fontWeightBold,
                  }}>
                    {metricas.promedio_goles_visita.a_favor?.toFixed(2) || '0.00'} / {metricas.promedio_goles_visita.en_contra?.toFixed(2) || '0.00'}
                  </div>
                  <div style={{
                    color: tokens.colors.textMuted,
                    fontSize: tokens.typography.fontSizeXs,
                    marginTop: tokens.spacing.xs,
                  }}>
                    A favor / En contra
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Insights Automáticos */}
          {insights.length > 0 && (
            <div>
              <h5 style={{
                color: tokens.colors.textPrimary,
                fontSize: tokens.typography.fontSizeLg,
                fontWeight: tokens.typography.fontWeightSemibold,
                marginBottom: tokens.spacing.md,
              }}>
                💡 Insights del Análisis
              </h5>
              <div style={{
                backgroundColor: tokens.colors.bgTertiary,
                padding: tokens.spacing.md,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.borderDefault}`,
              }}>
                {insights.map((insight, index) => (
                  <div
                    key={index}
                    style={{
                      color: tokens.colors.textSecondary,
                      fontSize: tokens.typography.fontSizeBase,
                      lineHeight: tokens.typography.lineHeightRelaxed,
                      marginBottom: index < insights.length - 1 ? tokens.spacing.sm : 0,
                      paddingLeft: tokens.spacing.md,
                      borderLeft: `3px solid ${tokens.colors.accentOrange}`,
                    }}
                  >
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botón de exportar (si está disponible) */}
          {onExportar && (
            <div style={{
              marginTop: tokens.spacing.lg,
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.bgTertiary,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.colors.borderDefault}`,
              textAlign: 'center',
            }}>
              <p style={{
                color: tokens.colors.textMuted,
                fontSize: tokens.typography.fontSizeXs,
                marginBottom: tokens.spacing.sm,
              }}>
                Este análisis puede ser exportado para estudios avanzados.
              </p>
              <button
                onClick={onExportar}
                style={{
                  padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                  backgroundColor: tokens.colors.accentOrange,
                  color: tokens.colors.textPrimary,
                  border: 'none',
                  borderRadius: tokens.radius.sm,
                  fontSize: tokens.typography.fontSizeSm,
                  fontWeight: tokens.typography.fontWeightSemibold,
                  cursor: 'pointer',
                  transition: `all ${tokens.transitions.normal}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.accentOrangeDark;
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = tokens.colors.accentOrange;
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                📥 Exportar Análisis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(PanelAnalisis);
