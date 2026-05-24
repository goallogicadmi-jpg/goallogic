import React from 'react';
import { tokens } from '../../styles/tokens';
import { MAX_H2H_FIXTURES_VISIBLE } from '../../utils/h2hFixturesUtils';

const LOGO_SIZE = 28;

function TeamCell({ nombre, logo, alineacion = 'left' }) {
  const isRight = alineacion === 'right';

  return (
    <div
      className="h2h-team-cell"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: tokens.spacing.sm,
        flex: 1,
        minWidth: 0,
        justifyContent: isRight ? 'flex-end' : 'flex-start',
        flexDirection: isRight ? 'row-reverse' : 'row',
      }}
    >
      {logo ? (
        <img
          src={logo}
          alt={nombre}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="h2h-team-logo"
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            objectFit: 'contain',
            flexShrink: 0,
          }}
          loading="lazy"
        />
      ) : (
        <span
          className="h2h-team-logo h2h-team-logo--placeholder"
          style={{
            width: LOGO_SIZE,
            height: LOGO_SIZE,
            borderRadius: tokens.radius.sm,
            backgroundColor: tokens.colors.bgSecondary,
            flexShrink: 0,
          }}
          aria-hidden
        />
      )}
      <span
        style={{
          fontSize: tokens.typography.fontSizeSm,
          fontWeight: tokens.typography.fontWeightSemibold,
          color: tokens.colors.textPrimary,
          textAlign: isRight ? 'right' : 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={nombre}
      >
        {nombre}
      </span>
    </div>
  );
}

function formatFecha(fecha) {
  if (!fecha) return null;
  try {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function formatMarcador(golesLocal, golesVisitante) {
  const gl = golesLocal ?? '–';
  const gv = golesVisitante ?? '–';
  return `${gl} - ${gv}`;
}

export default function HistorialH2H({ h2h }) {
  if (!h2h?.totalPartidos) return null;

  const partidos = h2h.partidosDetallados || [];
  const total = h2h.totalPartidos;
  const mostrados = partidos.length;

  return (
    <div className="h2h-panel">
      <p
        className="h2h-panel-summary"
        style={{
          margin: `0 0 ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSizeSm,
          color: tokens.colors.textSecondary,
          lineHeight: tokens.typography.lineHeightRelaxed,
        }}
      >
        {total} enfrentamiento{total !== 1 ? 's' : ''} histórico{total !== 1 ? 's' : ''} registrado
        {total !== 1 ? 's' : ''}
        {mostrados > 0 && mostrados < total && (
          <>
            {' '}
            · Últimos <strong>{mostrados}</strong> (más recientes primero)
          </>
        )}
      </p>

      {mostrados === 0 ? (
        <p style={{ color: tokens.colors.textMuted, fontSize: tokens.typography.fontSizeSm, margin: 0 }}>
          No hay detalle de partidos disponible.
        </p>
      ) : (
        <ul
          className="h2h-match-list"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.sm,
          }}
        >
          {partidos.map((partido, index) => {
            const fechaStr = formatFecha(partido.fecha);
            return (
              <li
                key={partido.fixtureId || `${partido.fecha}-${index}`}
                className="h2h-match-card"
                style={{
                  padding: tokens.spacing.md,
                  backgroundColor: tokens.colors.bgCard,
                  borderRadius: tokens.radius.md,
                  border: `1px solid ${tokens.colors.borderDefault}`,
                }}
              >
                <div
                  className="h2h-match-meta"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    marginBottom: tokens.spacing.sm,
                    flexWrap: 'wrap',
                  }}
                >
                  {fechaStr && (
                    <span
                      style={{
                        fontSize: tokens.typography.fontSizeXs,
                        color: tokens.colors.textMuted,
                        fontWeight: tokens.typography.fontWeightMedium,
                      }}
                    >
                      {fechaStr}
                    </span>
                  )}
                  {partido.competicion && (
                    <span
                      style={{
                        fontSize: tokens.typography.fontSizeXs,
                        color: tokens.colors.textSecondary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {partido.competicionLogo && (
                        <img
                          src={partido.competicionLogo}
                          alt={partido.competicion || 'Competición'}
                          width={14}
                          height={14}
                          style={{ objectFit: 'contain' }}
                          loading="lazy"
                        />
                      )}
                      {partido.competicion}
                    </span>
                  )}
                </div>

                <div
                  className="h2h-match-row"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                    gap: tokens.spacing.md,
                  }}
                >
                  <TeamCell nombre={partido.local} logo={partido.logoLocal} alineacion="left" />
                  <div
                    className="h2h-score"
                    style={{
                      fontSize: tokens.typography.fontSizeXl,
                      fontWeight: tokens.typography.fontWeightBold,
                      color: tokens.colors.textPrimary,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      padding: `0 ${tokens.spacing.xs}`,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    aria-label={`Marcador ${partido.local} ${formatMarcador(partido.golesLocal, partido.golesVisitante)} ${partido.visitante}`}
                  >
                    {formatMarcador(partido.golesLocal, partido.golesVisitante)}
                  </div>
                  <TeamCell nombre={partido.visitante} logo={partido.logoVisitante} alineacion="right" />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {total > MAX_H2H_FIXTURES_VISIBLE && (
        <p
          style={{
            margin: `${tokens.spacing.md} 0 0`,
            fontSize: tokens.typography.fontSizeXs,
            color: tokens.colors.textMuted,
          }}
        >
          Solo se muestran los {MAX_H2H_FIXTURES_VISIBLE} enfrentamientos más recientes.
        </p>
      )}
    </div>
  );
}

