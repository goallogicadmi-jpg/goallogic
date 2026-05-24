import React, { useMemo } from 'react';
import { tokens } from '../../styles/tokens';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import PrediccionesSectionTitle from './PrediccionesSectionTitle';
import { IconEstadoPlantel } from './PrediccionesIcons';
import {
  IMPACTO_NIVEL,
  MAX_LESIONES_VISIBLES,
  selectInjuriesByImpactPriority,
  buildHighImpactInjuryConclusion,
} from '../../utils/evaluateInjuryImpact';

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

  const jugadoresVisibles = useMemo(() => {
    if (Array.isArray(datos?.jugadoresVisibles) && datos.jugadoresVisibles.length > 0) {
      return datos.jugadoresVisibles;
    }
    return selectInjuriesByImpactPriority(datos?.jugadores || [], MAX_LESIONES_VISIBLES);
  }, [datos?.jugadores, datos?.jugadoresVisibles]);

  const conclusionAlto = useMemo(
    () => buildHighImpactInjuryConclusion(nombreEquipo, datos?.jugadores || []),
    [datos?.jugadores, nombreEquipo]
  );

  const totalLesionados = datos?.total ?? 0;
  const hayMasDeLasMostradas = totalLesionados > jugadoresVisibles.length;

  const cardStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
    height: '100%',
  };

  if (!totalLesionados) {
    return (
      <div style={cardStyle}>
        <div style={{ fontWeight: tokens.typography.fontWeightSemibold, marginBottom: tokens.spacing.sm }}>
          {nombreEquipo}
        </div>
        <p style={{ color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeSm, margin: 0 }}>
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
          <div style={{ fontWeight: tokens.typography.fontWeightSemibold, color: tokens.colors.textPrimary }}>
            {nombreEquipo}
          </div>
          <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginTop: 4 }}>
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
              color: tokens.colors.textPrimary,
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
          color: tokens.colors.textSecondary,
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
            color: tokens.colors.textPrimary,
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
                backgroundColor: tokens.colors.bgCard,
                border: `1px solid ${tokens.colors.borderDefault}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: tokens.spacing.sm, flexWrap: 'wrap' }}>
                <div>
                  <strong style={{ color: tokens.colors.textPrimary }}>{lesion.jugador}</strong>
                  <span style={{ color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeSm }}>
                    {' '}
                    · {lesion.posicion}
                  </span>
                  {lesion.razon && (
                    <div style={{ fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textMuted, marginTop: 2 }}>
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
                    color: tokens.colors.textSecondary,
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
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
                    gap: 4,
                    marginTop: tokens.spacing.xs,
                    fontSize: '10px',
                    color: tokens.colors.textMuted,
                  }}
                >
                  <span>Tit. {lesion.factores.titularidad}%</span>
                  <span>Of. {lesion.factores.ofensivo}%</span>
                  <span>Def. {lesion.factores.defensivo}%</span>
                  <span>Rat. {lesion.factores.rating}%</span>
                  <span>Prof. {lesion.factores.profundidad}%</span>
                </div>
              )}

              {lesion.resumen && (
                <p style={{ margin: `${tokens.spacing.xs} 0 0`, fontSize: tokens.typography.fontSizeXs, color: tokens.colors.textSecondary }}>
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

export default function LesionadosEquipo({ lesiones, nombreEquipoA, nombreEquipoB }) {
  if (!lesiones) return null;

  const containerStyle = {
    backgroundColor: tokens.colors.bgCard,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginTop: tokens.spacing.xl,
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: tokens.spacing.lg,
    marginTop: tokens.spacing.md,
  };

  return (
    <section style={containerStyle} aria-labelledby="predicciones-lesionados-heading">
      <PrediccionesSectionTitle
        as="h3"
        size="lg"
        icon={IconEstadoPlantel}
        style={{ marginBottom: tokens.spacing.sm }}
      >
        {PREDICCIONES_TITLES.lesionadosEquipo}
      </PrediccionesSectionTitle>
      <p
        style={{
          margin: `0 0 ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSizeSm,
          color: tokens.colors.textSecondary,
          lineHeight: tokens.typography.lineHeightRelaxed,
        }}
      >
        Máximo {MAX_LESIONES_VISIBLES} bajas por equipo, priorizadas por impacto del motor (alto, moderado, bajo).
        GoalLogic ajusta las probabilidades según el impacto agregado de toda la lista.
      </p>
      <div style={gridStyle}>
        <TeamInjuryColumn nombreEquipo={nombreEquipoA || 'Equipo A'} datos={lesiones.equipoA} />
        <TeamInjuryColumn nombreEquipo={nombreEquipoB || 'Equipo B'} datos={lesiones.equipoB} />
      </div>
    </section>
  );
}

