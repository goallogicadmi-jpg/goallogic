import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  getTeamInfo,
  getTeamStats,
  getTeamFixtures,
  getTeamPlayers,
  getTeamInjuries,
  getTeamTransfers,
  getTeamPlayersStats
} from "../api/api";
import SeasonStandingsStats from "../components/SeasonStandingsStats";
import { hasSeasonStandingContent, hasStatValue } from "../utils/statDisplay";

export default function TeamDetails() {
  console.log("🔴 TeamDetails.jsx SE ESTÁ RENDERIZANDO");
  const { liga, equipo } = useParams();
  const [teamId, setTeamId] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [leagueId, setLeagueId] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");
  
  // Estados para cada sección
  const [teamStats, setTeamStats] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [players, setPlayers] = useState([]);
  const [playersStats, setPlayersStats] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  
  const [tabsLoading, setTabsLoading] = useState({
    info: false,
    stats: false,
    partidos: false,
    jugadores: false,
    estadisticas: false,
    lesiones: false,
    transferencias: false
  });

  // Calcular temporada actual
  const calculateSeason = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12
    // Si estamos en agosto o después, la temporada actual es el año actual
    // Si estamos antes de agosto, la temporada actual es el año anterior
    const seasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
    return seasonYear.toString();
  };

  // Cargar información básica del equipo y obtener leagueId
  useEffect(() => {
    async function load() {
      if (!equipo) {
        setLoading(false);
        return;
      }

      setLoading(true);
      
      try {
        // Intentar usar equipo como ID numérico primero
        let teamIdToUse = equipo;
        
        // Si equipo no es numérico, intentar buscar el equipo por nombre
        if (isNaN(equipo)) {
          // Buscar equipo por nombre usando search-teams
          try {
            const searchRes = await axios.get(`/api/search-teams?query=${encodeURIComponent(equipo)}`);
            if (searchRes.data.response && searchRes.data.response.length > 0) {
              teamIdToUse = searchRes.data.response[0].team?.id || searchRes.data.response[0].id;
            }
          } catch (searchErr) {
            console.warn("No se pudo buscar el equipo por nombre, usando como ID:", searchErr);
          }
        }

        // Obtener información del equipo usando el ID
        const infoRes = await axios.get(`/api/team-info/${teamIdToUse}`);
        
        if (infoRes.data.response && infoRes.data.response.length > 0) {
          const teamData = infoRes.data.response[0];
          const team = teamData.team;
          
          setTeamInfo(team);
          setTeamId(team.id);
          
          // OBTENER leagueId DE LA RESPUESTA DE LA API
          const detectedLeagueId = teamData.league?.id;
          setLeagueId(detectedLeagueId);
          
          // CALCULAR TEMPORADA AUTOMÁTICAMENTE (siempre debe tener un valor)
          const season = calculateSeason();
          if (season) {
            setCurrentSeason(season);
          } else {
            // Fallback: usar año actual si calculateSeason falla
            setCurrentSeason(new Date().getFullYear().toString());
          }
          
          console.log("✅ Equipo cargado:", team.name);
          console.log("✅ leagueId obtenido:", detectedLeagueId);
          console.log("✅ Temporada calculada:", season);
        } else {
          console.error("No se encontró información del equipo");
        }
      } catch (err) {
        console.error("Error obteniendo info del equipo:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [equipo]);

  // Cargar datos de cada tab cuando se selecciona
  const loadTabData = async (tab) => {
    // Validación general - solo teamId y currentSeason son obligatorios
    if (!teamId) {
      console.warn("Falta teamId para cargar datos");
      return;
    }

    // currentSeason debe estar disponible, si no, calcularlo
    const season = currentSeason || calculateSeason();
    if (!season) {
      console.warn("No se pudo determinar la temporada");
      return;
    }

    // Validación específica para tabs que sí requieren leagueId
    const tabsQueRequierenLeagueId = ["stats", "estadisticas"];
    if (tabsQueRequierenLeagueId.includes(tab) && !leagueId) {
      console.warn("Este tab requiere leagueId, pero no está disponible");
      return;
    }

    if (tab === "stats" && !teamStats) {
      setTabsLoading(prev => ({ ...prev, stats: true }));
      try {
        const statsRes = await getTeamStats(teamId, leagueId, season);
        if (statsRes?.response && Array.isArray(statsRes.response) && statsRes.response.length > 0) {
          setTeamStats(statsRes.response[0]);
        }
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
      } finally {
        setTabsLoading(prev => ({ ...prev, stats: false }));
      }
    } else if (tab === "partidos" && fixtures.length === 0) {
      setTabsLoading(prev => ({ ...prev, partidos: true }));
      try {
        const fixturesRes = await getTeamFixtures(teamId, 10);
        if (fixturesRes?.response && Array.isArray(fixturesRes.response)) {
          const now = new Date();
          const past = fixturesRes.response.filter(f => f?.fixture?.date && new Date(f.fixture.date) < now);
          const upcoming = fixturesRes.response.filter(f => f?.fixture?.date && new Date(f.fixture.date) >= now);
          setFixtures(past.slice(0, 5)); // Solo últimos 5 partidos
          setUpcomingFixtures(upcoming.slice(0, 10));
        }
      } catch (err) {
        console.error("Error cargando partidos:", err);
      } finally {
        setTabsLoading(prev => ({ ...prev, partidos: false }));
      }
    } else if (tab === "jugadores" && players.length === 0) {
      setTabsLoading(prev => ({ ...prev, jugadores: true }));
      try {
        const playersRes = await getTeamPlayers(teamId, season);
        if (playersRes?.response && Array.isArray(playersRes.response) && playersRes.response.length > 0) {
          const squad = playersRes.response[0];
          setPlayers(Array.isArray(squad.players) ? squad.players : []);
        }
      } catch (err) {
        console.error("Error cargando jugadores:", err);
      } finally {
        setTabsLoading(prev => ({ ...prev, jugadores: false }));
      }
    } else if (tab === "estadisticas" && playersStats.length === 0) {
      setTabsLoading(prev => ({ ...prev, estadisticas: true }));
      try {
        const playersStatsRes = await getTeamPlayersStats(teamId, leagueId, season);
        if (playersStatsRes?.response && Array.isArray(playersStatsRes.response)) {
          const statsOnly = playersStatsRes.response
            .filter(player => player?.player?.id) // Filtrar solo jugadores válidos
            .map(player => ({
              id: player.player.id,
              position: player.statistics?.[0]?.games?.position || player.player?.position || "N/A",
              statistics: Array.isArray(player.statistics) ? player.statistics : []
            }));
          setPlayersStats(statsOnly);
        }
      } catch (err) {
        console.error("Error cargando estadísticas de jugadores:", err);
      } finally {
        setTabsLoading(prev => ({ ...prev, estadisticas: false }));
      }
    } else if (tab === "lesiones" && injuries.length === 0) {
      setTabsLoading(prev => ({ ...prev, lesiones: true }));
      try {
        const injuriesRes = await getTeamInjuries(teamId);
        if (injuriesRes?.response && Array.isArray(injuriesRes.response)) {
          setInjuries(injuriesRes.response);
        } else {
          setInjuries([]); // Asegurar que siempre sea un array
        }
      } catch (err) {
        console.error("Error cargando lesiones:", err);
        setInjuries([]); // En caso de error, establecer array vacío
      } finally {
        setTabsLoading(prev => ({ ...prev, lesiones: false }));
      }
    } else if (tab === "transferencias" && transfers.length === 0) {
      setTabsLoading(prev => ({ ...prev, transferencias: true }));
      try {
        const transfersRes = await getTeamTransfers(teamId);
        if (transfersRes?.response && Array.isArray(transfersRes.response)) {
          // Filtrar solo transferencias de la temporada actual
          const filteredTransfers = transfersRes.response.filter(transfer => {
            if (!transfer?.transfers || !Array.isArray(transfer.transfers) || transfer.transfers.length === 0) {
              return false;
            }
            const transferData = transfer.transfers[0];
            
            // Si tiene campo season, filtrar por season
            if (transferData?.season) {
              return transferData.season.toString() === season;
            }
            
            // Si no tiene season, filtrar por año de la fecha
            if (transferData?.date) {
              try {
                const transferYear = new Date(transferData.date).getFullYear();
                return transferYear.toString() === season;
              } catch (dateErr) {
                console.warn("Error parseando fecha de transferencia:", dateErr);
                return false;
              }
            }
            
            return false;
          });
          setTransfers(filteredTransfers);
        } else {
          setTransfers([]); // Asegurar que siempre sea un array
        }
      } catch (err) {
        console.error("Error cargando transferencias:", err);
        setTransfers([]); // En caso de error, establecer array vacío
      } finally {
        setTabsLoading(prev => ({ ...prev, transferencias: false }));
      }
    }
  };

  // Función para obtener el color según el resultado del partido
  const getMatchColor = (fixture, teamId) => {
    if (!fixture?.teams || !teamId) return "#f1f5f9"; // Color neutro si falta información
    
    const isHome = fixture.teams.home?.id === parseInt(teamId);
    const goalsFor = isHome ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
    const goalsAgainst = isHome ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);

    // Validar que los goles sean números válidos
    if (goalsFor === null || goalsAgainst === null) return "#f1f5f9";

    if (goalsFor > goalsAgainst) return "#27ae60"; // Verde - ganó
    if (goalsFor === goalsAgainst) return "#f39c12"; // Amarillo - empató
    return "#e74c3c"; // Rojo - perdió
  };

  const containerStyle = {
    width: "100%",
    padding: "20px",
    backgroundColor: "#F1F5F9",
    minHeight: "100vh"
  };

  const cardStyle = {
    padding: "20px",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    backgroundColor: "#fff",
    marginBottom: "20px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  };

  const tabButtonStyle = (isActive) => ({
    padding: "12px 24px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    backgroundColor: isActive ? "#4FC3F7" : "#e2e8f0",
    color: isActive ? "#fff" : "#333",
    fontWeight: isActive ? "600" : "normal",
    marginRight: "10px",
    marginBottom: "10px",
    transition: "all 0.2s"
  });

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#64748b", fontSize: "16px" }}>Cargando información del equipo...</p>
        </div>
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#e74c3c", fontSize: "16px" }}>No se encontró información del equipo.</p>
        </div>
      </div>
    );
  }

  const detailedStats = teamStats?.league?.standings?.[0]?.[0] || {};
  const teamStatistics = (teamStats?.league?.standings?.[0]?.[0]?.statistics || []).filter(
    (stat) => hasStatValue(stat?.value)
  );
  const showSeasonStandings = hasSeasonStandingContent(detailedStats, { form: detailedStats?.form });
  const showStatsTab =
    tabsLoading.stats ||
    showSeasonStandings ||
    teamStatistics.length > 0;

  return (
    <div style={containerStyle}>
      {/* Header con imagen del equipo y estadio */}
      <div style={cardStyle}>
        {/* Imagen del equipo - grande y centrada */}
        {teamInfo?.logo && (
          <img 
            src={teamInfo.logo} 
            alt={teamInfo.name || "Equipo"}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            style={{ 
              width: "180px", 
              height: "180px", 
              objectFit: "contain",
              margin: "0 auto 20px auto",
              display: "block"
            }}
          />
        )}
        
        {/* Imagen del estadio - debajo, más pequeña */}
        {teamInfo?.venue?.image && (
          <img 
            src={teamInfo.venue.image} 
            alt={teamInfo.venue || "Estadio"}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            style={{ 
              width: "60%",
              maxWidth: "500px",
              borderRadius: "10px",
              margin: "20px auto",
              display: "block"
            }}
          />
        )}
        
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <h1 style={{ margin: "0 0 5px 0", color: "#1a1a1a" }}>{teamInfo.name}</h1>
          {liga && <p style={{ margin: "0", color: "#64748b" }}>Liga: {liga}</p>}
          {teamInfo.country && <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>País: {teamInfo.country}</p>}
          {teamInfo.venue && <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Estadio: {teamInfo.venue}</p>}
          {teamInfo.founded && <p style={{ margin: "5px 0 0 0", color: "#64748b" }}>Fundado: {teamInfo.founded}</p>}
          {leagueId && <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "12px" }}>League ID: {leagueId} | Season: {currentSeason}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap" }}>
        <button
          onClick={() => {
            setActiveTab("info");
            loadTabData("info");
          }}
          style={tabButtonStyle(activeTab === "info")}
        >
          ℹ️ Información
        </button>
        <button
          onClick={() => {
            setActiveTab("stats");
            loadTabData("stats");
          }}
          style={tabButtonStyle(activeTab === "stats")}
        >
          📊 Estadísticas
        </button>
        <button
          onClick={() => {
            setActiveTab("partidos");
            loadTabData("partidos");
          }}
          style={tabButtonStyle(activeTab === "partidos")}
        >
          ⚽ Partidos
        </button>
        <button
          onClick={() => {
            setActiveTab("jugadores");
            loadTabData("jugadores");
          }}
          style={tabButtonStyle(activeTab === "jugadores")}
        >
          👥 Jugadores
        </button>
        <button
          onClick={() => {
            setActiveTab("estadisticas");
            loadTabData("estadisticas");
          }}
          style={tabButtonStyle(activeTab === "estadisticas")}
        >
          📈 Estadísticas Avanzadas
        </button>
        <button
          onClick={() => {
            setActiveTab("lesiones");
            loadTabData("lesiones");
          }}
          style={tabButtonStyle(activeTab === "lesiones")}
        >
          🏥 Lesiones
        </button>
        <button
          onClick={() => {
            setActiveTab("transferencias");
            loadTabData("transferencias");
          }}
          style={tabButtonStyle(activeTab === "transferencias")}
        >
          🔄 Transferencias
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "info" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Información General</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            {teamInfo.name && (
              <div>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Nombre</p>
                <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{teamInfo.name}</p>
              </div>
            )}
            {teamInfo.country && (
              <div>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>País</p>
                <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{teamInfo.country}</p>
              </div>
            )}
            {teamInfo.founded && (
              <div>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Fundado</p>
                <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{teamInfo.founded}</p>
              </div>
            )}
            {teamInfo.venue && (
              <div>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>Estadio</p>
                <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{teamInfo.venue}</p>
              </div>
            )}
            {teamInfo.id && (
              <div>
                <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "4px" }}>ID del Equipo</p>
                <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{teamInfo.id}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "stats" && showStatsTab && (
        <div style={cardStyle}>
          {tabsLoading.stats ? (
            <p style={{ color: "#64748b" }}>Cargando estadísticas...</p>
          ) : (
            <>
              {showSeasonStandings && (
                <>
                  <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Estadísticas de la Temporada</h2>
                  <SeasonStandingsStats standingsRow={detailedStats} variant="default" />
                </>
              )}
              {teamStatistics.length > 0 && (
                <div style={{ marginTop: showSeasonStandings ? "20px" : 0 }}>
                  <h3 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Estadísticas Detalladas</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                    {teamStatistics.map((stat, idx) => (
                      <div key={idx} style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
                        <p style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px" }}>{stat.type || "N/A"}</p>
                        <p style={{ color: "#1a1a1a", fontSize: "16px", fontWeight: "600" }}>{stat.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "partidos" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Partidos</h2>
          {tabsLoading.partidos ? (
            <p style={{ color: "#64748b" }}>Cargando partidos...</p>
          ) : (
            <>
              {fixtures.length > 0 && (
                <div style={{ marginBottom: "30px" }}>
                  <h3 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Últimos Partidos</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Fecha</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Rival</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Resultado</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Local/Visitante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(fixtures) && fixtures.length > 0 ? fixtures.map((fixture, idx) => {
                          if (!fixture || !fixture.teams || !fixture.fixture) return null;
                          
                          const isHome = fixture.teams.home?.id === parseInt(teamId);
                          const rival = isHome ? (fixture.teams.away?.name || "N/A") : (fixture.teams.home?.name || "N/A");
                          const goalsFor = isHome ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
                          const goalsAgainst = isHome ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);
                          const matchColor = getMatchColor(fixture, teamId);
                          
                          return (
                            <tr 
                              key={idx} 
                              style={{ 
                                borderBottom: "1px solid #f1f5f9",
                                backgroundColor: matchColor + "20" // Color con transparencia
                              }}
                            >
                              <td style={{ padding: "10px", color: "#1a1a1a" }}>
                                {fixture.fixture.date ? new Date(fixture.fixture.date).toLocaleDateString() : "N/A"}
                              </td>
                              <td style={{ padding: "10px", color: "#1a1a1a" }}>vs {rival}</td>
                              <td style={{ padding: "10px", color: "#1a1a1a", fontWeight: "600" }}>
                                {goalsFor !== null && goalsAgainst !== null ? `${goalsFor} - ${goalsAgainst}` : "N/A"}
                              </td>
                              <td style={{ padding: "10px", color: "#64748b" }}>{isHome ? "Local" : "Visitante"}</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                              No hay partidos disponibles
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {upcomingFixtures.length > 0 && (
                <div>
                  <h3 style={{ color: "#1a1a1a", marginBottom: "12px" }}>Próximos Partidos</h3>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Fecha</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Rival</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Competición</th>
                          <th style={{ padding: "10px", textAlign: "left", color: "#64748b" }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(upcomingFixtures) && upcomingFixtures.length > 0 ? upcomingFixtures.map((fixture, idx) => {
                          if (!fixture || !fixture.teams || !fixture.fixture) return null;
                          
                          const isHome = fixture.teams.home?.id === parseInt(teamId);
                          const rival = isHome ? (fixture.teams.away?.name || "N/A") : (fixture.teams.home?.name || "N/A");
                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "10px", color: "#1a1a1a" }}>
                                {fixture.fixture.date ? new Date(fixture.fixture.date).toLocaleDateString() : "N/A"}
                              </td>
                              <td style={{ padding: "10px", color: "#1a1a1a" }}>vs {rival}</td>
                              <td style={{ padding: "10px", color: "#64748b" }}>{fixture.league?.name || "N/A"}</td>
                              <td style={{ padding: "10px", color: "#64748b" }}>{fixture.fixture.status?.long || "Programado"}</td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan="4" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                              No hay próximos partidos disponibles
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {fixtures.length === 0 && upcomingFixtures.length === 0 && (
                <p style={{ color: "#64748b" }}>No hay partidos disponibles</p>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "jugadores" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Plantilla</h2>
          {tabsLoading.jugadores ? (
            <p style={{ color: "#64748b" }}>Cargando jugadores...</p>
          ) : players.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#64748b" }}>Jugador</th>
                    <th style={{ padding: "12px", textAlign: "left", color: "#64748b" }}>Posición</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(players) && players.length > 0 ? players.map((player, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px", color: "#1a1a1a" }}>{player?.name || "N/A"}</td>
                      <td style={{ padding: "12px", color: "#64748b" }}>{player?.position || "N/A"}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="2" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                        No hay jugadores disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No hay jugadores disponibles</p>
          )}
        </div>
      )}

      {activeTab === "estadisticas" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Estadísticas de Jugadores</h2>
          {tabsLoading.estadisticas ? (
            <p style={{ color: "#64748b" }}>Cargando estadísticas...</p>
          ) : playersStats.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px", textAlign: "left", color: "#64748b" }}>Posición</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Apariciones</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Minutos</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Goles</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Asistencias</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Tiros</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Pases</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Precisión Pases</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Duelos</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Dribbles</th>
                    <th style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>Calificación</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(playersStats) && playersStats.length > 0 ? playersStats.map((player, idx) => {
                    if (!player) return null;
                    const stats = player.statistics?.[0] || {};
                    const games = stats.games || {};
                    const goals = stats.goals || {};
                    const shots = stats.shots || {};
                    const passes = stats.passes || {};
                    const duels = stats.duels || {};
                    const dribbles = stats.dribbles || {};
                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px", color: "#1a1a1a" }}>{player.position || "N/A"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{games.appearences || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{games.minutes || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{goals.total || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{goals.assists || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{shots.total || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{passes.total || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{passes.accuracy ? `${passes.accuracy}%` : "N/A"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{duels.won || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{dribbles.success || "0"}</td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#64748b" }}>{games.rating || "N/A"}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan="11" style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                        No hay estadísticas de jugadores disponibles
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No hay estadísticas de jugadores disponibles. {(!leagueId || !currentSeason) && "Faltan leagueId o season para cargar estadísticas."}</p>
          )}
        </div>
      )}

      {activeTab === "lesiones" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Historial de Lesiones</h2>
          {tabsLoading.lesiones ? (
            <p style={{ color: "#64748b" }}>Cargando lesiones...</p>
          ) : Array.isArray(injuries) && injuries.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {injuries.map((injury, idx) => {
                if (!injury) return null;
                return (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    borderLeft: "4px solid #e74c3c"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: "4px" }}>
                        {injury.player?.name || "Jugador desconocido"}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "14px" }}>
                        Tipo: {injury.player?.reason || "N/A"}
                      </p>
                    </div>
                    <span style={{
                      padding: "4px 12px",
                      backgroundColor: injury.fixture?.status?.long === "Match Finished" ? "#27ae60" : "#f39c12",
                      color: "#fff",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: "500"
                    }}>
                      {injury.fixture?.status?.long || "Activo"}
                    </span>
                  </div>
                  {injury.fixture?.date && (
                    <p style={{ color: "#64748b", fontSize: "12px", marginTop: "8px" }}>
                      Fecha: {new Date(injury.fixture.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No hay lesiones registradas</p>
          )}
        </div>
      )}

      {/* Transferencias movidas al final */}
      {activeTab === "transferencias" && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px", color: "#1a1a1a" }}>Transferencias y Contratos ({currentSeason})</h2>
          {tabsLoading.transferencias ? (
            <p style={{ color: "#64748b" }}>Cargando transferencias...</p>
          ) : Array.isArray(transfers) && transfers.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {transfers.map((transfer, idx) => {
                if (!transfer) return null;
                return (
                <div
                  key={idx}
                  style={{
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    borderLeft: "4px solid #4FC3F7"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                    <div>
                      <p style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: "4px" }}>
                        {transfer.player?.name || "Jugador desconocido"}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "14px" }}>
                        {transfer.transfers?.[0]?.teams?.out?.name || "N/A"} → {transfer.transfers?.[0]?.teams?.in?.name || "N/A"}
                      </p>
                    </div>
                    {transfer.transfers?.[0]?.date && (
                      <p style={{ color: "#64748b", fontSize: "12px" }}>
                        {new Date(transfer.transfers[0].date).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {transfer.transfers?.[0]?.type && (
                    <p style={{ color: "#64748b", fontSize: "12px", marginTop: "4px" }}>
                      Tipo: {transfer.transfers[0].type}
                    </p>
                  )}
                </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "#64748b" }}>No hay transferencias registradas para la temporada {currentSeason}</p>
          )}
        </div>
      )}
    </div>
  );
}
