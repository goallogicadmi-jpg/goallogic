import React, { useState } from 'react';
import EstadisticasAvanzadasEquipo from '../EstadisticasAvanzadasEquipo';
import { tokens } from '../../styles/tokens';
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from '../../constants/advancedMetricLabels';
import { IconChevronDown } from './PrediccionesIcons';

/**
 * FichaEquipoSimplificada - Versión simplificada de FichaEquipo con acordeón
 * Solo reorganización visual, mantiene toda la lógica intacta
 */
export default function FichaEquipoSimplificada({ equipo, tipo }) {
  const [mostrarAvanzadas, setMostrarAvanzadas] = useState(false);

  // Calcular forma reciente (misma lógica)
  const calcularFormaReciente = () => {
    if (!equipo.ultimosPartidos || equipo.ultimosPartidos.length === 0) {
      return null;
    }
    const resultados = equipo.ultimosPartidos.map(p => p.resultado);
    return resultados.join(" ");
  };

  const formaReciente = calcularFormaReciente();

  // Calcular tendencias básicas (misma lógica)
  const calcularTendencias = () => {
    if (!equipo.ultimosPartidos || equipo.ultimosPartidos.length === 0) {
      return null;
    }

    let over25 = 0;
    let btts = 0;
    let totalPartidos = equipo.ultimosPartidos.length;

    equipo.ultimosPartidos.forEach(partido => {
      const totalGoles = partido.golesFavor + partido.golesContra;
      if (totalGoles > 2.5) over25++;
      if (partido.golesFavor > 0 && partido.golesContra > 0) btts++;
    });

    return {
      over25Porcentaje: totalPartidos > 0 ? Math.round((over25 / totalPartidos) * 100) : 0,
      bttsPorcentaje: totalPartidos > 0 ? Math.round((btts / totalPartidos) * 100) : 0
    };
  };

  const tendencias = calcularTendencias();

  const containerStyle = {
    backgroundColor: tokens.colors.bgCard,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
  };

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottom: `2px solid ${tokens.colors.borderDefault}`,
  };

  const logoStyle = {
    width: '64px',
    height: '64px',
    objectFit: 'contain',
  };

  const nombreStyle = {
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    margin: 0,
  };

  const ligaStyle = {
    fontSize: tokens.typography.fontSizeSm,
    color: tokens.colors.textSecondary,
    margin: 0,
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  };

  const statCardStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    padding: tokens.spacing.sm,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
    textAlign: 'center',
  };

  const statLabelStyle = getAdvancedMetricLabelStyle({}, 'dark', 'compact');

  const statValueStyle = {
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    lineHeight: tokens.typography.lineHeightTight,
  };

  const formaContainerStyle = {
    display: 'flex',
    gap: tokens.spacing.xs,
    flexWrap: 'wrap',
    marginTop: tokens.spacing.sm,
  };

  const formaIndicadorStyle = (resultado) => {
    const color = resultado === "G" ? tokens.colors.accentPositive : 
                  resultado === "E" ? tokens.colors.accentGold : 
                  tokens.colors.accentNegative;
    return {
      backgroundColor: color,
      color: tokens.colors.textPrimary,
      padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
      borderRadius: tokens.radius.sm,
      fontSize: tokens.typography.fontSizeXs,
      fontWeight: tokens.typography.fontWeightSemibold,
      minWidth: '24px',
      textAlign: 'center',
    };
  };

  const botonExpandirStyle = {
    width: '100%',
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.md,
    color: tokens.colors.textSecondary,
    cursor: 'pointer',
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: tokens.typography.fontWeightMedium,
    marginTop: tokens.spacing.md,
    transition: tokens.transitions.normal,
  };

  const avanzadasContainerStyle = {
    maxHeight: mostrarAvanzadas ? '5000px' : '0',
    opacity: mostrarAvanzadas ? 1 : 0,
    overflow: 'hidden',
    transition: `max-height ${tokens.transitions.slow}, opacity ${tokens.transitions.normal}`,
    marginTop: mostrarAvanzadas ? tokens.spacing.md : '0',
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        {equipo.logo && (
          <img src={equipo.logo} alt={equipo.nombre} style={logoStyle} />
        )}
        <div>
          <h3 style={nombreStyle}>{equipo.nombre}</h3>
          <p style={ligaStyle}>{equipo.liga} • {equipo.pais}</p>
        </div>
      </div>

      {/* Estadísticas esenciales */}
      <div style={statsGridStyle}>
        {equipo.posicion !== null && equipo.posicion !== undefined && (
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Posición</div>
            <div style={statValueStyle}>{equipo.posicion}°</div>
          </div>
        )}
        {equipo.puntos !== null && equipo.puntos !== undefined && (
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Puntos</div>
            <div style={statValueStyle}>{equipo.puntos}</div>
          </div>
        )}
        {equipo.promedioGolesFavor !== null && equipo.promedioGolesFavor !== undefined && (
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Goles/Partido</div>
            <div style={statValueStyle}>{equipo.promedioGolesFavor.toFixed(2)}</div>
          </div>
        )}
        {equipo.promedioGolesContra !== null && equipo.promedioGolesContra !== undefined && (
          <div style={statCardStyle}>
            <div style={statLabelStyle}>Goles Recibidos/Partido</div>
            <div style={statValueStyle}>{equipo.promedioGolesContra.toFixed(2)}</div>
          </div>
        )}
      </div>

      {/* Forma reciente */}
      {formaReciente && (
        <div style={{ marginTop: tokens.spacing.md }}>
          <div style={statLabelStyle}>Forma Reciente</div>
          <div style={formaContainerStyle}>
            {equipo.ultimosPartidos.map((partido, index) => {
              const letra = partido.resultado === "G" ? "G" : 
                           partido.resultado === "E" ? "E" : "P";
              return (
                <span key={index} style={formaIndicadorStyle(partido.resultado)}>
                  {letra}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Tendencias básicas */}
      {tendencias && (
        <div
          style={{
            marginTop: tokens.spacing.md,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: tokens.spacing.md,
          }}
        >
          <div style={statCardStyle}>
            <div className={ADVANCED_METRIC_LABEL_CLASS} style={statLabelStyle}>{ML.over25}</div>
            <div style={statValueStyle}>{tendencias.over25Porcentaje}%</div>
          </div>
          <div style={statCardStyle}>
            <div style={statLabelStyle}>BTTS</div>
            <div style={statValueStyle}>{tendencias.bttsPorcentaje}%</div>
          </div>
        </div>
      )}

      {/* Botón para expandir estadísticas avanzadas */}
      {equipo.ultimosPartidos && equipo.ultimosPartidos.length > 0 && (
        <>
          <button 
            style={botonExpandirStyle}
            onClick={() => setMostrarAvanzadas(!mostrarAvanzadas)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: tokens.spacing.xs }}>
              <span
                style={{
                  display: 'inline-flex',
                  transform: mostrarAvanzadas ? 'rotate(180deg)' : 'rotate(-90deg)',
                  transition: tokens.transitions.normal,
                }}
              >
                <IconChevronDown size={16} color={tokens.colors.textSecondary} />
              </span>
              {mostrarAvanzadas ? 'Ocultar métricas avanzadas' : 'Ver métricas avanzadas'}
            </span>
          </button>
          <div style={avanzadasContainerStyle}>
            <EstadisticasAvanzadasEquipo 
              ultimosPartidos={equipo.ultimosPartidos}
              teamId={equipo.id}
              tipo={tipo}
            />
          </div>
        </>
      )}
    </div>
  );
}
