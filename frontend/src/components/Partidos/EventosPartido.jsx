import React, { useEffect, useState } from "react";
import { getFixtureEvents } from "../../api/api";
import "../../styles/partidos.css";

/**
 * EventosPartido - Componente para mostrar eventos del partido
 * @param {number} fixtureId - ID del partido
 * @param {Object} partido - Datos del partido (para obtener IDs de equipos)
 */
export default function EventosPartido({ fixtureId, partido }) {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarEventos = async () => {
      if (!fixtureId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getFixtureEvents(fixtureId);
        
        if (data && data.response && Array.isArray(data.response)) {
          setEventos(data.response);
        } else {
          setEventos([]);
        }
      } catch (err) {
        console.error("Error cargando eventos:", err);
        setError("Error al cargar eventos del partido");
      } finally {
        setLoading(false);
      }
    };

    cargarEventos();
  }, [fixtureId]);

  const obtenerIconoEvento = (tipo) => {
    const tipoLower = tipo?.toLowerCase() || "";
    if (tipoLower.includes("goal")) return "⚽";
    if (tipoLower.includes("card")) {
      if (tipoLower.includes("yellow")) return "🟨";
      if (tipoLower.includes("red")) return "🟥";
      return "🟨";
    }
    if (tipoLower.includes("subst")) return "🔄";
    if (tipoLower.includes("var")) return "📺";
    return "•";
  };

  const obtenerColorEvento = (tipo) => {
    const tipoLower = tipo?.toLowerCase() || "";
    if (tipoLower.includes("goal")) return "#4FC3F7";
    if (tipoLower.includes("card")) {
      if (tipoLower.includes("red")) return "#e74c3c";
      return "#f39c12";
    }
    if (tipoLower.includes("subst")) return "#3498db";
    return "#95a5a6";
  };

  if (loading) {
    return (
      <div className="match-center-loading">
        <p>Cargando eventos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-center-error">
        <p>{error}</p>
      </div>
    );
  }

  if (eventos.length === 0) {
    return (
      <div className="match-center-empty">
        <p>No hay eventos disponibles para este partido.</p>
      </div>
    );
  }

  // Separar eventos por equipo usando los IDs del partido
  const equipoLocalId = partido?.teams?.home?.id;
  const equipoVisitanteId = partido?.teams?.away?.id;
  
  const eventosLocal = eventos.filter((e) => e.team?.id === equipoLocalId);
  const eventosVisitante = eventos.filter((e) => e.team?.id === equipoVisitanteId);

  return (
    <div className="eventos-container">
      <div className="eventos-timeline">
        {/* Eventos del equipo local */}
        <div className="eventos-columna eventos-local">
          {eventosLocal.map((evento, index) => (
            <div key={index} className="evento-item">
              <div
                className="evento-icono"
                style={{ color: obtenerColorEvento(evento.type?.name) }}
              >
                {obtenerIconoEvento(evento.type?.name)}
              </div>
              <div className="evento-info">
                <div className="evento-minuto">{evento.time?.elapsed}'</div>
                <div className="evento-detalle">
                  <span className="evento-tipo">{evento.type?.name || "Evento"}</span>
                  {evento.player?.name && (
                    <span className="evento-jugador">{evento.player.name}</span>
                  )}
                  {evento.assist?.name && (
                    <span className="evento-asistencia">
                      Asistencia: {evento.assist.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Línea central del tiempo */}
        <div className="eventos-tiempo">
          {Array.from({ length: 90 }, (_, i) => i + 1)
            .filter((min) => min % 10 === 0 || min === 45 || min === 90)
            .map((min) => (
              <div key={min} className="tiempo-marca">
                {min}'
              </div>
            ))}
        </div>

        {/* Eventos del equipo visitante */}
        <div className="eventos-columna eventos-visitante">
          {eventosVisitante.map((evento, index) => (
            <div key={index} className="evento-item">
              <div className="evento-info">
                <div className="evento-minuto">{evento.time?.elapsed}'</div>
                <div className="evento-detalle">
                  <span className="evento-tipo">{evento.type?.name || "Evento"}</span>
                  {evento.player?.name && (
                    <span className="evento-jugador">{evento.player.name}</span>
                  )}
                  {evento.assist?.name && (
                    <span className="evento-asistencia">
                      Asistencia: {evento.assist.name}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="evento-icono"
                style={{ color: obtenerColorEvento(evento.type?.name) }}
              >
                {obtenerIconoEvento(evento.type?.name)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
