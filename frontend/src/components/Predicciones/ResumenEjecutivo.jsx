import React from 'react';
import { tokens } from '../../styles/tokens';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';
import { calculateFinalGoalLogicProbabilities } from '../../utils/calculateGoalLogicProbability';
import { resolveDisplayXg } from '../../utils/xgDisplayUtils';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import PrediccionesSectionTitle from './PrediccionesSectionTitle';
import {
  IconInformeGeneral,
  IconCuotasMercado,
  IconVisionEstrategica,
} from './PrediccionesIcons';
import BrandResponsiveText from '../BrandResponsiveText';
import { BRAND_NAME } from '../../constants/brand';

/**
 * ResumenEjecutivo - Componente visual para mostrar información clave destacada
 * Solo presentación, no modifica datos
 */
export default function ResumenEjecutivo({ predicciones, equipoA, equipoB, fixtureConOdds, datosAdicionales }) {
  if (!predicciones) return null;

  // Verificar si hay fixture y odds disponibles
  const fixtureData = fixtureConOdds?.fixture;
  const fixtureId = fixtureData?.fixture?.id ?? fixtureData?.id ?? null;
  const tieneFixture = Boolean(fixtureId);
  const tieneOdds = fixtureConOdds?.odds !== null && 
                    fixtureConOdds?.odds !== undefined &&
                    (fixtureConOdds.odds.home || fixtureConOdds.odds.draw || fixtureConOdds.odds.away);
  const fechaPartido = (fixtureData?.fixture?.date ?? fixtureData?.date)
    ? new Date(fixtureData?.fixture?.date ?? fixtureData?.date).toLocaleString('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  // Goles esperados totales: promedios combinados o suma de xG estimados por equipo
  const totalFromPredicciones = Number(predicciones.promedioTotalGolesEsperados);
  const xgTotalA = resolveDisplayXg(equipoA).value;
  const xgTotalB = resolveDisplayXg(equipoB).value;
  const totalGolesEsperados =
    Number.isFinite(totalFromPredicciones) && totalFromPredicciones > 0
      ? totalFromPredicciones.toFixed(2)
      : xgTotalA != null && xgTotalB != null
        ? (xgTotalA + xgTotalB).toFixed(2)
        : ((equipoA?.promedioGolesFavor || 0) + (equipoB?.promedioGolesFavor || 0)).toFixed(2);
  
  const diferenciaForma = predicciones.puntosFormaA - predicciones.puntosFormaB;
  const equipoFavorito = diferenciaForma > 2 ? 'A' : diferenciaForma < -2 ? 'B' : null;
  const nombreEquipoFavorito = equipoFavorito === 'A' ? equipoA?.nombre : equipoFavorito === 'B' ? equipoB?.nombre : null;

  const tituloStyle = {
    fontSize: tokens.typography.fontSize2xl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.lg,
    textAlign: 'center',
    borderBottom: `2px solid ${tokens.colors.borderDefault}`,
    paddingBottom: tokens.spacing.md,
  };

  const labelStyle = getAdvancedMetricLabelStyle({ marginBottom: tokens.spacing.xs }, 'dark', 'compact');

  const recomendacionStyle = {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    borderLeft: `4px solid ${tokens.colors.accentOrange}`,
    textAlign: 'center',
  };

  const mensajeStyle = {
    marginTop: tokens.spacing.lg,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    borderLeft: `4px solid ${tokens.colors.accentNeutral}`,
    textAlign: 'center',
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeBase,
  };

  // Calcular probabilidades de la API si están disponibles
  const calcularProbabilidadesAPI = (odds) => {
    if (!odds || (!odds.home && !odds.draw && !odds.away)) return null;
    
    // Convertir odds a probabilidades (1/odd * 100)
    const probHome = odds.home ? ((1 / odds.home) * 100).toFixed(1) : null;
    const probDraw = odds.draw ? ((1 / odds.draw) * 100).toFixed(1) : null;
    const probAway = odds.away ? ((1 / odds.away) * 100).toFixed(1) : null;
    
    return { probHome, probDraw, probAway };
  };

  const probabilidadesAPI = tieneOdds ? calcularProbabilidadesAPI(fixtureConOdds.odds) : null;

  // Calcular probabilidades GoalLogic
  const probabilidadesGoalLogic = calculateFinalGoalLogicProbabilities(
    equipoA,
    equipoB,
    datosAdicionales || { lesiones: { equipoA: { jugadores: [] }, equipoB: { jugadores: [] } } }
  );

  return (
    <div className="predicciones-resumen-ejecutivo">
      <PrediccionesSectionTitle
        as="h2"
        size="xl"
        icon={IconInformeGeneral}
        style={tituloStyle}
      >
        {PREDICCIONES_TITLES.informeGeneral}
      </PrediccionesSectionTitle>
      
      {/* Mostrar probabilidades de la API y GoalLogic si están disponibles */}
      {tieneFixture && tieneOdds && probabilidadesAPI && (
        <div style={{ marginBottom: tokens.spacing.lg, padding: tokens.spacing.md, backgroundColor: tokens.colors.bgSecondary, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.borderDefault}` }}>
          <PrediccionesSectionTitle
            as="div"
            size="base"
            align="center"
            icon={IconCuotasMercado}
            style={{ marginBottom: tokens.spacing.sm }}
          >
            {PREDICCIONES_TITLES.cuotasMercado}
          </PrediccionesSectionTitle>
          <div className="predicciones-resumen-probs" style={{ marginTop: tokens.spacing.sm }}>
            {probabilidadesAPI.probHome && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>{equipoA?.nombre || 'Local'}</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentOrange }}>{probabilidadesAPI.probHome}%</div>
                <div style={{ fontSize: tokens.typography.fontSizeSm, color: tokens.colors.accentGold, marginTop: tokens.spacing.xs, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  <BrandResponsiveText suffix=":" /> {(probabilidadesGoalLogic.local * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {probabilidadesAPI.probDraw && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>Empate</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentOrange }}>{probabilidadesAPI.probDraw}%</div>
                <div style={{ fontSize: tokens.typography.fontSizeSm, color: tokens.colors.accentGold, marginTop: tokens.spacing.xs, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  <BrandResponsiveText suffix=":" /> {(probabilidadesGoalLogic.empate * 100).toFixed(1)}%
                </div>
              </div>
            )}
            {probabilidadesAPI.probAway && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>{equipoB?.nombre || 'Visitante'}</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentOrange }}>{probabilidadesAPI.probAway}%</div>
                <div style={{ fontSize: tokens.typography.fontSizeSm, color: tokens.colors.accentGold, marginTop: tokens.spacing.xs, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  <BrandResponsiveText suffix=":" /> {(probabilidadesGoalLogic.visitante * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: tokens.spacing.lg, padding: tokens.spacing.md, backgroundColor: tokens.colors.bgSecondary, borderRadius: tokens.radius.md, border: `1px solid ${tokens.colors.borderDefault}` }}>
            <PrediccionesSectionTitle
              as="div"
              size="base"
              align="center"
              icon={IconVisionEstrategica}
              style={{ marginBottom: tokens.spacing.sm }}
            >
              {PREDICCIONES_TITLES.visionEstrategica}
            </PrediccionesSectionTitle>
            <div className="predicciones-resumen-probs" style={{ marginTop: tokens.spacing.sm }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>{equipoA?.nombre || 'Local'}</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentGold, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  {(probabilidadesGoalLogic.local * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>Empate</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentGold, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  {(probabilidadesGoalLogic.empate * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginBottom: tokens.spacing.xs }}>{equipoB?.nombre || 'Visitante'}</div>
                <div style={{ fontSize: tokens.typography.fontSizeXl, fontWeight: tokens.typography.fontWeightBold, color: tokens.colors.accentGold, cursor: 'help' }} title={`Probabilidad calculada por nuestro modelo interno ${BRAND_NAME}.`}>
                  {(probabilidadesGoalLogic.visitante * 100).toFixed(1)}%
                </div>
              </div>
            </div>
      </div>

      {tieneFixture && !tieneOdds && (
        <div style={{ ...mensajeStyle, borderLeftColor: tokens.colors.accentInfo }}>
          Partido programado{fechaPartido ? ` (${fechaPartido})` : ''}. Las cuotas del mercado aún no están disponibles.
        </div>
      )}

      {!tieneFixture && (
        <div style={mensajeStyle}>
          {fixtureConOdds?.message || 'No existe un partido programado entre estos dos equipos próximamente.'}
        </div>
      )}

      <div className="predicciones-kpis-row">
        <div className="predicciones-kpi-card">
          <span className="predicciones-kpi-label" style={labelStyle}>Goles Esperados</span>
          <div className="predicciones-kpi-value">{totalGolesEsperados}</div>
        </div>

        <div className="predicciones-kpi-card">
          <span className={`predicciones-kpi-label ${ADVANCED_METRIC_LABEL_CLASS}`} style={labelStyle}>{ML.over25}</span>
          <div className="predicciones-kpi-value">{predicciones.promedioOver25?.toFixed(1) || '0'}%</div>
        </div>

        <div className="predicciones-kpi-card">
          <span className="predicciones-kpi-label" style={labelStyle}>Diferencia de Forma</span>
          <div className="predicciones-kpi-value">
            {diferenciaForma > 0 ? `+${diferenciaForma}` : diferenciaForma}
          </div>
        </div>
      </div>

      {equipoFavorito && nombreEquipoFavorito && (
        <div style={recomendacionStyle}>
          <div style={{ fontSize: tokens.typography.fontSizeLg, fontWeight: tokens.typography.fontWeightSemibold, color: tokens.colors.textPrimary, marginBottom: tokens.spacing.xs }}>
            ⭐ {nombreEquipoFavorito} llega con mejor forma reciente
          </div>
          <div style={{ fontSize: tokens.typography.fontSizeBase, color: tokens.colors.textSecondary }}>
            {equipoFavorito === 'A' 
              ? `+${predicciones.puntosFormaA - predicciones.puntosFormaB} puntos en últimos partidos`
              : `+${predicciones.puntosFormaB - predicciones.puntosFormaA} puntos en últimos partidos`
            }
          </div>
        </div>
      )}
    </div>
  );
}
