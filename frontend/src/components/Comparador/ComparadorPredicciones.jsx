import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { tokens } from '../../styles/tokens';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';
import { generarInsightsComparacion } from '../../utils/generarInsightsComparacion';
import { comparePredictions, getPredictionHistory, exportPredictionAnalysis } from '../../api/api';

/**
 * ComparadorPredicciones - Componente para comparar dos partidos lado a lado
 */
function ComparadorPredicciones({ fixtureIdA, fixtureIdB, profile = 'balanceado', onClose }) {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Detectar cambios en el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cargar datos de comparación
  useEffect(() => {
    const cargarDatos = async () => {
      if (!fixtureIdA || !fixtureIdB) return;

      setLoading(true);
      setError(null);

      try {
        const comparacion = await comparePredictions(fixtureIdA, fixtureIdB, profile);
        setDatos(comparacion);
      } catch (err) {
        console.error('Error cargando comparación:', err);
        setError('No se pudieron cargar los datos de comparación');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [fixtureIdA, fixtureIdB, profile]);

  // Generar insights de comparación
  const insights = useMemo(() => {
    if (!datos || !datos.partidoA || !datos.partidoB) return [];
    return generarInsightsComparacion(datos.partidoA, datos.partidoB);
  }, [datos]);

  // Cargar historial cuando se expande
  useEffect(() => {
    if (mostrarHistorial && datos?.partidoA?.fixture?.homeTeam?.id) {
      const cargarHistorial = async () => {
        try {
          const hist = await getPredictionHistory(datos.partidoA.fixture.homeTeam.id, 10);
          setHistorial(hist);
        } catch (err) {
          console.error('Error cargando historial:', err);
        }
      };
      cargarHistorial();
    }
  }, [mostrarHistorial, datos]);

  // Datos para gráfico de historial
  const datosGraficoHistorial = useMemo(() => {
    if (!historial || !Array.isArray(historial)) return [];
    
    return historial.map((item, index) => ({
      partido: `P${index + 1}`,
      probabilidad: item.prob_local ? item.prob_local * 100 : 0,
      resultado: item.resultado_real === 'W' ? 100 : item.resultado_real === 'D' ? 50 : 0,
    }));
  }, [historial]);

  if (loading) {
    return (
      <div style={{
        padding: tokens.spacing.xl,
        textAlign: 'center',
        color: tokens.colors.textSecondary,
      }}>
        Cargando comparación...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: tokens.spacing.xl,
        textAlign: 'center',
        color: tokens.colors.accentNegative,
      }}>
        {error}
      </div>
    );
  }

  if (!datos || !datos.partidoA || !datos.partidoB) {
    return null;
  }

  const { partidoA, partidoB } = datos;

  // Componente para mostrar una tarjeta de predicción resumida
  const PrediccionResumida = ({ partido, label }) => (
    <div style={{
      backgroundColor: tokens.colors.bgSecondary,
      border: `1px solid ${tokens.colors.borderDefault}`,
      borderRadius: tokens.radius.lg,
      padding: tokens.spacing.md,
      height: '100%',
    }}>
      <h4 style={{
        color: tokens.colors.textPrimary,
        fontSize: tokens.typography.fontSizeLg,
        fontWeight: tokens.typography.fontWeightSemibold,
        marginBottom: tokens.spacing.md,
        textAlign: 'center',
      }}>
        {label}
      </h4>

      {/* Información del partido */}
      {partido.fixture && (
        <div style={{
          marginBottom: tokens.spacing.md,
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.bgTertiary,
          borderRadius: tokens.radius.md,
        }}>
          <div style={{
            color: tokens.colors.textSecondary,
            fontSize: tokens.typography.fontSizeSm,
            marginBottom: tokens.spacing.xs,
          }}>
            {partido.fixture.league?.name || 'Liga'}
          </div>
          <div style={{
            color: tokens.colors.textPrimary,
            fontSize: tokens.typography.fontSizeBase,
            fontWeight: tokens.typography.fontWeightSemibold,
          }}>
            {partido.fixture.homeTeam?.name || 'Local'} vs {partido.fixture.awayTeam?.name || 'Visitante'}
          </div>
        </div>
      )}

      {/* Probabilidades */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: tokens.spacing.sm,
        marginBottom: tokens.spacing.md,
      }}>
        <div style={{
          textAlign: 'center',
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.bgTertiary,
          borderRadius: tokens.radius.sm,
        }}>
          <div style={{
            color: tokens.colors.textSecondary,
            fontSize: tokens.typography.fontSizeXs,
            marginBottom: tokens.spacing.xs,
          }}>
            Local
          </div>
          <div style={{
            color: tokens.colors.accentOrange,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightBold,
          }}>
            {(partido.prob_local * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.bgTertiary,
          borderRadius: tokens.radius.sm,
        }}>
          <div style={{
            color: tokens.colors.textSecondary,
            fontSize: tokens.typography.fontSizeXs,
            marginBottom: tokens.spacing.xs,
          }}>
            Empate
          </div>
          <div style={{
            color: tokens.colors.accentInfo,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightBold,
          }}>
            {(partido.prob_empate * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{
          textAlign: 'center',
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.bgTertiary,
          borderRadius: tokens.radius.sm,
        }}>
          <div style={{
            color: tokens.colors.textSecondary,
            fontSize: tokens.typography.fontSizeXs,
            marginBottom: tokens.spacing.xs,
          }}>
            Visitante
          </div>
          <div style={{
            color: tokens.colors.accentInfo,
            fontSize: tokens.typography.fontSizeLg,
            fontWeight: tokens.typography.fontWeightBold,
          }}>
            {(partido.prob_visita * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Recomendación */}
      {partido.recomendacion && (
        <div style={{
          textAlign: 'center',
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.accentPositive,
          borderRadius: tokens.radius.md,
          marginBottom: tokens.spacing.md,
        }}>
          <div style={{
            color: tokens.colors.textPrimary,
            fontSize: tokens.typography.fontSizeBase,
            fontWeight: tokens.typography.fontWeightSemibold,
          }}>
            ✓ {partido.recomendacion}
          </div>
        </div>
      )}

      {/* Métricas clave */}
      {partido.metricas_avanzadas && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: tokens.spacing.sm,
        }}>
          <div style={{
            padding: tokens.spacing.sm,
            backgroundColor: tokens.colors.bgTertiary,
            borderRadius: tokens.radius.sm,
          }}>
            <div
              className={ADVANCED_METRIC_LABEL_CLASS}
              style={getAdvancedMetricLabelStyle()}
            >
              {ML.xGLocal}
            </div>
            <div style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeBase,
              fontWeight: tokens.typography.fontWeightSemibold,
            }}>
              {partido.metricas_avanzadas.xG_local?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div style={{
            padding: tokens.spacing.sm,
            backgroundColor: tokens.colors.bgTertiary,
            borderRadius: tokens.radius.sm,
          }}>
            <div
              className={ADVANCED_METRIC_LABEL_CLASS}
              style={getAdvancedMetricLabelStyle()}
            >
              {ML.xGALocal}
            </div>
            <div style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeBase,
              fontWeight: tokens.typography.fontWeightSemibold,
            }}>
              {partido.metricas_avanzadas.xGA_local?.toFixed(2) || 'N/A'}
            </div>
          </div>
          <div style={{
            padding: tokens.spacing.sm,
            backgroundColor: tokens.colors.bgTertiary,
            borderRadius: tokens.radius.sm,
          }}>
            <div style={{
              color: tokens.colors.textSecondary,
              fontSize: tokens.typography.fontSizeXs,
            }}>
              Rendimiento
            </div>
            <div style={{
              color: tokens.colors.accentGold,
              fontSize: tokens.typography.fontSizeBase,
              fontWeight: tokens.typography.fontWeightSemibold,
            }}>
              {partido.metricas_avanzadas.rendimiento_local?.toFixed(1) || 'N/A'}%
            </div>
          </div>
          <div style={{
            padding: tokens.spacing.sm,
            backgroundColor: tokens.colors.bgTertiary,
            borderRadius: tokens.radius.sm,
          }}>
            <div style={{
              color: tokens.colors.textSecondary,
              fontSize: tokens.typography.fontSizeXs,
            }}>
              Racha
            </div>
            <div style={{
              color: tokens.colors.accentPositive,
              fontSize: tokens.typography.fontSizeBase,
              fontWeight: tokens.typography.fontWeightSemibold,
            }}>
              {partido.metricas_avanzadas.racha_local || 0} partidos
            </div>
          </div>
        </div>
      )}

      {/* Perfil usado */}
      {partido.profile && (
        <div style={{
          marginTop: tokens.spacing.sm,
          textAlign: 'center',
          color: tokens.colors.textMuted,
          fontSize: tokens.typography.fontSizeXs,
        }}>
          Perfil: {partido.profile}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: tokens.spacing.md,
      animation: 'fadeIn 200ms ease-out',
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      
      <div style={{
        backgroundColor: tokens.colors.bgMain,
        borderRadius: tokens.radius.xl,
        padding: tokens.spacing.xl,
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        border: `1px solid ${tokens.colors.borderDefault}`,
        boxShadow: tokens.shadows.xl,
        animation: 'slideUp 300ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: tokens.spacing.lg,
        }}>
          <h2 style={{
            color: tokens.colors.textPrimary,
            fontSize: tokens.typography.fontSize2xl,
            fontWeight: tokens.typography.fontWeightBold,
          }}>
            Comparación de Partidos
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
                backgroundColor: tokens.colors.bgTertiary,
                border: `1px solid ${tokens.colors.borderDefault}`,
                borderRadius: tokens.radius.md,
                color: tokens.colors.textPrimary,
                cursor: 'pointer',
                fontSize: tokens.typography.fontSizeBase,
                transition: `all ${tokens.transitions.normal}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
              }}
            >
              ✕ Cerrar
            </button>
          )}
        </div>

        {/* Comparación lado a lado */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: tokens.spacing.lg,
          marginBottom: tokens.spacing.lg,
        }}>
          <PrediccionResumida partido={partidoA} label="Partido A" />
          <PrediccionResumida partido={partidoB} label="Partido B" />
        </div>

        {/* Insights de comparación */}
        <div style={{
            marginBottom: tokens.spacing.lg,
            padding: tokens.spacing.md,
            backgroundColor: tokens.colors.bgSecondary,
            borderRadius: tokens.radius.md,
            border: `1px solid ${tokens.colors.borderDefault}`,
          }}>
            <h3 style={{
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeLg,
              fontWeight: tokens.typography.fontWeightSemibold,
              marginBottom: tokens.spacing.md,
            }}>
              📊 Conclusiones de análisis comparativo
            </h3>
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

        {/* Botones de exportar */}
        <div style={{
          display: 'flex',
          gap: tokens.spacing.md,
          justifyContent: 'center',
          marginBottom: tokens.spacing.lg,
          flexWrap: 'wrap',
        }}>
          {fixtureIdA && (
            <button
              onClick={async () => {
                try {
                  const data = await exportPredictionAnalysis(fixtureIdA, profile);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prediccion_A_${fixtureIdA}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exportando:', error);
                  alert('No se pudo exportar el análisis del partido A');
                }
              }}
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
            >
              📥 Exportar Partido A
            </button>
          )}
          {fixtureIdB && (
            <button
              onClick={async () => {
                try {
                  const data = await exportPredictionAnalysis(fixtureIdB, profile);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prediccion_B_${fixtureIdB}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exportando:', error);
                  alert('No se pudo exportar el análisis del partido B');
                }
              }}
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
            >
              📥 Exportar Partido B
            </button>
          )}
        </div>

        {/* Botones de exportar */}
        <div style={{
          display: 'flex',
          gap: tokens.spacing.md,
          justifyContent: 'center',
          marginBottom: tokens.spacing.lg,
          flexWrap: 'wrap',
        }}>
          {fixtureIdA && (
            <button
              onClick={async () => {
                try {
                  const data = await exportPredictionAnalysis(fixtureIdA, profile);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prediccion_A_${fixtureIdA}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exportando:', error);
                  alert('No se pudo exportar el análisis del partido A');
                }
              }}
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
              📥 Exportar Partido A
            </button>
          )}
          {fixtureIdB && (
            <button
              onClick={async () => {
                try {
                  const data = await exportPredictionAnalysis(fixtureIdB, profile);
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `prediccion_B_${fixtureIdB}_${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Error exportando:', error);
                  alert('No se pudo exportar el análisis del partido B');
                }
              }}
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
              📥 Exportar Partido B
            </button>
          )}
        </div>

        {/* Tendencias históricas */}
        <div>
          <button
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
            style={{
              width: '100%',
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.bgTertiary,
              border: `1px solid ${tokens.colors.borderDefault}`,
              borderRadius: tokens.radius.md,
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeBase,
              fontWeight: tokens.typography.fontWeightSemibold,
              cursor: 'pointer',
              marginBottom: mostrarHistorial ? tokens.spacing.md : 0,
              transition: `all ${tokens.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
            }}
          >
            {mostrarHistorial ? '▼' : '▶'} Tendencias Históricas
          </button>

          {mostrarHistorial && datosGraficoHistorial.length > 0 && (
            <div style={{
              padding: tokens.spacing.md,
              backgroundColor: tokens.colors.bgSecondary,
              borderRadius: tokens.radius.md,
              border: `1px solid ${tokens.colors.borderDefault}`,
            }}>
              <h4 style={{
                color: tokens.colors.textPrimary,
                fontSize: tokens.typography.fontSizeLg,
                fontWeight: tokens.typography.fontWeightSemibold,
                marginBottom: tokens.spacing.md,
              }}>
                Historial de Predicciones - {partidoA.fixture?.homeTeam?.name || 'Equipo Local'}
              </h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={datosGraficoHistorial}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tokens.colors.borderDefault} />
                  <XAxis 
                    dataKey="partido" 
                    stroke={tokens.colors.textSecondary}
                    tick={{ fill: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}
                  />
                  <YAxis 
                    stroke={tokens.colors.textSecondary}
                    tick={{ fill: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}
                    domain={[0, 100]}
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
                  <Line 
                    type="monotone" 
                    dataKey="probabilidad" 
                    stroke={tokens.colors.accentOrange} 
                    strokeWidth={2}
                    name="Probabilidad Predicha"
                    dot={{ fill: tokens.colors.accentOrange, r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resultado" 
                    stroke={tokens.colors.accentPositive} 
                    strokeWidth={2}
                    name="Resultado Real"
                    dot={{ fill: tokens.colors.accentPositive, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ComparadorPredicciones);
