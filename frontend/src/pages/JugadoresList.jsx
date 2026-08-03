import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJugadoresEquipo, getJugadorInfo, getJugadorPartidos } from "../api/api";
import PlayerCard from "../components/PlayerCard";
import PlayerMatchesTable from "../components/PlayerMatchesTable";
import "../styles/team-pages.css";

export default function JugadoresList() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState("all");
  const [openPlayerId, setOpenPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState({});

  useEffect(() => {
    const loadJugadores = async () => {
      if (!teamId) {
        setError("No se proporcionó ID de equipo");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getJugadoresEquipo(teamId);
        if (data.response && Array.isArray(data.response)) {
          setJugadores(data.response);
        } else {
          setJugadores([]);
        }
      } catch (err) {
        console.error("Error cargando jugadores:", err);
        setError("Error al cargar jugadores del equipo");
        setJugadores([]);
      } finally {
        setLoading(false);
      }
    };

    loadJugadores();
  }, [teamId]);

  // Manejar clic en tarjeta de jugador
  const handlePlayerClick = async (playerId) => {
    // Si el jugador ya está abierto, cerrarlo
    if (openPlayerId === playerId) {
      setOpenPlayerId(null);
      return;
    }

    // Cerrar el acordeón abierto y abrir el nuevo
    setOpenPlayerId(playerId);

    // Si los datos del jugador no están cargados, cargarlos
    if (!playerData[playerId]) {
      try {
        // Cargar información del jugador
        const infoData = await getJugadorInfo(playerId);
        
        // Cargar partidos del jugador
        let matchesData = { response: [] };
        try {
          matchesData = await getJugadorPartidos(playerId);
        } catch (matchesErr) {
          console.warn("Error cargando partidos del jugador:", matchesErr);
        }

        if (infoData.response && Array.isArray(infoData.response) && infoData.response.length > 0) {
          const player = infoData.response[0].player;
          const statistics = infoData.response[0].statistics || [];
          
          // Obtener estadísticas de la temporada actual (última estadística)
          const latestStats = statistics.length > 0 ? statistics[statistics.length - 1] : null;
          
          setPlayerData(prev => ({
            ...prev,
            [playerId]: {
              playerInfo: player,
              playerStats: latestStats,
              matches: matchesData.response && Array.isArray(matchesData.response) 
                ? matchesData.response.slice(0, 10) 
                : []
            }
          }));
        }
      } catch (err) {
        console.error("Error cargando datos del jugador:", err);
        setPlayerData(prev => ({
          ...prev,
          [playerId]: {
            playerInfo: null,
            playerStats: null,
            matches: [],
            error: "Error al cargar información del jugador"
          }
        }));
      }
    }
  };

  // Filtrar jugadores
  const filteredJugadores = jugadores.filter((jugador) => {
    const matchesSearch = searchTerm === "" || 
      jugador.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPosition = filterPosition === "all" || 
      jugador.posicion?.toLowerCase().includes(filterPosition.toLowerCase());

    return matchesSearch && matchesPosition;
  });

  // Función para traducir posiciones al español
  const translatePosition = (position) => {
    if (!position) return "";
    const pos = position.toLowerCase();
    if (pos.includes("goalkeeper") || pos.includes("portero")) return "Portero";
    if (pos.includes("defender") || pos.includes("defensor")) return "Defensor";
    if (pos.includes("midfielder") || pos.includes("mediocampista")) return "Mediocampista";
    if (pos.includes("attacker") || pos.includes("forward") || pos.includes("delantero")) return "Delantero";
    return position;
  };

  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#0d1117",
    padding: "40px 20px",
    color: "#FFFFFF"
  };

  const headerStyle = {
    marginBottom: "30px",
    textAlign: "center"
  };

  const titleStyle = {
    fontSize: "28px",
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: "10px"
  };

  const controlsStyle = {
    display: "flex",
    gap: "16px",
    marginBottom: "30px",
    flexWrap: "wrap",
    justifyContent: "center"
  };

  const inputStyle = {
    padding: "10px 16px",
    backgroundColor: "#1A1A1A",
    border: "1px solid rgba(79, 195, 247, 0.3)",
    borderRadius: "6px",
    color: "#FFFFFF",
    fontSize: "14px",
    minWidth: "250px",
    outline: "none"
  };

  const selectStyle = {
    ...inputStyle,
    cursor: "pointer",
    minWidth: "180px"
  };


  const loadingStyle = {
    textAlign: "center",
    padding: "60px 20px",
    color: "#B0BEC5",
    fontSize: "16px"
  };

  const errorStyle = {
    textAlign: "center",
    padding: "40px 20px",
    backgroundColor: "#1A1A1A",
    borderRadius: "8px",
    border: "1px solid rgba(231, 76, 60, 0.3)",
    color: "#e74c3c",
    maxWidth: "600px",
    margin: "0 auto"
  };

  const emptyStyle = {
    textAlign: "center",
    padding: "60px 20px",
    color: "#B0BEC5",
    fontSize: "16px"
  };

  const backButtonStyle = {
    position: "absolute",
    top: "20px",
    left: "20px",
    padding: "10px 20px",
    backgroundColor: "transparent",
    border: "1px solid rgba(79, 195, 247, 0.3)",
    borderRadius: "6px",
    color: "#4FC3F7",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>Cargando jugadores...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>{error}</div>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="jugadores-list-page">
      <button
        style={backButtonStyle}
        onClick={() => navigate(-1)}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = "rgba(79, 195, 247, 0.1)";
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = "transparent";
        }}
      >
        ← Volver
      </button>

      <div style={headerStyle}>
        <h1 style={titleStyle}>Jugadores del Equipo</h1>
        <p style={{ color: "#B0BEC5", fontSize: "14px" }}>
          {jugadores.length} jugador{jugadores.length !== 1 ? "es" : ""} encontrado{jugadores.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div style={controlsStyle}>
        <input
          type="text"
          placeholder="Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={inputStyle}
        />
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          style={selectStyle}
        >
          <option value="all">Todas las posiciones</option>
          <option value="goalkeeper">Portero</option>
          <option value="defender">Defensor</option>
          <option value="midfielder">Mediocampista</option>
          <option value="attacker">Delantero</option>
        </select>
      </div>

      {filteredJugadores.length === 0 ? (
        <div style={emptyStyle}>
          {searchTerm || filterPosition !== "all"
            ? "No se encontraron jugadores con los filtros aplicados"
            : "No hay jugadores disponibles"}
        </div>
      ) : (
        <div className="jugadores-list-grid">
          {filteredJugadores.map((jugador) => {
            const data = playerData[jugador.id];
            const stats = data?.playerStats?.games || {};
            const goals = data?.playerStats?.goals || {};
            const cards = data?.playerStats?.cards || {};
            const shots = data?.playerStats?.shots || {};
            const passes = data?.playerStats?.passes || {};

            return (
              <PlayerCard
                key={jugador.id}
                player={jugador}
                onClick={() => handlePlayerClick(jugador.id)}
                isOpen={openPlayerId === jugador.id}
              >
                {data?.error ? (
                  <p style={{ color: "#e74c3c", textAlign: "center" }}>{data.error}</p>
                ) : !data ? (
                  <p style={{ color: "#B0BEC5", textAlign: "center" }}>Cargando información...</p>
                ) : (
                  <div>
                    {/* Datos generales */}
                    <div style={{ marginBottom: "20px" }}>
                      <h3 style={{ color: "#4FC3F7", fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                        Datos Generales
                      </h3>
                      <div className="jugadores-player-stats-grid">
                        {data.playerInfo?.age && (
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Edad</p>
                            <p style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: "600", margin: "0" }}>{data.playerInfo.age} años</p>
                          </div>
                        )}
                        {data.playerInfo?.nationality && (
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Nacionalidad</p>
                            <p style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: "600", margin: "0" }}>{data.playerInfo.nationality}</p>
                          </div>
                        )}
                        {stats.number && (
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Número</p>
                            <p style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: "600", margin: "0" }}>{stats.number}</p>
                          </div>
                        )}
                        {stats.position && (
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Posición</p>
                            <p style={{ color: "#FFFFFF", fontSize: "14px", fontWeight: "600", margin: "0" }}>
                              {translatePosition(stats.position)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estadísticas de la temporada */}
                    {data.playerStats ? (
                      <div style={{ marginBottom: "20px" }}>
                        <h3 style={{ color: "#4FC3F7", fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                          Estadísticas de la Temporada
                        </h3>
                        <div className="jugadores-player-detail-grid">
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Partidos</p>
                            <p style={{ color: "#4FC3F7", fontSize: "18px", fontWeight: "700", margin: "0" }}>{stats.appearences || 0}</p>
                          </div>
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Minutos</p>
                            <p style={{ color: "#4FC3F7", fontSize: "18px", fontWeight: "700", margin: "0" }}>{stats.minutes || 0}</p>
                          </div>
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Goles</p>
                            <p style={{ color: "#4FC3F7", fontSize: "18px", fontWeight: "700", margin: "0" }}>{goals.total || 0}</p>
                          </div>
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Asistencias</p>
                            <p style={{ color: "#4FC3F7", fontSize: "18px", fontWeight: "700", margin: "0" }}>{goals.assists || 0}</p>
                          </div>
                          <div>
                            <p style={{ color: "#B0BEC5", fontSize: "12px", margin: "0 0 4px 0" }}>Tarjetas</p>
                            <p style={{ color: "#4FC3F7", fontSize: "18px", fontWeight: "700", margin: "0" }}>
                              🟨{cards.yellow || 0} 🟥{cards.red || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginBottom: "20px" }}>
                        <p style={{ color: "#B0BEC5", textAlign: "center", fontSize: "14px" }}>
                          No hay estadísticas disponibles
                        </p>
                      </div>
                    )}

                    {/* Últimos partidos */}
                    <div>
                      <h3 style={{ color: "#4FC3F7", fontSize: "16px", fontWeight: "600", marginBottom: "12px" }}>
                        Últimos Partidos
                      </h3>
                      {data.matches && data.matches.length > 0 ? (
                        <PlayerMatchesTable matches={data.matches} playerName={data.playerInfo?.name} />
                      ) : (
                        <p style={{ color: "#B0BEC5", textAlign: "center", fontSize: "14px" }}>
                          No hay partidos recientes
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </PlayerCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
