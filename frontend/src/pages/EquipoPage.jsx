import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getTeamInfo, getTeamStats, getTeamFixtures, getTeamPlayers } from "../api/api";
import SeasonStandingsStats from "../components/SeasonStandingsStats";
import { hasSeasonStandingContent } from "../utils/statDisplay";

export default function EquipoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentSeason, setCurrentSeason] = useState("2024");

  // Log inicial del componente
  console.log("🔵 EquipoPage renderizado");
  console.log("🔵 ID recibido desde useParams():", id);
  console.log("🔵 Tipo de ID:", typeof id);
  console.log("🔵 URL completa:", window.location.href);

  useEffect(() => {
    console.log("🔄 useEffect ejecutado con id:", id);
    
    if (!id) {
      console.warn("⚠️ No hay ID de equipo en la URL");
      console.warn("⚠️ Parámetros de la URL:", window.location.pathname);
      setLoading(false);
      return;
    }

    console.log("🔄 Cargando datos del equipo con ID:", id);
    console.log("🔄 ID parseado a número:", parseInt(id));

    const loadTeamData = async () => {
      setLoading(true);
      try {
        // Obtener información básica del equipo
        console.log("📡 Llamando a /api/team-info/" + id);
        console.log("📡 Tipo de ID enviado:", typeof id);
        console.log("📡 URL completa de la petición:", `/api/team-info/${id}`);
        
        const infoRes = await axios.get(`/api/team-info/${id}`);
        
        console.log("📦 Respuesta completa de team-info:", infoRes);
        console.log("📦 Status de la respuesta:", infoRes.status);
        console.log("📦 Datos de la respuesta:", infoRes.data);
        console.log("📦 Tiene 'response'?:", infoRes.data.response !== undefined);
        console.log("📦 response es array?:", Array.isArray(infoRes.data.response));
        console.log("📦 Longitud de response:", infoRes.data.response?.length);

        if (infoRes.data.response && infoRes.data.response.length > 0) {
          const teamData = infoRes.data.response[0];
          console.log("📦 teamData completo:", teamData);
          console.log("📦 teamData.team:", teamData.team);
          
          const team = teamData.team;
          console.log("✅ Equipo encontrado:", team.name, "ID:", team.id);
          console.log("✅ Datos del equipo:", team);
          setTeamInfo(team);

          // Obtener liga del equipo si está disponible
          const leagueId = teamData.league?.id;
          
          // Obtener estadísticas si hay leagueId
          console.log("📊 leagueId encontrado:", leagueId);
          if (leagueId) {
            try {
              console.log("📡 Llamando a getTeamStats con:", { id, leagueId, currentSeason });
              const statsRes = await getTeamStats(id, leagueId, currentSeason);
              console.log("📦 Respuesta de getTeamStats:", statsRes);
              if (statsRes.response && statsRes.response.length > 0) {
                console.log("✅ Estadísticas encontradas:", statsRes.response[0]);
                setTeamStats(statsRes.response[0]);
              } else {
                console.warn("⚠️ getTeamStats no devolvió datos válidos");
              }
            } catch (err) {
              console.error("❌ Error obteniendo estadísticas:", err);
              console.error("❌ Detalles del error:", err.response?.data || err.message);
            }
          } else {
            console.warn("⚠️ No hay leagueId disponible para obtener estadísticas");
          }

          // Obtener partidos pasados
          try {
            console.log("📡 Llamando a getTeamFixtures con:", { id, limit: 10 });
            const fixturesRes = await getTeamFixtures(id, 10);
            console.log("📦 Respuesta de getTeamFixtures:", fixturesRes);
            if (fixturesRes.response) {
              console.log("📦 Partidos encontrados:", fixturesRes.response.length);
              const now = new Date();
              const past = fixturesRes.response.filter(f => new Date(f.fixture.date) < now);
              console.log("📦 Partidos pasados:", past.length);
              setFixtures(past.slice(0, 5));
            } else {
              console.warn("⚠️ getTeamFixtures no devolvió response");
            }
          } catch (err) {
            console.error("❌ Error obteniendo partidos:", err);
            console.error("❌ Detalles del error:", err.response?.data || err.message);
          }

          // Obtener próximos partidos
          try {
            const upcomingRes = await axios.get(`/api/team-last-matches?teamId=${id}&limit=10`);
            if (upcomingRes.data.response) {
              const now = new Date();
              const upcoming = upcomingRes.data.response.filter(f => new Date(f.fixture.date) >= now);
              setUpcomingFixtures(upcoming.slice(0, 5));
            }
          } catch (err) {
            console.error("Error obteniendo próximos partidos:", err);
          }

          // Obtener jugadores
          try {
            console.log("📡 Llamando a getTeamPlayers con:", { id, currentSeason });
            const playersRes = await getTeamPlayers(id, currentSeason);
            console.log("📦 Respuesta de getTeamPlayers:", playersRes);
            if (playersRes.response && playersRes.response.length > 0) {
              const squad = playersRes.response[0];
              console.log("📦 Squad encontrado:", squad);
              console.log("📦 Jugadores encontrados:", squad.players?.length || 0);
              setPlayers(squad.players || []);
            } else {
              console.warn("⚠️ getTeamPlayers no devolvió datos válidos");
            }
          } catch (err) {
            console.error("❌ Error obteniendo jugadores:", err);
            console.error("❌ Detalles del error:", err.response?.data || err.message);
          }
        } else {
          console.warn("⚠️ No se encontró información del equipo en la respuesta");
          console.warn("📦 Respuesta completa:", infoRes.data);
        }
      } catch (error) {
        console.error("❌ Error cargando datos del equipo:", error);
        console.error("❌ Detalles del error:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [id, currentSeason]);

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  };

  const titleStyle = {
    fontSize: "20px",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "16px"
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#1a1a1a" }}>
        Cargando información del equipo...
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#1a1a1a" }}>
        No se encontró información del equipo.
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>
      {/* Header del equipo - Logo grande y centrado */}
      <div style={{
        ...cardStyle,
        textAlign: "center",
        padding: "40px 24px"
      }}>
        {teamInfo.logo && (
          <img 
            src={teamInfo.logo} 
            alt={teamInfo.name} 
            style={{ 
              width: "140px", 
              height: "140px", 
              marginBottom: "24px",
              objectFit: "contain"
            }} 
          />
        )}
        <h1 style={{ 
          fontSize: "32px", 
          fontWeight: "700", 
          color: "#1a1a1a", 
          marginBottom: "16px" 
        }}>
          {teamInfo.name}
        </h1>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "8px",
          alignItems: "center",
          marginBottom: "24px"
        }}>
          {teamInfo.country && (
            <p style={{ color: "#64748b", fontSize: "16px" }}>País: {teamInfo.country}</p>
          )}
          {teamInfo.founded && (
            <p style={{ color: "#64748b", fontSize: "16px" }}>Fundado: {teamInfo.founded}</p>
          )}
          {teamInfo.venue && (
            <p style={{ color: "#64748b", fontSize: "16px" }}>Estadio: {teamInfo.venue}</p>
          )}
        </div>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4FC3F7",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "500"
          }}
        >
          ← Volver
        </button>
      </div>

      {/* Estadísticas de la temporada */}
      {hasSeasonStandingContent(teamStats?.league?.standings?.[0]?.[0] || {}, {
        form: teamStats?.league?.standings?.[0]?.[0]?.form,
      }) && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas de la Temporada</h2>
          <SeasonStandingsStats
            standingsRow={teamStats.league.standings?.[0]?.[0] || {}}
            variant="default"
          />
          {teamStats.league.standings?.[0]?.[0]?.form && (
            <div style={{ marginTop: "16px" }}>
              <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Forma</p>
              <div style={{ display: "flex", gap: "4px" }}>
                {teamStats.league.standings[0][0].form.split("").map((letra, idx) => {
                  let letraMostrar = letra;
                  if (letra === "W") letraMostrar = "G";
                  else if (letra === "D") letraMostrar = "E";
                  else if (letra === "L") letraMostrar = "P";
                  const color = letra === "W" ? "#27ae60" : letra === "L" ? "#e74c3c" : "#f39c12";
                  return (
                    <span
                      key={idx}
                      style={{
                        display: "inline-block",
                        width: "24px",
                        height: "24px",
                        lineHeight: "24px",
                        textAlign: "center",
                        backgroundColor: color,
                        color: "#fff",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {letraMostrar}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Últimos partidos */}
      {fixtures.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Últimos Partidos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {fixtures.map((fixture, idx) => {
              const isHome = fixture.teams.home.id === parseInt(id);
              const rival = isHome ? fixture.teams.away.name : fixture.teams.home.name;
              const goalsFor = isHome ? fixture.goals.home : fixture.goals.away;
              const goalsAgainst = isHome ? fixture.goals.away : fixture.goals.home;
              
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px"
                  }}
                >
                  <div>
                    <p style={{ color: "#1a1a1a", fontWeight: "500", marginBottom: "4px" }}>
                      vs {rival}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "14px" }}>
                      {new Date(fixture.fixture.date).toLocaleDateString()} - {isHome ? "Local" : "Visitante"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "#1a1a1a", fontSize: "18px", fontWeight: "600" }}>
                      {goalsFor} - {goalsAgainst}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos partidos */}
      {upcomingFixtures.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Próximos Partidos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {upcomingFixtures.map((fixture, idx) => {
              const isHome = fixture.teams.home.id === parseInt(id);
              const rival = isHome ? fixture.teams.away.name : fixture.teams.home.name;
              
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px"
                  }}
                >
                  <div>
                    <p style={{ color: "#1a1a1a", fontWeight: "500", marginBottom: "4px" }}>
                      vs {rival}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "14px" }}>
                      {new Date(fixture.fixture.date).toLocaleDateString()} - {isHome ? "Local" : "Visitante"}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: "#64748b", fontSize: "14px" }}>
                      {fixture.league?.name || "Competición"}
                    </p>
                    <p style={{ color: "#64748b", fontSize: "12px" }}>
                      {fixture.fixture.status?.long || "Programado"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Plantilla */}
      {players.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Plantilla</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
                    Jugador
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
                    Posición
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
                    Edad
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#64748b", fontSize: "14px", fontWeight: "600" }}>
                    Nacionalidad
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px", color: "#1a1a1a" }}>{player.name}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{player.position || "N/A"}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{player.age || "N/A"}</td>
                    <td style={{ padding: "12px", color: "#64748b" }}>{player.nationality || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Estadísticas avanzadas */}
      {teamStats && teamStats.league && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas Avanzadas</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
            {teamStats.league.standings?.[0]?.[0]?.all?.played > 0 && (
              <>
                <div>
                  <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Posesión Promedio</p>
                  <p style={{ color: "#1a1a1a", fontSize: "18px", fontWeight: "600" }}>
                    {teamStats.league.standings[0][0].statistics?.[0]?.value || "N/A"}%
                  </p>
                </div>
                <div>
                  <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Tiros por Partido</p>
                  <p style={{ color: "#1a1a1a", fontSize: "18px", fontWeight: "600" }}>
                    {teamStats.league.standings[0][0].statistics?.[1]?.value || "N/A"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
