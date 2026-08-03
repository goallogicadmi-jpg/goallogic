import React from 'react';
import AccordionBlock from './AccordionBlock';
import { tokens } from '../../styles/tokens';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import PrediccionesSectionTitle from './PrediccionesSectionTitle';
import AccordionPremiumLoader from './AccordionPremiumLoader';
import {
  IconDatosComplementarios,
  IconHistorialDirecto,
  IconReferentesOfensivos,
} from './PrediccionesIcons';
import HistorialH2H from './HistorialH2H';
import UltimosPartidosPredicciones from './UltimosPartidosPredicciones';

export default function DatosAdicionales({
  datosAdicionales,
  loadingDatosAdicionales = false,
  nombreEquipoA,
  nombreEquipoB,
  equipoAId,
  equipoBId,
}) {
  if (!datosAdicionales) return null;

  const nombreA = nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || 'Equipo B';
  const phase2Ready = datosAdicionales.accordionLazy?.prefetch?.ready === true;

  const listaStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const itemStyle = {
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '12px',
    fontSize: tokens.typography.fontSizeSm,
    color: '#9aa4b2',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  };

  const cardStyle = {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: tokens.spacing.md,
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
    minWidth: 0,
  };

  return (
    <div className="predicciones-datos-adicionales">
      <PrediccionesSectionTitle
        as="h3"
        size="lg"
        icon={IconDatosComplementarios}
        className="predicciones-datos-complementarios-heading"
      >
        {PREDICCIONES_TITLES.datosComplementarios}
      </PrediccionesSectionTitle>

      {loadingDatosAdicionales && (
        <AccordionPremiumLoader message="Preparando historial, goleadores y datos complementarios…" />
      )}

      {phase2Ready && datosAdicionales.h2h && datosAdicionales.h2h.totalPartidos > 0 && (
        <AccordionBlock
          title={PREDICCIONES_TITLES.historialDirecto}
          icon={<IconHistorialDirecto size={18} />}
        >
          <HistorialH2H h2h={datosAdicionales.h2h} />
        </AccordionBlock>
      )}

      <UltimosPartidosPredicciones
        equipoAId={equipoAId}
        equipoBId={equipoBId}
        nombreEquipoA={nombreA}
        nombreEquipoB={nombreB}
        lazyContext={datosAdicionales.accordionLazy}
      />

      {phase2Ready &&
        datosAdicionales.goleadores &&
        (datosAdicionales.goleadores.equipoA.total > 0 ||
          datosAdicionales.goleadores.equipoB.total > 0) && (
          <AccordionBlock
            title={PREDICCIONES_TITLES.referentesOfensivos}
            icon={<IconReferentesOfensivos size={18} />}
          >
            <div className="predicciones-datos-goleadores-grid">
              <div style={cardStyle}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSizeBase,
                    fontWeight: tokens.typography.fontWeightSemibold,
                    color: '#ffffff',
                    marginBottom: tokens.spacing.sm,
                  }}
                >
                  {nombreA} - Top 5
                </div>
                <ul style={listaStyle}>
                  {datosAdicionales.goleadores.equipoA.jugadores.slice(0, 5).map((jugador, index) => (
                    <li key={index} style={itemStyle}>
                      <strong style={{ color: '#ffffff' }}>{jugador.nombre}</strong> - {jugador.goles} goles
                      {jugador.asistencias > 0 && (
                        <span style={{ color: '#9aa4b2' }}> ({jugador.asistencias} asistencias)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={cardStyle}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSizeBase,
                    fontWeight: tokens.typography.fontWeightSemibold,
                    color: '#ffffff',
                    marginBottom: tokens.spacing.sm,
                  }}
                >
                  {nombreB} - Top 5
                </div>
                <ul style={listaStyle}>
                  {datosAdicionales.goleadores.equipoB.jugadores.slice(0, 5).map((jugador, index) => (
                    <li key={index} style={itemStyle}>
                      <strong style={{ color: '#ffffff' }}>{jugador.nombre}</strong> - {jugador.goles} goles
                      {jugador.asistencias > 0 && (
                        <span style={{ color: '#9aa4b2' }}> ({jugador.asistencias} asistencias)</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AccordionBlock>
        )}
    </div>
  );
}
