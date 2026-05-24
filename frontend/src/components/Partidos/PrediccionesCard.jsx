import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { prediccionesCardStyles } from "../../styles/components/PrediccionesCard";
import { tokens } from "../../styles/tokens";
import { getAllPresets, getDefaultPreset, getPreset } from "../../config/predictionPresets";
import { getMatchPredictions, exportPredictionAnalysis } from "../../api/api";
import PrediccionTransparency from "./PrediccionTransparency";
import InsightsCard from "./InsightsCard";
import "../../styles/partidos.css";
import "../../styles/predicciones.css";
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
} from "../../constants/advancedMetricLabels";

// Lazy import del PanelAnalisis para optimización
const PanelAnalisis = lazy(() => import('./PanelAnalisis'));

// Textos de tooltips para métricas avanzadas - definido FUERA de cualquier componente
const TOOLTIP_TEXTS = {
  xG_local: ML.xGLocal,
  xGA_local: ML.xGALocal,
  xG_visita: ML.xGVisitante,
  xGA_visita: ML.xGAVisitante,
  forma_local: "Resultados de los últimos 5 partidos (W=Victoria, D=Empate, L=Derrota)",
  forma_visita: "Resultados de los últimos 5 partidos (W=Victoria, D=Empate, L=Derrota)",
  racha_local: "Partidos consecutivos sin perder o ganados",
  racha_visita: "Partidos consecutivos sin perder o ganados",
  promedio_goles_local: "Promedio de goles a favor y en contra del equipo local",
  promedio_goles_visita: "Promedio de goles a favor y en contra del equipo visitante",
  rendimiento_local: "Porcentaje de puntos obtenidos jugando como local",
  rendimiento_visita: "Porcentaje de puntos obtenidos jugando como visitante",
  promedio_corners_esperados: "Promedio de tiros de esquina esperados en el partido. Calculado desde datos reales (últimos partidos y estadísticas de equipos)"
};

/**
 * Hook personalizado para animación de count up
 */
function useCountUp(targetValue, duration = 400) {
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (targetValue === 0 || targetValue === null || targetValue === undefined) {
      setCurrentValue(0);
      return;
    }

    setIsAnimating(true);
    const startValue = 0;
    const endValue = targetValue;
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const value = startValue + (endValue - startValue) * easeOut;

      setCurrentValue(value);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
        setIsAnimating(false);
      }
    };

    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [targetValue, duration]);

  return { currentValue, isAnimating };
}

/**
 * Hook para detectar el tamaño de viewport y determinar variante
 */
function useViewport() {
  const [variant, setVariant] = useState('extended');

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setVariant(width < tokens.breakpoints.mobile ? 'compact' : 'extended');
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return variant;
}

/**
 * PrediccionesCard - Componente para mostrar predicciones de un partido
 */
function PrediccionesCard({
  prob_local,
  prob_empate,
  prob_visita,
  goles_local,
  goles_visita,
  recomendacion,
  metricas_avanzadas,
  perfil = 'balanceado',
  onPerfilChange,
  variant: propVariant = 'auto',
  fixtureId,
  preset: presetProp = null,
  onPresetChange = null,
}) {
  // Detectar viewport si variant es 'auto'
  const viewportVariant = useViewport();
  const variant = propVariant === 'auto' ? viewportVariant : propVariant;

  // Calcular valores finales
  const probLocalPorcentaje = useMemo(() => Math.round((prob_local || 0) * 100), [prob_local]);
  const probEmpatePorcentaje = useMemo(() => Math.round((prob_empate || 0) * 100), [prob_empate]);
  const probVisitaPorcentaje = useMemo(() => Math.round((prob_visita || 0) * 100), [prob_visita]);
  const golesLocalFinal = useMemo(() => parseFloat(goles_local || 0).toFixed(1), [goles_local]);
  const golesVisitaFinal = useMemo(() => parseFloat(goles_visita || 0).toFixed(1), [goles_visita]);

  // Animaciones count up
  const probLocalAnim = useCountUp(probLocalPorcentaje, 400);
  const probEmpateAnim = useCountUp(probEmpatePorcentaje, 400);
  const probVisitaAnim = useCountUp(probVisitaPorcentaje, 400);
  const golesLocalAnim = useCountUp(parseFloat(golesLocalFinal), 400);
  const golesVisitaAnim = useCountUp(parseFloat(golesVisitaFinal), 400);

  // Estilos usando el sistema de tokens
  const styles = prediccionesCardStyles;

  // Agregar keyframes para animación de entrada
  useEffect(() => {
    const styleId = 'predicciones-card-animations';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes slideInFade {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) document.head.removeChild(existingStyle);
    };
  }, []);

  // Estilos inline con mejoras visuales
  const cardStyle = {
    ...styles.card(variant),
    animation: 'slideInFade 250ms ease-out',
  };

  // Presets y perfiles
  const [presetActual, setPresetActual] = useState(presetProp || getDefaultPreset());
  const presetsDisponibles = useMemo(() => getAllPresets(), []);
  
  const perfiles = [
    { id: 'conservador', name: 'Conservador', icon: '🛡️' },
    { id: 'balanceado', name: 'Balanceado', icon: '⚖️' },
    { id: 'agresivo', name: 'Agresivo', icon: '⚡' },
  ];

  // Estado para animación del selector
  const [animatingPerfil, setAnimatingPerfil] = useState(false);
  const [mostrarPanelAnalisis, setMostrarPanelAnalisis] = useState(presetActual.visualizaciones.panelAnalisis);

  // Manejar cambio de perfil
  const handlePerfilChange = useCallback((nuevoPerfil) => {
    if (nuevoPerfil === perfil) return;
    
    setAnimatingPerfil(true);
    setTimeout(() => {
      if (onPerfilChange) {
        onPerfilChange(nuevoPerfil);
      }
      setAnimatingPerfil(false);
    }, 200);
  }, [perfil, onPerfilChange]);

  // Manejar cambio de preset
  const handlePresetChange = useCallback((nuevoPresetId) => {
    const nuevoPreset = getPreset(nuevoPresetId);
    setPresetActual(nuevoPreset);
    setMostrarPanelAnalisis(nuevoPreset.visualizaciones.panelAnalisis);
    
    if (nuevoPreset.profile !== perfil && onPerfilChange) {
      onPerfilChange(nuevoPreset.profile);
    }
    
    if (onPresetChange) {
      onPresetChange(nuevoPreset);
    }
  }, [perfil, onPerfilChange, onPresetChange]);

  // Función para exportar análisis
  const handleExportar = useCallback(async () => {
    if (!fixtureId) return;

    try {
      const data = await exportPredictionAnalysis(fixtureId, perfil);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prediccion_${fixtureId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando análisis:', error);
      alert('No se pudo exportar el análisis');
    }
  }, [fixtureId, perfil]);

  // Preparar datos para InsightsCard
  const prediccionData = useMemo(() => ({
    prob_local,
    prob_empate,
    prob_visita,
    goles_local,
    goles_visita,
    recomendacion
  }), [prob_local, prob_empate, prob_visita, goles_local, goles_visita, recomendacion]);

  return (
    <>
      <div className="predicciones-card" style={cardStyle}>
        <div style={{ 
          display: 'flex', 
          flexDirection: variant === 'compact' ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: variant === 'compact' ? 'stretch' : 'center', 
          gap: variant === 'compact' ? tokens.spacing.sm : tokens.spacing.md,
          marginBottom: tokens.spacing.md 
        }}>
          <h4 style={styles.title}>Predicción del partido</h4>
          
          <div style={{ display: 'flex', gap: tokens.spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
            {variant !== 'compact' && (
              <select
                value={presetActual.id}
                onChange={(e) => handlePresetChange(e.target.value)}
                style={{
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  backgroundColor: tokens.colors.bgTertiary,
                  border: `1px solid ${tokens.colors.borderDefault}`,
                  borderRadius: tokens.radius.sm,
                  color: tokens.colors.textPrimary,
                  fontSize: tokens.typography.fontSizeXs,
                  cursor: 'pointer',
                  transition: `all ${tokens.transitions.normal}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.borderHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.borderDefault;
                }}
              >
                {presetsDisponibles.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.name}
                  </option>
                ))}
              </select>
            )}
            
            <div
              style={{
                display: 'flex',
                gap: tokens.spacing.xs,
                backgroundColor: tokens.colors.bgTertiary,
                padding: tokens.spacing.xs,
                borderRadius: tokens.radius.md,
                border: `1px solid ${tokens.colors.borderDefault}`,
                opacity: animatingPerfil ? 0.6 : 1,
                transition: `opacity ${tokens.transitions.normal}, transform ${tokens.transitions.fast}`,
                transform: animatingPerfil ? 'scale(0.98)' : 'scale(1)',
                width: variant === 'compact' ? '100%' : 'auto',
                justifyContent: variant === 'compact' ? 'space-between' : 'flex-start',
              }}
            >
              {perfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePerfilChange(p.id)}
                  disabled={animatingPerfil}
                  style={{
                    padding: `${tokens.spacing.xs} ${variant === 'compact' ? tokens.spacing.sm : tokens.spacing.md}`,
                    borderRadius: tokens.radius.sm,
                    border: 'none',
                    backgroundColor: perfil === p.id ? tokens.colors.accentOrange : 'transparent',
                    color: perfil === p.id ? tokens.colors.textPrimary : tokens.colors.textSecondary,
                    fontSize: tokens.typography.fontSizeXs,
                    fontWeight: perfil === p.id ? tokens.typography.fontWeightSemibold : tokens.typography.fontWeightNormal,
                    cursor: animatingPerfil ? 'not-allowed' : 'pointer',
                    transition: `all ${tokens.transitions.normal}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs,
                    whiteSpace: 'nowrap',
                    flex: variant === 'compact' ? 1 : 'none',
                  }}
                  title={p.name}
                >
                  <span>{p.icon}</span>
                  {variant !== 'compact' && <span>{p.name}</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={styles.probabilidadesContainer(variant)}>
          <div 
            className="probabilidad-card-hover"
            style={styles.probabilidadCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderHover;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = tokens.shadows.md;
              e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderDefault;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
            }}
          >
            <div style={styles.probabilidadLabel}>Local</div>
            <span style={styles.probabilidadValor}>
              {Math.round(probLocalAnim.currentValue)}%
            </span>
          </div>
          <div 
            className="probabilidad-card-hover"
            style={styles.probabilidadCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderHover;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = tokens.shadows.md;
              e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderDefault;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
            }}
          >
            <div style={styles.probabilidadLabel}>Empate</div>
            <span style={styles.probabilidadValor}>
              {Math.round(probEmpateAnim.currentValue)}%
            </span>
          </div>
          <div 
            className="probabilidad-card-hover"
            style={styles.probabilidadCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderHover;
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = tokens.shadows.md;
              e.currentTarget.style.backgroundColor = tokens.colors.bgElevated;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = tokens.colors.borderDefault;
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.backgroundColor = tokens.colors.bgTertiary;
            }}
          >
            <div style={styles.probabilidadLabel}>Visitante</div>
            <span style={styles.probabilidadValor}>
              {Math.round(probVisitaAnim.currentValue)}%
            </span>
          </div>
        </div>

        <div style={styles.separator} />

        <div style={styles.golesContainer}>
          <span style={styles.golesLabel}>
            <span>⚽</span>
            <span>Goles Esperados</span>
          </span>
          <span style={styles.golesValor}>
            {golesLocalAnim.currentValue.toFixed(1)} - {golesVisitaAnim.currentValue.toFixed(1)}
          </span>
        </div>

        <div style={styles.separator} />

        {recomendacion && (
          <div style={{ marginTop: tokens.spacing.sm }}>
            <div 
              style={styles.recomendacionBadge}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.glowGreen;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = tokens.shadows.glowGreen;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              ✓ {recomendacion}
            </div>
          </div>
        )}

        {metricas_avanzadas && (
          <MetricasAvanzadas 
            metricas={metricas_avanzadas} 
            variant={variant}
            styles={styles}
            useCountUp={useCountUp}
          />
        )}

        {/* Transparencia ampliada - Información sobre origen de datos y métodos */}
        <div style={{
          marginTop: tokens.spacing.md,
          padding: tokens.spacing.sm,
          backgroundColor: tokens.colors.bgSecondary,
          borderRadius: tokens.radius.sm,
          border: `1px solid ${tokens.colors.borderDefault}`,
          fontSize: tokens.typography.fontSizeXs,
          color: tokens.colors.textMuted,
          fontStyle: 'italic',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: tokens.spacing.xs }}>
            <div style={{ marginBottom: tokens.spacing.xs }}>
              ℹ️ Esta predicción combina datos reales con cálculos derivados. 
              Algunos valores pueden ser estimaciones cuando no hay datos disponibles.
            </div>
            {metricas_avanzadas?.poisson_used && (
              <div style={{ 
                marginTop: tokens.spacing.xs,
                color: tokens.colors.accentInfo,
                fontWeight: 'normal'
              }}>
                📊 Modelo Poisson aplicado
              </div>
            )}
            {metricas_avanzadas?.xg_normalized && (
              <div style={{ 
                marginTop: tokens.spacing.xs,
                color: tokens.colors.accentInfo,
                fontWeight: 'normal'
              }}>
                📈 xG normalizado por liga
              </div>
            )}
          </div>
        </div>

        {/* Componente de Transparencia Completa */}
        <PrediccionTransparency
          metricas_avanzadas={metricas_avanzadas}
          prediction={{
            prob_local,
            prob_empate,
            prob_visita,
            goles_local,
            goles_visita,
            recomendacion
          }}
          profile={perfil}
        />

        {metricas_avanzadas && mostrarPanelAnalisis && (
          <Suspense fallback={
            <div style={{
              textAlign: 'center',
              padding: tokens.spacing.md,
              color: tokens.colors.textSecondary,
              fontSize: tokens.typography.fontSizeSm,
            }}>
              Cargando panel de análisis...
            </div>
          }>
            <PanelAnalisis 
              metricas={metricas_avanzadas} 
              variant={variant}
              fixtureId={fixtureId}
              onExportar={handleExportar}
            />
          </Suspense>
        )}
      </div>
      
      {/* Insights Card - Se muestra después de PrediccionesCard */}
      <InsightsCard 
        prediccion={prediccionData}
        metricas_avanzadas={metricas_avanzadas}
      />
    </>
  );
}

/**
 * Componente para mostrar métricas avanzadas
 */
function MetricasAvanzadas({ metricas, variant, styles, useCountUp }) {
  const xGLocalAnim = useCountUp(metricas.xG_local || 0, 400);
  const xGALocalAnim = useCountUp(metricas.xGA_local || 0, 400);
  const xGVisitaAnim = useCountUp(metricas.xG_visita || 0, 400);
  const xGAVisitaAnim = useCountUp(metricas.xGA_visita || 0, 400);
  const rendimientoLocalAnim = useCountUp(metricas.rendimiento_local || 0, 400);
  const rendimientoVisitaAnim = useCountUp(metricas.rendimiento_visita || 0, 400);
  const promedioGolesLocalFavorAnim = useCountUp(metricas.promedio_goles_local?.a_favor || 0, 400);
  const promedioGolesLocalContraAnim = useCountUp(metricas.promedio_goles_local?.en_contra || 0, 400);
  const promedioGolesVisitaFavorAnim = useCountUp(metricas.promedio_goles_visita?.a_favor || 0, 400);
  const promedioGolesVisitaContraAnim = useCountUp(metricas.promedio_goles_visita?.en_contra || 0, 400);
  const promedioCornersAnim = useCountUp(metricas.promedio_corners_esperados || 0, 400);

  const Tooltip = ({ children, text }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    return (
      <div
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
        {showTooltip && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: tokens.spacing.xs,
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
              backgroundColor: tokens.colors.bgElevated,
              color: tokens.colors.textPrimary,
              fontSize: tokens.typography.fontSizeXs,
              borderRadius: tokens.radius.sm,
              whiteSpace: 'nowrap',
              zIndex: tokens.zIndex.tooltip,
              boxShadow: tokens.shadows.md,
              border: `1px solid ${tokens.colors.borderDefault}`,
              pointerEvents: 'none',
            }}
          >
            {text}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: `4px solid transparent`,
                borderTopColor: tokens.colors.bgElevated,
              }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.metricasAvanzadas}>
      <h5 style={styles.metricasTitulo}>
        Métricas Avanzadas
      </h5>
      <div style={styles.metricasGrid(variant)}>
        <Tooltip text={TOOLTIP_TEXTS.xG_local}>
          <div style={styles.metricaCard}>
            <div className={ADVANCED_METRIC_LABEL_CLASS} style={styles.metricaLabel}>
              {ML.xGLocal}
              {metricas.xgSource?.xG_local === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }} title="xG estimado (dato no disponible)">
                  ⚠️
                </span>
              )}
            </div>
            <div style={styles.metricaValor}>
              {xGLocalAnim.currentValue.toFixed(2)}
              {metricas.xgSource?.xG_local === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }}>
                  (est.)
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.xGA_local}>
          <div style={styles.metricaCard}>
            <div className={ADVANCED_METRIC_LABEL_CLASS} style={styles.metricaLabel}>
              {ML.xGALocal}
              {metricas.xgSource?.xGA_local === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }} title="xGA estimado (dato no disponible)">
                  ⚠️
                </span>
              )}
            </div>
            <div style={styles.metricaValor}>
              {xGALocalAnim.currentValue.toFixed(2)}
              {metricas.xgSource?.xGA_local === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }}>
                  (est.)
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.xG_visita}>
          <div style={styles.metricaCard}>
            <div className={ADVANCED_METRIC_LABEL_CLASS} style={styles.metricaLabel}>
              {ML.xGVisitante}
              {metricas.xgSource?.xG_visita === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }} title="xG estimado (dato no disponible)">
                  ⚠️
                </span>
              )}
            </div>
            <div style={styles.metricaValor}>
              {xGVisitaAnim.currentValue.toFixed(2)}
              {metricas.xgSource?.xG_visita === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }}>
                  (est.)
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.xGA_visita}>
          <div style={styles.metricaCard}>
            <div className={ADVANCED_METRIC_LABEL_CLASS} style={styles.metricaLabel}>
              {ML.xGAVisitante}
              {metricas.xgSource?.xGA_visita === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }} title="xGA estimado (dato no disponible)">
                  ⚠️
                </span>
              )}
            </div>
            <div style={styles.metricaValor}>
              {xGAVisitaAnim.currentValue.toFixed(2)}
              {metricas.xgSource?.xGA_visita === 'estimated' && (
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentWarning,
                  marginLeft: tokens.spacing.xs
                }}>
                  (est.)
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.forma_local}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Forma Local</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentInfo }}>
              {metricas.forma_local || "N/A"}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.forma_visita}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Forma Visitante</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentInfo }}>
              {metricas.forma_visita || "N/A"}
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.racha_local}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Racha Local</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentPositive }}>
              {metricas.racha_local || 0} partidos
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.racha_visita}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Racha Visitante</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentPositive }}>
              {metricas.racha_visita || 0} partidos
            </div>
          </div>
        </Tooltip>

        {metricas.promedio_goles_local && (
          <Tooltip text={TOOLTIP_TEXTS.promedio_goles_local}>
            <div style={styles.metricaCard}>
              <div style={styles.metricaLabel}>Prom. Goles Local</div>
              <div style={styles.metricaValor}>
                {promedioGolesLocalFavorAnim.currentValue.toFixed(2)} / {promedioGolesLocalContraAnim.currentValue.toFixed(2)}
              </div>
            </div>
          </Tooltip>
        )}

        {metricas.promedio_goles_visita && (
          <Tooltip text={TOOLTIP_TEXTS.promedio_goles_visita}>
            <div style={styles.metricaCard}>
              <div style={styles.metricaLabel}>Prom. Goles Visitante</div>
              <div style={styles.metricaValor}>
                {promedioGolesVisitaFavorAnim.currentValue.toFixed(2)} / {promedioGolesVisitaContraAnim.currentValue.toFixed(2)}
              </div>
            </div>
          </Tooltip>
        )}

        {metricas.promedio_corners_esperados !== null && metricas.promedio_corners_esperados !== undefined && (
          <Tooltip text={TOOLTIP_TEXTS.promedio_corners_esperados}>
            <div style={styles.metricaCard}>
              <div style={styles.metricaLabel}>
                Prom. Corners Esperados
                <span style={{ 
                  fontSize: tokens.typography.fontSizeXs, 
                  color: tokens.colors.accentInfo,
                  marginLeft: tokens.spacing.xs,
                  fontWeight: 'normal'
                }} title="Datos reales (últimos partidos y estadísticas de equipos)">
                  ℹ️
                </span>
              </div>
              <div style={styles.metricaValor}>
                {promedioCornersAnim.currentValue.toFixed(2)}
              </div>
            </div>
          </Tooltip>
        )}

        <Tooltip text={TOOLTIP_TEXTS.rendimiento_local}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Rendimiento Local</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentGold }}>
              {rendimientoLocalAnim.currentValue.toFixed(1)}%
            </div>
          </div>
        </Tooltip>

        <Tooltip text={TOOLTIP_TEXTS.rendimiento_visita}>
          <div style={styles.metricaCard}>
            <div style={styles.metricaLabel}>Rendimiento Visitante</div>
            <div style={{ ...styles.metricaValor, color: tokens.colors.accentGold }}>
              {rendimientoVisitaAnim.currentValue.toFixed(1)}%
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

export default React.memo(PrediccionesCard);
