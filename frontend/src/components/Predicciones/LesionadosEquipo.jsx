import React, { useCallback, useEffect, useRef, useState } from 'react';
import { tokens } from '../../styles/tokens';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import AccordionBlock from './AccordionBlock';
import AccordionPremiumLoader from './AccordionPremiumLoader';
import { IconEstadoPlantel } from './PrediccionesIcons';
import BrandResponsiveText from '../BrandResponsiveText';
import { getTeamInjuries, getTeamPlayersStats } from '../../api/api';
import { enrichTeamInjuries } from '../../utils/evaluateInjuryImpact';
import {
  IMPACTO_NIVEL,
  MAX_LESIONES_VISIBLES,
  selectInjuriesByImpactPriority,
  buildHighImpactInjuryConclusion,
} from '../../utils/evaluateInjuryImpact';

const INITIAL_STATE = {
  status: 'idle',
  lesiones: null,
  error: null,
};

const IMPACTO_STYLES = {
  [IMPACTO_NIVEL.BAJO]: {
    bg: 'rgba(34, 197, 94, 0.12)',
    border: tokens.colors.accentPositive,
    label: 'Impacto bajo',
  },
  [IMPACTO_NIVEL.MODERADO]: {
    bg: 'rgba(212, 160, 23, 0.12)',
    border: tokens.colors.accentGold,
    label: 'Impacto moderado',
  },
  [IMPACTO_NIVEL.ALTO]: {
    bg: 'rgba(239, 68, 68, 0.12)',
    border: tokens.colors.accentNegative,
    label: 'Impacto alto',
  },
};

function TeamInjuryColumn({ nombreEquipo, datos }) {
  const resumen = datos?.resumenImpacto;

  const jugadoresVisibles = React.useMemo(() => {
    if (Array.isArray(datos?.jugadoresVisibles) && datos.jugadoresVisibles.length > 0) {
      return datos.jugadoresVisibles;
    }
    return selectInjuriesByImpactPriority(datos?.jugadores || [], MAX_LESIONES_VISIBLES);
  }, [datos?.jugadores, datos?.jugadoresVisibles]);

  const conclusionAlto = React.useMemo(
    () => buildHighImpactInjuryConclusion(nombreEquipo, datos?.jugadores || []),
    [datos?.jugadores, nombreEquipo]
  );

  const totalLesionados = datos?.total ?? 0;
  const hayMasDeLasMostradas = totalLesionados > jugadoresVisibles.length;

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: tokens.spacing.md,
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    height: '100%',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.22)',
  };

  if (!totalLesionados) {
    return (
      <div style={cardStyle}>
        <div style={{ fontWeight: tokens.typography.fontWeightSemibold, marginBottom: tokens.spacing.sm, color: '#ffffff' }}>
          {nombreEquipo}
        </div>
        <p style={{ color: '#9aa4b2', fontSize: tokens.typography.fontSizeSm, margin: 0 }}>
          No hay bajas registradas para este equipo con la competición y temporada consultadas.
          {datos?.fetchMeta?.season
            ? ` (temporada ${datos.fetchMeta.season}${datos.fetchMeta.leagueId ? `, liga ${datos.fetchMeta.leagueId}` : ''})`
            : ''}
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ fontWeight: tokens.typography.fontWeightSemibold, color: '#ffffff' }}>
            {nombreEquipo}
          </div>
          <div style={{ fontSize: tokens.typography.fontSizeXs, color: '#9aa4b2', marginTop: 4 }}>
            {totalLesionados} lesionado{totalLesionados !== 1 ? 's' : ''} en total
            {datos.plantillaAnalizada > 0 && ` · ${datos.plantillaAnalizada} jugadores analizados`}
          </div>
        </div>
        {resumen && (
          <span
            className={`predicciones-impacto-badge predicciones-impacto-${resumen.nivel}`}
            style={{
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
              borderRadius: tokens.radius.sm,
              fontSize: tokens.typography.fontSizeXs,
              fontWeight: tokens.typography.fontWeightSemibold,
              backgroundColor: IMPACTO_STYLES[resumen.nivel]?.bg,
              border: `1px solid ${IMPACTO_STYLES[resumen.nivel]?.border}`,
              color: '#ffffff',
            }}
          >
            {resumen.etiqueta}
          </span>
        )}
      </div>

      <p
        style={{
          margin: `0 0 ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSizeXs,
          color: '#9aa4b2',
          lineHeight: tokens.typography.lineHeightRelaxed,
        }}
      >
        {hayMasDeLasMostradas ? (
          <>
            Se muestran las <strong>{jugadoresVisibles.length}</strong> bajas más relevantes de{' '}
            <strong>{totalLesionados}</strong>, ordenadas por impacto del motor (alto → moderado → bajo).
          </>
        ) : (
          <>
            Se muestran las <strong>{jugadoresVisibles.length}</strong> baja
            {jugadoresVisibles.length !== 1 ? 's' : ''} registrada
            {jugadoresVisibles.length !== 1 ? 's' : ''}, ordenadas por impacto del motor.
          </>
        )}
      </p>

      {conclusionAlto && (
        <div
          style={{
            marginBottom: tokens.spacing.md,
            padding: tokens.spacing.sm,
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            borderRadius: tokens.radius.sm,
            borderLeft: `4px solid ${tokens.colors.accentNegative}`,
            fontSize: tokens.typography.fontSizeSm,
            color: '#ffffff',
            lineHeight: tokens.typography.lineHeightRelaxed,
          }}
        >
          {conclusionAlto}
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
        {jugadoresVisibles.map((lesion, index) => {
          const impactoStyle = IMPACTO_STYLES[lesion.impacto] || IMPACTO_STYLES[IMPACTO_NIVEL.BAJO];
          return (
            <li
              key={lesion.jugadorId || `${lesion.jugador}-${index}`}
              style={{
                padding: tokens.spacing.sm,
                borderRadius: tokens.radius.sm,
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: '#ffffff' }}>{lesion.jugador}</strong>
                  <span style={{ color: '#9aa4b2', fontSize: tokens.typography.fontSizeSm }}>
                    {' '}
                    · {lesion.posicion}
                  </span>
                  {lesion.razon && (
                    <div style={{ fontSize: tokens.typography.fontSizeXs, color: '#9aa4b2', marginTop: 2 }}>
                      {lesion.razon}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: tokens.typography.fontSizeXs,
                    fontWeight: tokens.typography.fontWeightSemibold,
                    color: impactoStyle.border,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {impactoStyle.label}
                </span>
              </div>

              {lesion.estadisticas && lesion.datosDisponibles !== false && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: tokens.spacing.sm,
                    marginTop: tokens.spacing.xs,
                    fontSize: tokens.typography.fontSizeXs,
                    color: '#9aa4b2',
                  }}
                >
                  <span>Titular: {lesion.estadisticas.titularidades}/{lesion.estadisticas.partidos}</span>
                  <span>Min: {lesion.estadisticas.minutos}</span>
                  {(lesion.estadisticas.goles > 0 || lesion.estadisticas.asistencias > 0) && (
                    <span>
                      G/A: {lesion.estadisticas.goles}/{lesion.estadisticas.asistencias}
                    </span>
                  )}
                  {lesion.estadisticas.rating && <span>Rating: {lesion.estadisticas.rating}</span>}
                </div>
              )}

              {lesion.factores && (
                <div className="predicciones-lesion-factores-grid">
                  <span>Tit. {lesion.factores.titularidad}%</span>
                  <span>Of. {lesion.factores.ofensivo}%</span>
                  <span>Def. {lesion.factores.defensivo}%</span>
                  <span>Rat. {lesion.factores.rating}%</span>
                  <span>Prof. {lesion.factores.profundidad}%</span>
                </div>
              )}

              {lesion.resumen && (
                <p style={{ margin: `${tokens.spacing.xs} 0 0`, fontSize: tokens.typography.fontSizeXs, color: '#9aa4b2' }}>
                  {lesion.resumen}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function LesionadosEquipo({ lazyContext, nombreEquipoA, nombreEquipoB }) {
  const [fetchState, setFetchState] = useState(INITIAL_STATE);
  const loadedRef = useRef(false);
  const loadingRef = useRef(false);
  const cacheRef = useRef(null);

  const contextKey = lazyContext
    ? `${lazyContext.equipoAId}-${lazyContext.equipoBId}-${lazyContext.fixtureId ?? 'none'}-${lazyContext.seasonA}-${lazyContext.seasonB}`
    : null;

  useEffect(() => {
    loadedRef.current = false;
    loadingRef.current = false;
    cacheRef.current = null;
    setFetchState(INITIAL_STATE);
  }, [contextKey]);

  const loadLesiones = useCallback(async () => {
    if (!lazyContext || loadedRef.current || loadingRef.current) {
      return;
    }

    if (cacheRef.current) {
      loadedRef.current = true;
      setFetchState({ status: 'loaded', lesiones: cacheRef.current, error: null });
      return;
    }

    const { prefetch } = lazyContext;

    if (prefetch && !prefetch.ready) {
      setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));
      return;
    }

    loadingRef.current = true;
    setFetchState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const { equipoAId, equipoBId, ligaA, ligaB, seasonA, seasonB, fixtureId, prefetch } = lazyContext;

      const fetchPlayersStatsA = () =>
        getTeamPlayersStats(equipoAId, ligaA, seasonA).catch((err) => {
          console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo A:', err);
          return { response: [] };
        });

      const fetchPlayersStatsB = () =>
        getTeamPlayersStats(equipoBId, ligaB, seasonB).catch((err) => {
          console.warn('⚠️ Error obteniendo estadísticas de jugadores equipo B:', err);
          return { response: [] };
        });

      const resolvePlayersStatsA = () => {
        if (prefetch?.ready && prefetch?.playersStatsA) {
          return Promise.resolve(prefetch.playersStatsA);
        }
        return fetchPlayersStatsA();
      };

      const resolvePlayersStatsB = () => {
        if (prefetch?.ready && prefetch?.playersStatsB) {
          return Promise.resolve(prefetch.playersStatsB);
        }
        return fetchPlayersStatsB();
      };

      const [injuriesA, injuriesB, playersStatsA, playersStatsB] = await Promise.all([
        getTeamInjuries(equipoAId, {
          leagueId: ligaA,
          season: seasonA,
          fixtureId: fixtureId ?? null,
        }).catch((err) => {
          console.warn('⚠️ Error obteniendo lesiones equipo A:', err);
          return { response: [], meta: { error: err.message } };
        }),
        getTeamInjuries(equipoBId, {
          leagueId: ligaB,
          season: seasonB,
          fixtureId: fixtureId ?? null,
        }).catch((err) => {
          console.warn('⚠️ Error obteniendo lesiones equipo B:', err);
          return { response: [], meta: { error: err.message } };
        }),
        resolvePlayersStatsA(),
        resolvePlayersStatsB(),
      ]);

      const lesiones = {
        equipoA: {
          ...enrichTeamInjuries(injuriesA, playersStatsA),
          fetchMeta: injuriesA?.meta || null,
        },
        equipoB: {
          ...enrichTeamInjuries(injuriesB, playersStatsB),
          fetchMeta: injuriesB?.meta || null,
        },
      };

      cacheRef.current = lesiones;
      loadedRef.current = true;
      setFetchState({ status: 'loaded', lesiones, error: null });
    } catch (err) {
      setFetchState({
        status: 'error',
        lesiones: null,
        error: err?.message || 'No se pudieron cargar los lesionados.',
      });
    } finally {
      loadingRef.current = false;
    }
  }, [lazyContext]);

  useEffect(() => {
    if (fetchState.status !== 'loading' || lazyContext?.prefetch?.ready !== true) {
      return;
    }
    if (!loadedRef.current && !loadingRef.current) {
      loadLesiones();
    }
  }, [lazyContext?.prefetch?.ready, fetchState.status, loadLesiones]);

  const handleOpenChange = useCallback(
    (isOpen) => {
      if (isOpen) {
        loadLesiones();
      }
    },
    [loadLesiones]
  );

  if (!lazyContext) {
    return null;
  }

  const nombreA = nombreEquipoA || lazyContext.nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || lazyContext.nombreEquipoB || 'Equipo B';
  const { status, lesiones, error } = fetchState;

  const descriptionStyle = {
    margin: `0 0 ${tokens.spacing.md}`,
    fontSize: tokens.typography.fontSizeSm,
    color: '#9aa4b2',
    lineHeight: tokens.typography.lineHeightRelaxed,
  };

  return (
    <AccordionBlock
      className="predicciones-accordion-block--spaced-lg"
      title={PREDICCIONES_TITLES.lesionadosEquipo}
      icon={<IconEstadoPlantel size={18} />}
      defaultOpenDesktop={false}
      defaultOpenMobile={false}
      onOpenChange={handleOpenChange}
    >
      {status === 'loading' && <AccordionPremiumLoader message="Cargando lesionados del equipo…" />}

      {status === 'error' && (
        <p className="predicciones-accordion-error" role="alert">
          {error}
        </p>
      )}

      {status === 'loaded' && lesiones && (
        <>
          <p style={descriptionStyle}>
            Máximo {MAX_LESIONES_VISIBLES} bajas por equipo, priorizadas por impacto del motor (alto, moderado, bajo).
            <BrandResponsiveText /> ajusta las probabilidades según el impacto agregado de toda la lista.
          </p>
          <div className="predicciones-lesionados-grid">
            <TeamInjuryColumn nombreEquipo={nombreA} datos={lesiones.equipoA} />
            <TeamInjuryColumn nombreEquipo={nombreB} datos={lesiones.equipoB} />
          </div>
        </>
      )}
    </AccordionBlock>
  );
}
