import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getJugadorInfo, getJugadorPartidos } from "../api/api";
import PlayerStatsCard from "../components/PlayerStatsCard";
import PlayerMatchesTable from "../components/PlayerMatchesTable";

export default function JugadorProfile() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const [playerInfo, setPlayerInfo] = useState(null);
  const [playerStats, setPlayerStats] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPlayerData = async () => {
      if (!playerId) {
        setError("No se proporcionó ID de jugador");
        setLoading(false);
        return;
      }

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
          if (statistics.length > 0) {
            const latestStats = statistics[statistics.length - 1];
            setPlayerStats(latestStats);
          }
        } else {
          setError("No se encontró información del jugador");
        }

        // Cargar partidos del jugador
        try {
          const matchesData = await getJugadorPartidos(playerId);
          if (matchesData.response && Array.isArray(matchesData.response)) {
            setMatches(matchesData.response.slice(0, 10)); // Últimos 10 partidos
          } else {
            setMatches([]);
          }
        } catch (matchesErr) {
          console.warn("Error cargando partidos del jugador:", matchesErr);
          setMatches([]);
        }
      } catch (err) {
        console.error("Error cargando datos del jugador:", err);
        setError("Error al cargar información del jugador");
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
      "Forward": "Delantero"
    };
    return translations[position] || position;
  };

  const containerStyle = {
    minHeight: "100vh",
    backgroundColor: "#0d1117",
    padding: "40px 20px",
    color: "#FFFFFF"
  };

  const headerStyle = {
    backgroundColor: "#1A1A1A",
    borderRadius: "12px",
    padding: "40px",
    marginBottom: "30px",
    border: "1px solid rgba(79, 195, 247, 0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center"
  };

  const photoStyle = {
    width: "180px",
    height: "180px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid rgba(79, 195, 247, 0.4)",
    marginBottom: "20px"
  };

  const nameStyle = {
    fontSize: "32px",
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: "10px"
  };

  const infoRowStyle = {
    display: "flex",
    gap: "20px",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: "20px"
  };

  const infoItemStyle = {
    color: "#B0BEC5",
    fontSize: "14px"
  };

  const sectionStyle = {
    backgroundColor: "#1A1A1A",
    borderRadius: "10px",
    padding: "24px",
    marginBottom: "20px",
    border: "1px solid rgba(79, 195, 247, 0.2)"
  };

  const sectionTitleStyle = {
    fontSize: "20px",
    fontWeight: "600",
    color: "#4FC3F7",
    marginBottom: "20px"
  };

  const statsGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "16px",
    marginTop: "16px"
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
        <div style={loadingStyle}>Cargando información del jugador...</div>
      </div>
    );
  }

  if (error || !playerInfo) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>{error || "No se encontró información del jugador"}</div>
      </div>
    );
  }

  // Extraer estadísticas
  const stats = playerStats?.games || {};
  const goals = playerStats?.goals || {};
  const cards = playerStats?.cards || {};
  const shots = playerStats?.shots || {};
  const passes = playerStats?.passes || {};

  return (
    <div style={containerStyle}>
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

      {/* Header del jugador */}
      <div style={headerStyle}>
        {playerInfo.photo ? (
          <img src={playerInfo.photo} alt={playerInfo.name} style={photoStyle} />
        ) : (
          <div
            style={{
              ...photoStyle,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#121212",
              color: "#4FC3F7",
              fontSize: "64px",
              fontWeight: "bold"
            }}
          >
            {playerInfo.name?.charAt(0) || "J"}
          </div>
        )}
        <h1 style={nameStyle}>{playerInfo.name || "Jugador"}</h1>
        <div style={infoRowStyle}>
          {playerStats?.games?.number && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Número:</strong> {playerStats.games.number}
            </span>
          )}
          {playerStats?.games?.position && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Posición:</strong> {translatePosition(playerStats.games.position)}
            </span>
          )}
          {playerInfo.nationality && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Nacionalidad:</strong> {playerInfo.nationality}
            </span>
          )}
          {playerInfo.age && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Edad:</strong> {playerInfo.age} años
            </span>
          )}
          {playerInfo.height && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Altura:</strong> {playerInfo.height}
            </span>
          )}
          {playerInfo.weight && (
            <span style={infoItemStyle}>
              <strong style={{ color: "#4FC3F7" }}>Peso:</strong> {playerInfo.weight}
            </span>
          )}
        </div>
      </div>

      {/* Estadísticas de la temporada */}
      {playerStats && (
        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Estadísticas de la Temporada</h2>
          <div style={statsGridStyle}>
            <PlayerStatsCard title="Partidos" value={stats.appearences || 0} />
            <PlayerStatsCard title="Minutos" value={stats.minutes || 0} />
            <PlayerStatsCard title="Goles" value={goals.total || 0} />
            <PlayerStatsCard title="Asistencias" value={goals.assists || 0} />
            <PlayerStatsCard title="Tarjetas Amarillas" value={cards.yellow || 0} />
            <PlayerStatsCard title="Tarjetas Rojas" value={cards.red || 0} />
            <PlayerStatsCard title="Disparos" value={shots.total || 0} />
            <PlayerStatsCard title="Pases Clave" value={passes.key || 0} />
            <PlayerStatsCard 
              title="Precisión de Pase" 
              value={passes.accuracy ? `${passes.accuracy}%` : "0%"} 
            />
          </div>
        </div>
      )}

      {!playerStats && (
        <div style={sectionStyle}>
          <p style={{ color: "#B0BEC5", textAlign: "center" }}>
            No hay estadísticas disponibles
          </p>
        </div>
      )}

      {/* Últimos partidos */}
      <div style={sectionStyle}>
        <h2 style={sectionTitleStyle}>Últimos Partidos</h2>
        <PlayerMatchesTable matches={matches} playerName={playerInfo.name} />
      </div>
    </div>
  );
}
