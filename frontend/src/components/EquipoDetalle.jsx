import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { 
  getTeamInfo, 
  getTeamStats, 
  getTeamFixtures, 
  getTeamPlayers,
  getTeamInjuries,
  getTeamTransfers,
  getTeamPlayersStats,
  getJugadorInfo,
  getJugadorPartidos,
  getTeamProfileByDomain,
} from "../api/api";
import PlayerCard from "./PlayerCard";
import PlayerMatchesTable from "./PlayerMatchesTable";
import PlayerModal from "./Partidos/PlayerModal";
import SeasonStandingsStats from "./SeasonStandingsStats";
import PremiumFeatureGate, { FEATURES } from "./Freemium/PremiumFeatureGate";
import { formatStatDisplay, hasSeasonStandingContent, hasStatValue } from "../utils/statDisplay";
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from "../constants/advancedMetricLabels";

export default function EquipoDetalle({
  teamId,
  onBack,
  domain = "club",
  competitionId = null,
  season = null,
}) {
  console.log("🟢 EquipoDetalle.jsx SE ESTÁ RENDERIZANDO - Este es el componente REAL que se usa");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [upcomingFixtures, setUpcomingFixtures] = useState([]);
  const [players, setPlayers] = useState([]);
  const [injuries, setInjuries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [playersStats, setPlayersStats] = useState([]);
  const [currentSeason, setCurrentSeason] = useState("2024");
  const [leagueId, setLeagueId] = useState(null);
  const [advancedStats, setAdvancedStats] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState(null);

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

  // Función para obtener el color según el resultado del partido (colores suaves)
  const getMatchColor = (fixture, teamId) => {
    if (!fixture?.teams || !teamId || !fixture?.goals) return "rgba(241, 245, 249, 0.25)"; // Color neutro si falta información
    
    const isLocal = fixture.teams.home?.id === parseInt(teamId);
    const goalsFor = isLocal ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
    const goalsAgainst = isLocal ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);

    // Validar que los goles sean números válidos
    if (goalsFor === null || goalsAgainst === null) return "rgba(241, 245, 249, 0.25)";

    if (goalsFor > goalsAgainst) return "rgba(46, 204, 113, 0.25)"; // Verde suave - ganó
    if (goalsFor === goalsAgainst) return "rgba(241, 196, 15, 0.25)"; // Amarillo suave - empató
    return "rgba(231, 76, 60, 0.25)"; // Rojo suave - perdió
  };

  // Función para obtener la posición del rival
  const getRivalPosition = (fixture, rivalId) => {
    if (!fixture || !rivalId) return null;
    
    // Intentar obtener desde fixture.league.standings
    if (fixture.league?.standings && Array.isArray(fixture.league.standings)) {
      const standings = fixture.league.standings[0]; // Primera división/grupo
      if (Array.isArray(standings)) {
        const teamStanding = standings.find(t => t?.team?.id === rivalId);
        if (teamStanding?.rank) return teamStanding.rank;
      }
    }
    
    // Intentar obtener desde rival.rank (si existe)
    // Esta opción dependería de que el rival tenga la propiedad rank directamente
    
    return null;
  };

  // Función para traducir tipos de estadísticas al español
  const translateStatType = (type) => {
    if (!type) return "N/D";
    
    const translations = {
      // Estadísticas generales
      "Shots on Goal": "Tiros al Arco",
      "Shots off Goal": "Tiros Desviados",
      "Total Shots": "Total de Tiros",
      "Blocked Shots": "Tiros Bloqueados",
      "Shots insidebox": "Tiros dentro del Área",
      "Shots outsidebox": "Tiros fuera del Área",
      "Ball Possession": "Posesión de Balón",
      "Passes total": "Total de Pases",
      "Passes accurate": "Pases Precisos",
      "Passes %": "Precisión de Pases",
      "Corner Kicks": "Córners",
      "Fouls": "Faltas",
      "Goalkeeper Saves": "Paradas del Portero",
      "Offsides": "Fueras de Juego",
      "Yellow Cards": "Tarjetas Amarillas",
      "Red Cards": "Tarjetas Rojas",
      "Yellow-Red Cards": "Tarjetas Amarillas-Rojas",
      "Total Cards": "Total de Tarjetas",
      
      // Penales
      "Penalties Scored": "Penales Anotados",
      "Penalties Missed": "Penales Fallados",
      "Penalties Won": "Penales Ganados",
      "Penalties Committed": "Penales Cometidos",
      
      // Goles
      "Goals For": "Goles a Favor",
      "Goals Against": "Goles en Contra",
      "Goals Scored": "Goles Anotados",
      "Goals Conceded": "Goles Recibidos",
      
      // Duelos
      "Duels Total": "Duelos Totales",
      "Duels Won": "Duelos Ganados",
      "Duels Lost": "Duelos Perdidos",
      
      // Dribbles
      "Dribbles Attempts": "Intentos de Dribbles",
      "Dribbles Success": "Dribbles Exitosos",
      
      // Tiros
      "Shots on Target": "Tiros al Blanco",
      "Shots off Target": "Tiros Desviados",
      
      // Otras
      "Long Balls": "Pases Largos",
      "Crosses Total": "Centros Totales",
      "Crosses Accurate": "Centros Precisos"
    };
    
    return translations[type] || type;
  };

  // Función para traducir posiciones de jugadores al español
  const translatePosition = (position) => {
    if (!position) return "N/D";
    
    const translations = {
      "Goalkeeper": "Portero",
      "Defender": "Defensor",
      "Midfielder": "Mediocampista",
      "Attacker": "Atacante",
      "Forward": "Delantero",
      "Winger": "Extremo",
      "Striker": "Delantero Centro",
      "Center Back": "Defensor Central",
      "Full Back": "Lateral",
      "Defensive Midfielder": "Mediocampista Defensivo",
      "Attacking Midfielder": "Mediocampista Ofensivo",
      "Left Back": "Lateral Izquierdo",
      "Right Back": "Lateral Derecho",
      "Left Midfielder": "Mediocampista Izquierdo",
      "Right Midfielder": "Mediocampista Derecho",
      "Left Winger": "Extremo Izquierdo",
      "Right Winger": "Extremo Derecho"
    };
    
    return translations[position] || position;
  };

  // Función para traducir estados de partidos
  const translateMatchStatus = (status) => {
    if (!status) return "Programado";
    
    const translations = {
      "Match Finished": "Partido Finalizado",
      "Not Started": "No Iniciado",
      "Time to be Defined": "Hora por Definir",
      "Match Postponed": "Partido Aplazado",
      "Match Cancelled": "Partido Cancelado",
      "Match Suspended": "Partido Suspendido",
      "Match Delayed": "Partido Retrasado",
      "Match Abandoned": "Partido Abandonado",
      "First Half": "Primer Tiempo",
      "Second Half": "Segundo Tiempo",
      "Halftime": "Descanso",
      "Extra Time": "Tiempo Extra",
      "Penalty In Progress": "Penales en Curso",
      "Break Time": "Tiempo de Descanso",
      "After Penalties": "Después de Penales"
    };
    
    return translations[status] || status;
  };

  // Función para traducir tipos de transferencias
  const translateTransferType = (type) => {
    if (!type) return "";
    
    const translations = {
      "Free": "Libre",
      "Loan": "Préstamo",
      "Transfer": "Traspaso",
      "Contract": "Contrato",
      "End of Loan": "Fin de Préstamo"
    };
    
    return translations[type] || type;
  };

  // Función para calcular estadísticas avanzadas desde los fixtures
  const calculateAdvancedStats = (allFixtures, teamId) => {
    if (!Array.isArray(allFixtures) || allFixtures.length === 0) return null;

    const teamIdNum = parseInt(teamId);
    let totalGoalsFor = 0;
    let totalGoalsAgainst = 0;
    let totalGoals = 0;
    let cleanSheets = 0; // Portería a cero
    let failedToScore = 0; // Sin anotar
    let totalMatches = 0;
    
    // Contadores para Over/Under
    const overUnder = {
      over05: 0, // Más de 0.5 goles
      over15: 0, // Más de 1.5 goles
      over25: 0, // Más de 2.5 goles
      over35: 0, // Más de 3.5 goles
      under05: 0, // Menos de 0.5 goles
      under15: 0, // Menos de 1.5 goles
      under25: 0, // Menos de 2.5 goles
      under35: 0  // Menos de 3.5 goles
    };

    allFixtures.forEach(fixture => {
      if (!fixture?.teams || !fixture?.goals) return;
      
      const isHome = fixture.teams.home?.id === teamIdNum;
      const goalsFor = isHome ? (fixture.goals?.home ?? 0) : (fixture.goals?.away ?? 0);
      const goalsAgainst = isHome ? (fixture.goals?.away ?? 0) : (fixture.goals?.home ?? 0);
      const totalMatchGoals = goalsFor + goalsAgainst;

      totalGoalsFor += goalsFor;
      totalGoalsAgainst += goalsAgainst;
      totalGoals += totalMatchGoals;
      totalMatches++;

      // Portería a cero (no recibieron goles)
      if (goalsAgainst === 0) cleanSheets++;
      
      // Sin anotar (no anotaron goles)
      if (goalsFor === 0) failedToScore++;

      // Over/Under
      if (totalMatchGoals > 0.5) overUnder.over05++;
      if (totalMatchGoals > 1.5) overUnder.over15++;
      if (totalMatchGoals > 2.5) overUnder.over25++;
      if (totalMatchGoals > 3.5) overUnder.over35++;
      
      if (totalMatchGoals < 0.5) overUnder.under05++;
      if (totalMatchGoals < 1.5) overUnder.under15++;
      if (totalMatchGoals < 2.5) overUnder.under25++;
      if (totalMatchGoals < 3.5) overUnder.under35++;
    });

    if (totalMatches === 0) return null;

    // Calcular promedios
    const avgGoalsPerMatch = (totalGoalsFor / totalMatches).toFixed(2);
    const avgGoalsAgainstPerMatch = (totalGoalsAgainst / totalMatches).toFixed(2);
    const avgTotalGoalsPerMatch = (totalGoals / totalMatches).toFixed(2);

    // Calcular porcentajes de Over/Under
    const overUnderPercentages = {
      over05: ((overUnder.over05 / totalMatches) * 100).toFixed(1),
      over15: ((overUnder.over15 / totalMatches) * 100).toFixed(1),
      over25: ((overUnder.over25 / totalMatches) * 100).toFixed(1),
      over35: ((overUnder.over35 / totalMatches) * 100).toFixed(1),
      under05: ((overUnder.under05 / totalMatches) * 100).toFixed(1),
      under15: ((overUnder.under15 / totalMatches) * 100).toFixed(1),
      under25: ((overUnder.under25 / totalMatches) * 100).toFixed(1),
      under35: ((overUnder.under35 / totalMatches) * 100).toFixed(1)
    };

    // Goles por minuto (aproximado: asumiendo 90 minutos por partido)
    const totalMinutes = totalMatches * 90;
    const goalsPerMinute = totalMinutes > 0 ? (totalGoalsFor / totalMinutes).toFixed(4) : "0.0000";
    const goalsPerMinuteAgainst = totalMinutes > 0 ? (totalGoalsAgainst / totalMinutes).toFixed(4) : "0.0000";

    return {
      avgGoalsPerMatch,
      avgGoalsAgainstPerMatch,
      avgTotalGoalsPerMatch,
      goalsPerMinute,
      goalsPerMinuteAgainst,
      cleanSheets,
      cleanSheetsPercentage: ((cleanSheets / totalMatches) * 100).toFixed(1),
      failedToScore,
      failedToScorePercentage: ((failedToScore / totalMatches) * 100).toFixed(1),
      overUnder: overUnderPercentages,
      totalMatches
    };
  };

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    if (domain === "selection") {
      let cancelled = false;

      const loadSelectionProfile = async () => {
        setLoading(true);
        setTeamStats(null);
        setAdvancedStats(null);
        setPlayers([]);
        setPlayersStats([]);
        setInjuries([]);
        setTransfers([]);
        setFixtures([]);
        setUpcomingFixtures([]);

        try {
          const opts = {};
          if (competitionId != null && `${competitionId}` !== "") {
            opts.competitionId = competitionId;
          }
          if (season != null && `${season}` !== "") {
            opts.season = `${season}`;
          }

          const profile = await getTeamProfileByDomain("selection", teamId, opts);
          if (cancelled) return;

          const ti = profile?.teamInfo;
          const apiTeam = ti?.team;
          if (!apiTeam) {
            setTeamInfo(null);
            if (!cancelled) {
              setLoading(false);
            }
            return;
          }

          const mergedTeam = {
            ...apiTeam,
            venue: ti?.venue || apiTeam?.venue,
          };
          setTeamInfo(mergedTeam);

          const resolvedLeague = competitionId ?? ti?.league?.id;
          if (resolvedLeague != null && `${resolvedLeague}` !== "") {
            setLeagueId(Number(resolvedLeague));
          } else {
            setLeagueId(null);
          }

          const resolvedSeason =
            season != null && `${season}` !== ""
              ? `${season}`
              : calculateSeason() || `${new Date().getFullYear()}`;
          setCurrentSeason(resolvedSeason);

          const recent = Array.isArray(profile?.recentFixtures) ? profile.recentFixtures : [];
          const now = new Date();
          const past = recent.filter((f) => f?.fixture?.date && new Date(f.fixture.date) < now);
          const upcoming = recent.filter((f) => f?.fixture?.date && new Date(f.fixture.date) >= now);
          setFixtures(past.slice(0, 5));
          setUpcomingFixtures(upcoming.slice(0, 10));
          setAdvancedStats(calculateAdvancedStats(past, teamId));

          setPlayers(Array.isArray(profile?.squad) ? profile.squad : []);

          const statsPayload = profile?.statistics;
          if (statsPayload) {
            const normalized = Array.isArray(statsPayload)
              ? statsPayload[0] ?? null
              : statsPayload;
            setTeamStats(normalized || null);
          } else {
            setTeamStats(null);
          }

          const ps = profile?.playerStatistics || [];
          const statsOnly = ps
            .filter((row) => row?.player?.id)
            .map((row) => ({
              id: row.player.id,
              player: row.player,
              position: translatePosition(
                row.statistics?.[0]?.games?.position || row.player?.position
              ),
              statistics: Array.isArray(row.statistics) ? row.statistics : [],
            }));
          setPlayersStats(statsOnly);

          setInjuries(Array.isArray(profile?.injuries) ? profile.injuries : []);
          setTransfers(Array.isArray(profile?.transfers) ? profile.transfers : []);
        } catch (err) {
          console.error("Error cargando datos de la selección:", err);
          setTeamInfo(null);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      loadSelectionProfile();
      return () => {
        cancelled = true;
      };
    }

    const loadTeamData = async () => {
      setLoading(true);
      try {
        // Obtener información básica del equipo
        const infoRes = await axios.get(`/api/team-info/${teamId}`);
        
        if (infoRes.data.response && infoRes.data.response.length > 0) {
          const teamData = infoRes.data.response[0];
          const team = teamData.team;
          setTeamInfo(team);

          // Obtener liga del equipo si está disponible
          const detectedLeagueId = teamData.league?.id;
          setLeagueId(detectedLeagueId);
          
          // Calcular temporada actual (siempre debe tener un valor)
          const seasonCalc = calculateSeason();
          if (seasonCalc) {
            setCurrentSeason(seasonCalc);
          } else {
            // Fallback: usar año actual si calculateSeason falla
            setCurrentSeason(new Date().getFullYear().toString());
          }

          // Obtener estadísticas si hay leagueId
          if (detectedLeagueId) {
            try {
              const statsRes = await getTeamStats(teamId, detectedLeagueId, seasonCalc);
              if (statsRes?.response && Array.isArray(statsRes.response) && statsRes.response.length > 0) {
                setTeamStats(statsRes.response[0]);
              }
            } catch (err) {
              console.error("Error obteniendo estadísticas:", err);
            }
          }

          // Obtener partidos pasados (más partidos para estadísticas avanzadas)
          try {
            const fixturesRes = await getTeamFixtures(teamId, 30); // Obtener más partidos para estadísticas
            if (fixturesRes?.response && Array.isArray(fixturesRes.response)) {
              const now = new Date();
              const past = fixturesRes.response.filter(f => f?.fixture?.date && new Date(f.fixture.date) < now);
              const upcoming = fixturesRes.response.filter(f => f?.fixture?.date && new Date(f.fixture.date) >= now);
              
              setFixtures(past.slice(0, 5)); // Solo últimos 5 partidos para mostrar
              setUpcomingFixtures(upcoming.slice(0, 10));
              
              // Calcular estadísticas avanzadas con todos los partidos pasados
              const advanced = calculateAdvancedStats(past, teamId);
              setAdvancedStats(advanced);
            }
          } catch (err) {
            console.error("Error obteniendo partidos:", err);
            setFixtures([]);
            setUpcomingFixtures([]);
            setAdvancedStats(null);
          }

          // Obtener próximos partidos
          try {
            const upcomingRes = await axios.get(`/api/team-last-matches?teamId=${teamId}&limit=10`);
            if (upcomingRes.data?.response && Array.isArray(upcomingRes.data.response)) {
              const now = new Date();
              const upcoming = upcomingRes.data.response.filter(f => f?.fixture?.date && new Date(f.fixture.date) >= now);
              setUpcomingFixtures(upcoming.slice(0, 10));
            }
          } catch (err) {
            console.error("Error obteniendo próximos partidos:", err);
            setUpcomingFixtures([]);
          }

          // Obtener jugadores (solo plantilla, sin datos personales)
          try {
            const playersRes = await getTeamPlayers(teamId, seasonCalc);
            if (playersRes?.response && Array.isArray(playersRes.response) && playersRes.response.length > 0) {
              const squad = playersRes.response[0];
              setPlayers(Array.isArray(squad.players) ? squad.players : []);
            } else {
              setPlayers([]);
            }
          } catch (err) {
            console.error("Error obteniendo jugadores:", err);
            setPlayers([]);
          }

          // Obtener lesiones
          try {
            const injuriesRes = await getTeamInjuries(teamId);
            if (injuriesRes?.response && Array.isArray(injuriesRes.response)) {
              setInjuries(injuriesRes.response);
            } else {
              setInjuries([]);
            }
          } catch (err) {
            console.error("Error obteniendo lesiones:", err);
            setInjuries([]);
          }

          // Obtener transferencias (filtradas por temporada actual)
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
                  return transferData.season.toString() === seasonCalc;
                }
                
                // Si no tiene season, filtrar por año de la fecha
                if (transferData?.date) {
                  try {
                    const transferYear = new Date(transferData.date).getFullYear();
                    return transferYear.toString() === seasonCalc;
                  } catch (dateErr) {
                    console.warn("Error parseando fecha de transferencia:", dateErr);
                    return false;
                  }
                }
                
                return false;
              });
              setTransfers(filteredTransfers);
            } else {
              setTransfers([]);
            }
          } catch (err) {
            console.error("Error obteniendo transferencias:", err);
            setTransfers([]);
          }

          // Obtener estadísticas de jugadores (sin datos personales)
          if (detectedLeagueId) {
            try {
              const playersStatsRes = await getTeamPlayersStats(teamId, detectedLeagueId, seasonCalc);
              if (playersStatsRes?.response && Array.isArray(playersStatsRes.response)) {
                // Mantener datos del jugador con ID correcto (player.player.id)
                const statsOnly = playersStatsRes.response
                  .filter(player => player?.player?.id) // Filtrar solo jugadores válidos
                  .map(player => ({
                    id: player.player.id, // ID correcto de API-Football
                    player: player.player, // Datos completos del jugador
                    position: translatePosition(player.statistics?.[0]?.games?.position || player.player?.position),
                    statistics: Array.isArray(player.statistics) ? player.statistics : []
                  }));
                setPlayersStats(statsOnly);
              } else {
                setPlayersStats([]);
              }
            } catch (err) {
              console.error("Error obteniendo estadísticas de jugadores:", err);
              setPlayersStats([]);
            }
          }
        }
      } catch (error) {
        console.error("Error cargando datos del equipo:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTeamData();
  }, [teamId, domain, competitionId, season]);

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    borderRadius: "10px",
    padding: "16px",
    marginBottom: "14px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)"
  };

  const titleStyle = {
    fontSize: "16px",
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: "12px"
  };

  const statItemStyle = {
    padding: "8px",
    backgroundColor: "#f8fafc",
    borderRadius: "6px",
    marginBottom: "6px"
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text-primary, #e2e8f0)",
          backgroundColor: "var(--bg-card, #1a1a1a)",
          borderRadius: "12px",
          margin: "16px",
        }}
      >
        {domain === "selection"
          ? "Cargando información de la selección..."
          : "Cargando información del equipo..."}
      </div>
    );
  }

  if (!teamInfo) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          color: "var(--text-primary, #e2e8f0)",
          backgroundColor: "var(--bg-card, #1a1a1a)",
          borderRadius: "12px",
          margin: "16px",
        }}
      >
        {domain === "selection"
          ? "No se encontró información de la selección."
          : "No se encontró información del equipo."}
      </div>
    );
  }

  // Extraer estadísticas detalladas del equipo
  const detailedStats = teamStats?.league?.standings?.[0]?.[0] || {};
  const rawStatistics = teamStats?.league?.standings?.[0]?.[0]?.statistics;
  const teamStatistics = Array.isArray(rawStatistics)
    ? rawStatistics.filter((stat) => hasStatValue(stat?.value))
    : [];

  const venueObj =
    teamInfo.venue && typeof teamInfo.venue === "object" ? teamInfo.venue : null;
  const venueLabel =
    typeof teamInfo.venue === "string"
      ? teamInfo.venue
      : venueObj?.name || venueObj?.city || null;
  const venueImageUrl = venueObj?.image || null;
  const stadiumAlt = venueLabel || "Estadio";

  const formString =
    typeof detailedStats.form === "string"
      ? detailedStats.form
      : typeof teamStats?.form === "string"
        ? teamStats.form
        : "";

  const showSeasonStandings = hasSeasonStandingContent(detailedStats, { form: formString });

  return (
    <div className="team-detail-page" style={{ padding: "20px", width: "100%", backgroundColor: "#F1F5F9" }}>
      {/* Header del equipo con imagen grande y estadio */}
      <div className={domain === "selection" ? "selection-header team-header" : "team-header"} style={{
        ...cardStyle,
        textAlign: "center",
        padding: "20px 16px"
      }}>
        {/* Imagen del equipo - más pequeña */}
        {teamInfo?.logo && (
          <img 
            src={teamInfo.logo} 
            alt={teamInfo.name || "Equipo"}
            className={domain === "selection" ? "selection-header-logo team-header-logo" : "team-header-logo"}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            style={{ 
              width: "120px", 
              height: "120px", 
              objectFit: "contain",
              margin: "0 auto 12px auto",
              display: "block"
            }} 
          />
        )}
        
        {/* Imagen del estadio - más pequeña */}
        {venueImageUrl && (
          <img 
            src={venueImageUrl} 
            alt={stadiumAlt}
            className={domain === "selection" ? "selection-venue-image team-venue-image" : "team-venue-image"}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            style={{ 
              width: "50%",
              maxWidth: "350px",
              borderRadius: "8px",
              margin: "12px auto",
              display: "block"
            }}
          />
        )}

        <h1 style={{ 
          fontSize: "22px", 
          fontWeight: "700", 
          color: "#1a1a1a", 
          marginBottom: "10px" 
        }}>
          {teamInfo.name}
        </h1>
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "4px",
          alignItems: "center",
          marginBottom: "12px"
        }}>
          {teamInfo.country && (
            <p style={{ color: "#64748b", fontSize: "13px" }}>País: {teamInfo.country}</p>
          )}
          {teamInfo.founded && (
            <p style={{ color: "#64748b", fontSize: "13px" }}>Fundado: {teamInfo.founded}</p>
          )}
          {venueLabel && (
            <p style={{ color: "#64748b", fontSize: "13px" }}>Estadio: {venueLabel}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
        {onBack && (
          <button
            onClick={onBack}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4FC3F7",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500"
            }}
          >
            ← Volver
          </button>
        )}
        </div>
      </div>

      {/* Estadísticas de la temporada */}
      {showSeasonStandings && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas de la Temporada</h2>
          <SeasonStandingsStats standingsRow={detailedStats} variant="compact" />
          {formString && (
            <div style={{ marginTop: "12px" }}>
              <p style={{ color: "#64748b", fontSize: "11px", marginBottom: "2px" }}>Forma</p>
              <div style={{ display: "flex", gap: "3px" }}>
                {formString.split("").map((letra, idx) => {
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
                        width: "20px",
                        height: "20px",
                        lineHeight: "20px",
                        textAlign: "center",
                        backgroundColor: color,
                        color: "#fff",
                        borderRadius: "3px",
                        fontSize: "10px",
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

      {/* Estadísticas de juego detalladas */}
      {Array.isArray(teamStatistics) && teamStatistics.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas de Juego</h2>
          <div className="team-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
            {teamStatistics.map((stat, idx) => (
              <div key={idx} style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>
                  {translateStatType(stat?.type)}
                </p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {formatStatDisplay(stat?.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadísticas Avanzadas */}
      {advancedStats && (
        <PremiumFeatureGate
          feature={FEATURES.ADVANCED_STATS}
          title="Estadísticas avanzadas"
          description="Promedios, portería a cero, over/under y más métricas están en GOAL_LOGIC PRO."
        >
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas Avanzadas</h2>
          
          {/* Promedio de goles y goles por minuto */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "10px" }}>
              Promedio de Goles
            </h3>
            <div className="team-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Goles por Partido</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.avgGoalsPerMatch}
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Goles por Minuto</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.goalsPerMinute}
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Goles Recibidos/Partido</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.avgGoalsAgainstPerMatch}
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Total Goles/Partido</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.avgTotalGoalsPerMatch}
                </p>
              </div>
            </div>
          </div>

          {/* Portería a cero y sin anotar */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "10px" }}>
              Defensa y Ataque
            </h3>
            <div className="team-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px" }}>
              <div style={statItemStyle}>
                <p className={`${ADVANCED_METRIC_LABEL_CLASS} advanced-metric-label--light`} style={getAdvancedMetricLabelStyle({}, 'light')}>{ML.cleanSheets}</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.cleanSheets} ({advancedStats.cleanSheetsPercentage}%)
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Sin Anotar</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.failedToScore} ({advancedStats.failedToScorePercentage}%)
                </p>
              </div>
            </div>
          </div>

          {/* Over/Under */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "10px" }}>
              Over/Under (Basado en {advancedStats.totalMatches} partidos)
            </h3>
            <div className="team-section-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Over 0.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.over05}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Over 1.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.over15}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p className={`${ADVANCED_METRIC_LABEL_CLASS} advanced-metric-label--light`} style={getAdvancedMetricLabelStyle({}, 'light')}>{ML.over25}</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.over25}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Over 3.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.over35}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Under 0.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.under05}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Under 1.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.under15}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Under 2.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.under25}%
                </p>
              </div>
              <div style={statItemStyle}>
                <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>Under 3.5</p>
                <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                  {advancedStats.overUnder.under35}%
                </p>
              </div>
            </div>
          </div>
        </div>
        </PremiumFeatureGate>
      )}

      {/* Estadísticas de jugadores (sin datos personales) */}
      {Array.isArray(playersStats) && playersStats.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Estadísticas de Jugadores</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "8px", textAlign: "left", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Posición
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Apariciones
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Minutos
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Goles
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Asistencias
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Tiros
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Pases
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Precisión Pases
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Duelos
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Dribbles
                  </th>
                  <th style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "11px", fontWeight: "600" }}>
                    Calificación
                  </th>
                </tr>
              </thead>
              <tbody>
                {playersStats.map((player, idx) => {
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
                      <td style={{ padding: "8px", color: "#1a1a1a", fontSize: "12px" }}>{translatePosition(player.position)}</td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {games.appearences || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {games.minutes || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {goals.total || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {goals.assists || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {shots.total || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {passes.total || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {passes.accuracy ? `${passes.accuracy}%` : "N/D"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {duels.won || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {dribbles.success || "0"}
                      </td>
                      <td style={{ padding: "8px", textAlign: "center", color: "#64748b", fontSize: "12px" }}>
                        {games.rating || "N/D"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Información disciplinaria */}
      {Array.isArray(teamStatistics) && teamStatistics.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Información Disciplinaria</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
            {teamStatistics
              .filter(stat => stat?.type && (stat.type.toLowerCase().includes('card') || stat.type.toLowerCase().includes('yellow') || stat.type.toLowerCase().includes('red')))
              .map((stat, idx) => (
                <div key={idx} style={statItemStyle}>
                  <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>
                    {translateStatType(stat.type)}
                  </p>
                  <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                    {stat.value || "N/D"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Información sobre penales */}
      {Array.isArray(teamStatistics) && teamStatistics.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Información sobre Penales</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
            {teamStatistics
              .filter(stat => stat?.type && stat.type.toLowerCase().includes('penalty'))
              .map((stat, idx) => (
                <div key={idx} style={statItemStyle}>
                  <p style={{ color: "#64748b", fontSize: "10px", marginBottom: "2px" }}>
                    {translateStatType(stat.type)}
                  </p>
                  <p style={{ color: "#1a1a1a", fontSize: "14px", fontWeight: "600" }}>
                    {stat.value || "N/D"}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Historial de lesiones */}
      {Array.isArray(injuries) && injuries.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Historial de Lesiones</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {injuries.map((injury, idx) => {
              if (!injury) return null;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "10px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    borderLeft: "3px solid #e74c3c"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                    <div>
                      <p style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: "2px", fontSize: "12px" }}>
                        {injury.player?.name || "Jugador desconocido"}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>
                        Tipo: {injury.player?.reason || "N/D"}
                      </p>
                    </div>
                    <span style={{
                      padding: "3px 8px",
                      backgroundColor: injury.fixture?.status?.long === "Match Finished" ? "#27ae60" : "#f39c12",
                      color: "#fff",
                      borderRadius: "8px",
                      fontSize: "10px",
                      fontWeight: "500"
                    }}>
                      {translateMatchStatus(injury.fixture?.status?.long) || "Activo"}
                    </span>
                  </div>
                  {injury.fixture?.date && (
                    <p style={{ color: "#64748b", fontSize: "10px", marginTop: "4px" }}>
                      Fecha: {new Date(injury.fixture.date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Últimos partidos con tarjetas modernas */}
      {Array.isArray(fixtures) && fixtures.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Últimos Partidos</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {fixtures.map((fixture, idx) => {
              if (!fixture || !fixture.teams || !fixture.fixture || !fixture.goals) return null;
              
              // Determinar si el equipo fue local o visitante
              const isLocal = fixture.teams.home?.id === parseInt(teamId);
              const equipoPrincipal = teamInfo?.name || "Equipo";
              const rival = isLocal ? fixture.teams.away : fixture.teams.home;
              
              // Crear texto del partido: "EquipoPrincipal vs Rival" o "Rival vs EquipoPrincipal"
              const textoPartido = isLocal
                ? `${equipoPrincipal} vs ${rival?.name || "N/D"}`
                : `${rival?.name || "N/D"} vs ${equipoPrincipal}`;
              
              // Obtener goles
              const goalsFor = isLocal ? (fixture.goals?.home ?? null) : (fixture.goals?.away ?? null);
              const goalsAgainst = isLocal ? (fixture.goals?.away ?? null) : (fixture.goals?.home ?? null);
              
              // Obtener color del partido (colores suaves)
              const bgColor = getMatchColor(fixture, teamId);
              
              // Formatear fecha
              const fechaFormateada = fixture.fixture.date 
                ? new Date(fixture.fixture.date).toLocaleDateString('es-ES', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  })
                : "N/D";
              
              return (
                <div
                  key={idx}
                  className="fixture-row"
                  style={{
                    backgroundColor: bgColor,
                    padding: "10px 12px",
                    borderRadius: "10px",
                    marginBottom: "0",
                    color: "#333",
                    fontWeight: 600,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(0,0,0,0.05)"
                  }}
                >
                  <p style={{ margin: "0 0 4px 0", fontSize: "13px", fontWeight: "600", color: "#1a1a1a" }}>
                    {textoPartido}
                  </p>
                  <p style={{ margin: "0 0 2px 0", fontSize: "11px", color: "#64748b", fontWeight: "500" }}>
                    Marcador: {goalsFor !== null && goalsAgainst !== null ? `${goalsFor} - ${goalsAgainst}` : "N/D"}
                  </p>
                  <p className="fixture-time" style={{ margin: "0", fontSize: "10px", color: "#64748b", fontWeight: "400" }}>
                    Fecha: {fechaFormateada}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Próximos partidos */}
      {Array.isArray(upcomingFixtures) && upcomingFixtures.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Próximos Partidos</h2>
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                  <th style={{ padding: "8px", textAlign: "left", color: "#64748b", fontSize: "11px" }}>Fecha</th>
                  <th style={{ padding: "8px", textAlign: "left", color: "#64748b", fontSize: "11px" }}>Rival</th>
                  <th style={{ padding: "8px", textAlign: "left", color: "#64748b", fontSize: "11px" }}>Competición</th>
                  <th style={{ padding: "8px", textAlign: "left", color: "#64748b", fontSize: "11px" }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {upcomingFixtures.map((fixture, idx) => {
                  if (!fixture || !fixture.teams || !fixture.fixture) return null;
                  
                  const isHome = fixture.teams.home?.id === parseInt(teamId);
                  const rival = isHome ? (fixture.teams.away?.name || "N/D") : (fixture.teams.home?.name || "N/D");
                  
                  // Traducir estado del partido
                  const estadoPartido = translateMatchStatus(fixture.fixture.status?.long);
                  
                  return (
                    <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", color: "#1a1a1a", fontSize: "12px" }}>
                        {fixture.fixture.date ? new Date(fixture.fixture.date).toLocaleDateString('es-ES') : "N/D"}
                      </td>
                      <td style={{ padding: "8px", color: "#1a1a1a", fontSize: "12px" }}>vs {rival}</td>
                      <td style={{ padding: "8px", color: "#64748b", fontSize: "12px" }}>{fixture.league?.name || "N/D"}</td>
                      <td style={{ padding: "8px", color: "#64748b", fontSize: "12px" }}>{estadoPartido}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plantilla con acordeón */}
      {(() => {
        // Usar playersStats si está disponible (tiene IDs correctos), sino usar players
        const availablePlayers = playersStats.length > 0 ? playersStats : players;
        
        if (!Array.isArray(availablePlayers) || availablePlayers.length === 0) {
          return null;
        }
        
        // Mapear players a formato compatible
        // Si usamos playersStats, ya tiene la estructura correcta con player.player.id
        // Si usamos players (de squad), necesitamos buscar el ID en playersStats
        const playersWithIds = availablePlayers.map(player => {
          let playerId;
          let playerName;
          let playerPhoto;
          let playerAge;
          let playerNationality;
          let playerPosition;
          let playerNumber;
          
          // Si viene de playersStats, tiene estructura: { id: player.player.id, player: {...}, ... }
          if (player.id && player.player) {
            // Ya viene de playersStats con ID correcto y datos del jugador
            playerId = player.id;
            playerName = player.player.name;
            playerPhoto = player.player.photo;
            playerAge = player.player.age;
            playerNationality = player.player.nationality;
            playerPosition = player.position || player.statistics?.[0]?.games?.position;
            playerNumber = player.statistics?.[0]?.games?.number;
          } else {
            // Viene de players (squad), buscar ID en playersStats por nombre
            playerName = player.name || player.player?.name;
            const playerStatsData = playersStats.find(p => {
              const statsName = p?.player?.name;
              return statsName && playerName && statsName.toLowerCase() === playerName.toLowerCase();
            });
            
            playerId = playerStatsData?.id || player.id || player.player?.id;
            playerPhoto = player.photo || player.player?.photo || playerStatsData?.player?.photo;
            playerAge = player.age || player.player?.age || playerStatsData?.player?.age;
            playerNationality = player.nationality || player.player?.nationality || playerStatsData?.player?.nationality;
            playerPosition = player.position || playerStatsData?.position;
            playerNumber = player.number || player.player?.number || playerStatsData?.statistics?.[0]?.games?.number;
          }
          
          console.log("ID enviado:", playerId, "Player completo:", player);
          
          return {
            id: playerId,
            nombre: playerName,
            foto: playerPhoto,
            edad: playerAge,
            nacionalidad: playerNationality,
            posicion: playerPosition,
            numero: playerNumber
          };
        }).filter(p => {
          // Filtrar jugadores sin ID válido
          const isValid = p.id && p.id !== null && p.id !== undefined && !isNaN(p.id);
          if (!isValid) {
            console.warn("⚠️ Jugador sin ID válido filtrado:", p);
          }
          return isValid;
        });

        return (
          <div style={cardStyle}>
            <h2 style={titleStyle}>Plantilla</h2>
            <div style={{ 
              display: "flex", 
              flexDirection: "column", 
              gap: "8px", 
              marginTop: "16px",
              maxHeight: "600px",
              overflowY: "auto"
            }}>
              {playersWithIds.map((jugador) => (
                <div
                  key={jugador.id}
                  onClick={() => {
                    if (jugador.id) {
                      setSelectedPlayerId(jugador.id);
                      setSelectedPlayerName(jugador.nombre);
                    }
                  }}
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    border: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e2e8f0";
                    e.currentTarget.style.borderColor = "#4FC3F7";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#f8fafc";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <span style={{ 
                    color: "#1a1a1a", 
                    fontSize: "14px", 
                    fontWeight: "500" 
                  }}>
                    {jugador.nombre || "Jugador"}
                  </span>
                  {jugador.posicion && (
                    <span style={{
                      fontSize: "11px",
                      color: "#64748b",
                      backgroundColor: "#e2e8f0",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontWeight: "500"
                    }}>
                      {translatePosition(jugador.posicion)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

      {/* Transferencias y contratos (filtradas por temporada actual, al final) */}
      {Array.isArray(transfers) && transfers.length > 0 && (
        <div style={cardStyle}>
          <h2 style={titleStyle}>Transferencias y Contratos ({currentSeason})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {transfers.map((transfer, idx) => {
              if (!transfer) return null;
              return (
                <div
                  key={idx}
                  style={{
                    padding: "10px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "6px",
                    borderLeft: "3px solid #4FC3F7"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "4px" }}>
                    <div>
                      <p style={{ color: "#1a1a1a", fontWeight: "600", marginBottom: "2px", fontSize: "12px" }}>
                        {transfer.player?.name || "Jugador desconocido"}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "11px" }}>
                        {transfer.transfers?.[0]?.teams?.out?.name || "N/D"} → {transfer.transfers?.[0]?.teams?.in?.name || "N/D"}
                      </p>
                    </div>
                    {transfer.transfers?.[0]?.date && (
                      <p style={{ color: "#64748b", fontSize: "10px" }}>
                        {new Date(transfer.transfers[0].date).toLocaleDateString('es-ES')}
                      </p>
                    )}
                  </div>
                  {transfer.transfers?.[0]?.type && (
                    <p style={{ color: "#64748b", fontSize: "10px", marginTop: "2px" }}>
                      Tipo: {translateTransferType(transfer.transfers[0].type)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
