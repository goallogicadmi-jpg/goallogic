import React from "react";
import BadgeEstado from "./BadgeEstado";
import "../../styles/partidos.css";

/**
 * PartidoDetalle - Componente para mostrar detalles completos de un partido
 * @param {Object} partido - Datos del partido
 * @param {Function} onClose - Función para cerrar el detalle
 */
export default function PartidoDetalle({ partido, onClose }) {
  if (!partido) return null;

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const estado = partido.fixture?.status?.short || "NS";
  const tieneResultado =
    partido.goals?.home !== null && partido.goals?.away !== null;

  return (
    <div className="partido-detalle-overlay" onClick={onClose}>
      <div
        className="partido-detalle-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="partido-detalle-header">
          <h3>Detalles del Partido</h3>
          <button className="partido-detalle-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="partido-detalle-body">
          {/* Información de la competición */}
          <div className="partido-detalle-seccion">
            <h4>Competición</h4>
            <p>{partido.league?.name || "N/A"}</p>
            <p className="partido-detalle-pais">
              {partido.league?.country || ""}
            </p>
          </div>

          {/* Equipos y resultado */}
          <div className="partido-detalle-equipos">
            <div className="partido-detalle-equipo">
              <p className="partido-detalle-equipo-nombre">
                {partido.teams?.home?.name || "N/A"}
              </p>
              {partido.teams?.home?.logo && (
                <img
                  src={partido.teams.home.logo}
                  alt={partido.teams.home.name}
                  className="partido-detalle-equipo-logo"
                />
              )}
            </div>

            <div className="partido-detalle-resultado">
              {tieneResultado ? (
                <>
                  <span className="partido-detalle-goles">
                    {partido.goals.home}
                  </span>
                  <span className="partido-detalle-separador">-</span>
                  <span className="partido-detalle-goles">
                    {partido.goals.away}
                  </span>
                </>
              ) : (
                <span className="partido-detalle-vs">VS</span>
              )}
            </div>

            <div className="partido-detalle-equipo">
              <p className="partido-detalle-equipo-nombre">
                {partido.teams?.away?.name || "N/A"}
              </p>
              {partido.teams?.away?.logo && (
                <img
                  src={partido.teams.away.logo}
                  alt={partido.teams.away.name}
                  className="partido-detalle-equipo-logo"
                />
              )}
            </div>
          </div>

          {/* Estado */}
          <div className="partido-detalle-seccion">
            <h4>Estado</h4>
            <BadgeEstado estado={estado} />
            {partido.fixture?.status?.long && (
              <p className="partido-detalle-estado-texto">
                {partido.fixture.status.long}
              </p>
            )}
          </div>

          {/* Fecha y hora */}
          <div className="partido-detalle-seccion">
            <h4>Fecha y Hora</h4>
            <p>{formatearFecha(partido.fixture?.date)}</p>
          </div>

          {/* Estadio */}
          {partido.fixture?.venue?.name && (
            <div className="partido-detalle-seccion">
              <h4>Estadio</h4>
              <p>{partido.fixture.venue.name}</p>
              {partido.fixture.venue.city && (
                <p className="partido-detalle-pais">
                  {partido.fixture.venue.city}
                </p>
              )}
            </div>
          )}

          {/* Árbitro */}
          {partido.fixture?.referee && (
            <div className="partido-detalle-seccion">
              <h4>Árbitro</h4>
              <p>{partido.fixture.referee}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
