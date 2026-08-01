import React from 'react';
import AccordionBlock from './AccordionBlock';
import { tokens } from '../../styles/tokens';
import { PREDICCIONES_TITLES } from '../../constants/prediccionesSectionTitles';
import PrediccionesSectionTitle from './PrediccionesSectionTitle';
import {
  IconDatosComplementarios,
  IconHistorialDirecto,
  IconReferentesOfensivos,
} from './PrediccionesIcons';
import HistorialH2H from './HistorialH2H';

export default function DatosAdicionales({ datosAdicionales, nombreEquipoA, nombreEquipoB }) {
  if (!datosAdicionales) return null;

  const nombreA = nombreEquipoA || 'Equipo A';
  const nombreB = nombreEquipoB || 'Equipo B';

  const listaStyle = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  };

  const itemStyle = {
    padding: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.sm,
    fontSize: tokens.typography.fontSizeSm,
    color: tokens.colors.textSecondary,
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacing.md,
  };

  const cardStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  return (
    <div style={{ marginTop: tokens.spacing.xl }}>
      <PrediccionesSectionTitle
        as="h3"
        size="lg"
        icon={IconDatosComplementarios}
        className="predicciones-datos-complementarios-heading"
      >
        {PREDICCIONES_TITLES.datosComplementarios}
      </PrediccionesSectionTitle>

      {datosAdicionales.h2h && datosAdicionales.h2h.totalPartidos > 0 && (
        <AccordionBlock
          title={PREDICCIONES_TITLES.historialDirecto}
          icon={<IconHistorialDirecto size={18} />}
        >
          <HistorialH2H h2h={datosAdicionales.h2h} />
        </AccordionBlock>
      )}

      {datosAdicionales.goleadores &&
        (datosAdicionales.goleadores.equipoA.total > 0 || datosAdicionales.goleadores.equipoB.total > 0) && (
          <AccordionBlock
            title={PREDICCIONES_TITLES.referentesOfensivos}
            icon={<IconReferentesOfensivos size={18} />}
          >
            <div style={gridStyle}>
              <div style={cardStyle}>
                <div
                  style={{
                    fontSize: tokens.typography.fontSizeBase,
                    fontWeight: tokens.typography.fontWeightSemibold,
                    color: tokens.colors.textPrimary,
                    marginBottom: tokens.spacing.sm,
                  }}
                >
                  {nombreA} - Top 5
                </div>
                <ul style={listaStyle}>
                  {datosAdicionales.goleadores.equipoA.jugadores.slice(0, 5).map((jugador, index) => (
                    <li key={index} style={itemStyle}>
                      <strong>{jugador.nombre}</strong> - {jugador.goles} goles
                      {jugador.asistencias > 0 && (
                        <span style={{ color: tokens.colors.textMuted }}> ({jugador.asistencias} asistencias)</span>
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
                    color: tokens.colors.textPrimary,
                    marginBottom: tokens.spacing.sm,
                  }}
                >
                  {nombreB} - Top 5
                </div>
                <ul style={listaStyle}>
                  {datosAdicionales.goleadores.equipoB.jugadores.slice(0, 5).map((jugador, index) => (
                    <li key={index} style={itemStyle}>
                      <strong>{jugador.nombre}</strong> - {jugador.goles} goles
                      {jugador.asistencias > 0 && (
                        <span style={{ color: tokens.colors.textMuted }}> ({jugador.asistencias} asistencias)</span>
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


