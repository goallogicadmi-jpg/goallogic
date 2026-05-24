import React, { useState, useEffect } from "react";
import { getJugadorInfo, getJugadorPartidos } from "../../api/api";
import PlayerMatchesTable from "../PlayerMatchesTable";
import "../../styles/partidos.css";

/**
 * PlayerModal - Modal para mostrar información detallada del jugador
 * @param {number} playerId - ID del jugador
 * @param {string} playerName - Nombre del jugador (para mostrar mientras carga)
 * @param {Function} onClose - Función para cerrar el modal
 */
export default function PlayerModal({ playerId, playerName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }

    const loadPlayerData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Cargar información del jugador
        const infoData = await getJugadorInfo(playerId);
        
        if (infoData.response && Array.isArray(infoData.response) && infoData.response.length > 0) {
          const player = infoData.response[0].player;
          const statistics = infoData.response[0].statistics || [];
          
          setPlayerInfo(player);
          
          // Obtener estadísticas de la temporada actual (última estadística)
          const latestStats = statistics.length > 0 ? statistics[statistics.length - 1] : null;
          setPlayerStats(latestStats);
          
          // Cargar partidos del jugador
          try {
            const matchesData = await getJugadorPartidos(playerId);
            setMatches(
              matchesData.response && Array.isArray(matchesData.response)
                ? matchesData.response.slice(0, 10)
                : []
            );
          } catch (matchesErr) {
            console.warn("Error cargando partidos del jugador:", matchesErr);
            setMatches([]);
          }
        } else {
          setError("No se encontró información del jugador");
        }
      } catch (err) {
        console.error("Error cargando datos del jugador:", err);
        setError(`Error al cargar información del jugador: ${err.message || "Error desconocido"}`);
      } finally {
        setLoading(false);
      }
    };

    loadPlayerData();
  }, [playerId]);

  // Función para traducir posiciones
  const translatePosition = (position) => {
    if (!position) return "N/D";
    const translations = {
      "Goalkeeper": "Portero",
      "Defender": "Defensor",
      "Midfielder": "Mediocampista",
      "Attacker": "Atacante",
      "Forward": "Delantero",
      "Winger": "Extremo",
      "Striker": "Delantero Centro"
    };
    return translations[position] || position;
  };

  const stats = playerStats?.games || {};
  const goals = playerStats?.goals || {};
  const cards = playerStats?.cards || {};
  const shots = playerStats?.shots || {};

  return (
    <div className="player-modal-overlay" onClick={onClose}>
      <div
        className="player-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="player-modal-header">
          <h2>{playerName || playerInfo?.name || "Jugador"}</h2>
          <button className="player-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="player-modal-body">
          {loading && (
            <div className="player-modal-loading">
              <p>Cargando información del jugador...</p>
            </div>
          )}

          {error && (
            <div className="player-modal-error">
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && playerInfo && (
            <>
              {/* Foto del jugador */}
              {playerInfo.photo && (
                <div className="player-modal-photo-container">
                  <img
                    src={playerInfo.photo}
                    alt={playerInfo.name || "Jugador"}
                    className="player-modal-photo"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Información general */}
              <div className="player-modal-section">
                <h3>Datos Generales</h3>
                <div className="player-modal-info-grid">
                  {playerInfo.age && (
                    <div className="player-modal-info-item">
                      <span className="player-modal-label">Edad</span>
                      <span className="player-modal-value">{playerInfo.age} años</span>
                    </div>
                  )}
                  {playerInfo.nationality && (
                    <div className="player-modal-info-item">
                      <span className="player-modal-label">Nacionalidad</span>
                      <span className="player-modal-value">{playerInfo.nationality}</span>
                    </div>
                  )}
                  {stats.position && (
                    <div className="player-modal-info-item">
                      <span className="player-modal-label">Posición</span>
                      <span className="player-modal-value">{translatePosition(stats.position)}</span>
                    </div>
                  )}
                  {stats.number && (
                    <div className="player-modal-info-item">
                      <span className="player-modal-label">Número</span>
                      <span className="player-modal-value">{stats.number}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              {playerStats && (
                <div className="player-modal-section">
                  <h3>Estadísticas</h3>
                  <div className="player-modal-stats-grid">
                    <div className="player-modal-stat-item">
                      <span className="player-modal-label">Partidos</span>
                      <span className="player-modal-stat-value">{stats.appearences || 0}</span>
                    </div>
                    <div className="player-modal-stat-item">
                      <span className="player-modal-label">Minutos</span>
                      <span className="player-modal-stat-value">{stats.minutes || 0}</span>
                    </div>
                    <div className="player-modal-stat-item">
                      <span className="player-modal-label">Goles</span>
                      <span className="player-modal-stat-value">{goals.total || 0}</span>
                    </div>
                    <div className="player-modal-stat-item">
                      <span className="player-modal-label">Asistencias</span>
                      <span className="player-modal-stat-value">{goals.assists || 0}</span>
                    </div>
                    <div className="player-modal-stat-item">
                      <span className="player-modal-label">Tarjetas</span>
                      <span className="player-modal-stat-value">
                        🟨{cards.yellow || 0} 🟥{cards.red || 0}
                      </span>
                    </div>
                    {shots.on !== undefined && (
                      <div className="player-modal-stat-item">
                        <span className="player-modal-label">Disparos al arco</span>
                        <span className="player-modal-stat-value">{shots.on || 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Últimos partidos */}
              {matches.length > 0 && (
                <div className="player-modal-section">
                  <h3>Últimos Partidos</h3>
                  <PlayerMatchesTable matches={matches} playerName={playerInfo.name} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
