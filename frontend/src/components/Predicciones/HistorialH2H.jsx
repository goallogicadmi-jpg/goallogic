import React from 'react';
import { MAX_H2H_FIXTURES_VISIBLE } from '../../utils/h2hFixturesUtils';

const LOGO_SIZE = 28;

function TeamCell({ nombre, logo, alineacion = 'left' }) {
  const isRight = alineacion === 'right';

  return (
    <div
      className={`h2h-team-cell${isRight ? ' h2h-team-cell--right' : ''}`}
    >
      {logo ? (
        <img
          src={logo}
          alt={nombre}
          width={LOGO_SIZE}
          height={LOGO_SIZE}
          className="h2h-team-logo"
          loading="lazy"
        />
      ) : (
        <span
          className="h2h-team-logo h2h-team-logo--placeholder"
          aria-hidden
        />
      )}
      <span
        className={`h2h-team-name${isRight ? ' h2h-team-name--right' : ''}`}
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
      <p className="h2h-panel-summary">
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
        <p className="h2h-panel-empty">No hay detalle de partidos disponible.</p>
      ) : (
        <ul className="h2h-match-list">
          {partidos.map((partido, index) => {
            const fechaStr = formatFecha(partido.fecha);
            return (
              <li
                key={partido.fixtureId || `${partido.fecha}-${index}`}
                className="h2h-match-card"
              >
                <div className="h2h-match-meta">
                  {fechaStr && <span className="h2h-match-date">{fechaStr}</span>}
                  {partido.competicion && (
                    <span className="h2h-match-competition">
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

                <div className="h2h-match-row">
                  <TeamCell nombre={partido.local} logo={partido.logoLocal} alineacion="left" />
                  <div
                    className="h2h-score"
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
        <p className="h2h-panel-footnote">
          Solo se muestran los {MAX_H2H_FIXTURES_VISIBLE} enfrentamientos más recientes.
        </p>
      )}
    </div>
  );
}
