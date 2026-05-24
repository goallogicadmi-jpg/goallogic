import React, { useEffect, useState } from "react";
import { getFixtureLineups } from "../../api/api";
import PlayerModal from "./PlayerModal";
import "../../styles/partidos.css";

/**
 * AlineacionesPartido - Componente para mostrar alineaciones del partido
 * @param {number} fixtureId - ID del partido
 * @param {Object} partido - Datos del partido (para obtener IDs de equipos)
 * @param {Function} onTeamClick - Función para manejar clic en equipo
 */
export default function AlineacionesPartido({ fixtureId, partido, onTeamClick }) {
  const [alineaciones, setAlineaciones] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState(null);

  useEffect(() => {
    const cargarAlineaciones = async () => {
      if (!fixtureId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getFixtureLineups(fixtureId);
        
        if (data && data.response && Array.isArray(data.response)) {
          setAlineaciones(data.response);
        } else {
          setAlineaciones([]);
        }
      } catch (err) {
        console.error("Error cargando alineaciones:", err);
        setError("Error al cargar alineaciones del partido");
      } finally {
        setLoading(false);
      }
    };

    cargarAlineaciones();
  }, [fixtureId]);

  const obtenerFormacion = (alineacion) => {
    if (!alineacion || !alineacion.startXI) return "N/A";
    // Calcular formación basada en posiciones
    const posiciones = alineacion.startXI.map((p) => p.player?.pos || "");
    const defensores = posiciones.filter((p) => p === "D" || p === "M").length;
    const mediocampistas = posiciones.filter((p) => p === "M").length;
    const delanteros = posiciones.filter((p) => p === "F").length;
    return `${defensores}-${mediocampistas}-${delanteros}`;
  };

  if (loading) {
    return (
      <div className="match-center-loading">
        <p>Cargando alineaciones...</p>
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

  if (!alineaciones || alineaciones.length === 0) {
    return (
      <div className="match-center-empty">
        <p>No hay alineaciones disponibles para este partido.</p>
      </div>
    );
  }

  const alineacionLocal = alineaciones.find(
    (a) => a.team?.id === partido?.teams?.home?.id
  );
  const alineacionVisitante = alineaciones.find(
    (a) => a.team?.id === partido?.teams?.away?.id
  );

  return (
    <div className="alineaciones-container">
      {/* Alineación Local */}
      {alineacionLocal && (
        <div className="alineacion-equipo">
          <div className="alineacion-header">
            <div className="alineacion-equipo-info">
              {partido?.teams?.home?.logo && (
                <img
                  src={partido.teams.home.logo}
                  alt={partido.teams.home.name}
                  className="alineacion-equipo-logo"
                />
              )}
              <div>
                <h3 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTeamClick && partido?.teams?.home?.id) {
                      onTeamClick(partido.teams.home.id);
                    }
                  }}
                  style={{ cursor: onTeamClick && partido?.teams?.home?.id ? 'pointer' : 'default' }}
                >
                  {partido?.teams?.home?.name || "Equipo Local"}
                </h3>
                <p className="alineacion-formacion">
                  Formación: {alineacionLocal.formation || obtenerFormacion(alineacionLocal)}
                </p>
                {alineacionLocal.coach?.name && (
                  <p className="alineacion-entrenador">
                    DT: {alineacionLocal.coach.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="alineacion-titulares">
            <h4>Titulares</h4>
            <div className="alineacion-jugadores">
              {alineacionLocal.startXI?.map((jugador, index) => (
                <div 
                  key={index} 
                  className="alineacion-jugador"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (jugador.player?.id) {
                      setSelectedPlayerId(jugador.player.id);
                      setSelectedPlayerName(jugador.player.name);
                    }
                  }}
                >
                  <span className="alineacion-jugador-numero">
                    {jugador.player?.number || "?"}
                  </span>
                  <span className="alineacion-jugador-nombre">
                    {jugador.player?.name || "N/A"}
                  </span>
                  <span className="alineacion-jugador-posicion">
                    {jugador.player?.pos || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {alineacionLocal.substitutes && alineacionLocal.substitutes.length > 0 && (
            <div className="alineacion-suplentes">
              <h4>Suplentes</h4>
              <div className="alineacion-jugadores">
                {alineacionLocal.substitutes.map((jugador, index) => (
                  <div 
                    key={index} 
                    className="alineacion-jugador"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (jugador.player?.id) {
                        setSelectedPlayerId(jugador.player.id);
                        setSelectedPlayerName(jugador.player.name);
                      }
                    }}
                  >
                    <span className="alineacion-jugador-numero">
                      {jugador.player?.number || "?"}
                    </span>
                    <span className="alineacion-jugador-nombre">
                      {jugador.player?.name || "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Alineación Visitante */}
      {alineacionVisitante && (
        <div className="alineacion-equipo">
          <div className="alineacion-header">
            <div className="alineacion-equipo-info">
              {partido?.teams?.away?.logo && (
                <img
                  src={partido.teams.away.logo}
                  alt={partido.teams.away.name}
                  className="alineacion-equipo-logo"
                />
              )}
              <div>
                <h3 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTeamClick && partido?.teams?.away?.id) {
                      onTeamClick(partido.teams.away.id);
                    }
                  }}
                  style={{ cursor: onTeamClick && partido?.teams?.away?.id ? 'pointer' : 'default' }}
                >
                  {partido?.teams?.away?.name || "Equipo Visitante"}
                </h3>
                <p className="alineacion-formacion">
                  Formación: {alineacionVisitante.formation || obtenerFormacion(alineacionVisitante)}
                </p>
                {alineacionVisitante.coach?.name && (
                  <p className="alineacion-entrenador">
                    DT: {alineacionVisitante.coach.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="alineacion-titulares">
            <h4>Titulares</h4>
            <div className="alineacion-jugadores">
              {alineacionVisitante.startXI?.map((jugador, index) => (
                <div 
                  key={index} 
                  className="alineacion-jugador"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (jugador.player?.id) {
                      setSelectedPlayerId(jugador.player.id);
                      setSelectedPlayerName(jugador.player.name);
                    }
                  }}
                >
                  <span className="alineacion-jugador-numero">
                    {jugador.player?.number || "?"}
                  </span>
                  <span className="alineacion-jugador-nombre">
                    {jugador.player?.name || "N/A"}
                  </span>
                  <span className="alineacion-jugador-posicion">
                    {jugador.player?.pos || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {alineacionVisitante.substitutes && alineacionVisitante.substitutes.length > 0 && (
            <div className="alineacion-suplentes">
              <h4>Suplentes</h4>
              <div className="alineacion-jugadores">
                {alineacionVisitante.substitutes.map((jugador, index) => (
                  <div 
                    key={index} 
                    className="alineacion-jugador"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (jugador.player?.id) {
                        setSelectedPlayerId(jugador.player.id);
                        setSelectedPlayerName(jugador.player.name);
                      }
                    }}
                  >
                    <span className="alineacion-jugador-numero">
                      {jugador.player?.number || "?"}
                    </span>
                    <span className="alineacion-jugador-nombre">
                      {jugador.player?.name || "N/A"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de jugador */}
      {selectedPlayerId && (
        <PlayerModal
          playerId={selectedPlayerId}
          playerName={selectedPlayerName}
          onClose={() => {
            setSelectedPlayerId(null);
            setSelectedPlayerName(null);
          }}
        />
      )}
    </div>
  );
}
