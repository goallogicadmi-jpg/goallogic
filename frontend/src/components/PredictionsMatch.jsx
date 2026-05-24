import { useState } from "react";
import {
  getH2H,
  getTeamStats,
  getTeamInjuries,
  getTeamFixtures,
  getTeamPlayersStats
} from "../api/api";
import axios from "axios";
import { GoalLogicTitle } from "./GoalLogicTitle";
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from "../constants/advancedMetricLabels";

/**
 * Componente de Predicciones del Partido
 * Muestra 9 modelos de predicción basados en datos estadísticos
 * Funciona con dos equipos seleccionados (local y visitante)
 */
export default function PredictionsMatch({ 
  homeTeamId,
  awayTeamId,
  homeLeagueId,
  awayLeagueId,
  currentSeason
}) {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Función para obtener todos los datos del partido
   * Solicita todos los datos necesarios desde la API
   */
  const getMatchData = async () => {
    if (!homeTeamId || !awayTeamId) {
      throw new Error("IDs de equipos no disponibles");
    }

    try {
      // Obtener datos en paralelo
      const [
        h2hData,
        homeStats,
        awayStats,
        homeFixtures,
        awayFixtures,
        homeInjuries,
        awayInjuries,
        homePlayersStats,
        awayPlayersStats,
        homeTeamInfo,
        awayTeamInfo
      ] = await Promise.all([
        // H2H
        getH2H(homeTeamId, awayTeamId).catch(() => ({ response: [] })),
        // Estadísticas de equipos
        homeLeagueId && currentSeason 
          ? getTeamStats(homeTeamId, homeLeagueId, currentSeason).catch(() => ({ response: [] }))
          : Promise.resolve({ response: [] }),
        awayLeagueId && currentSeason
          ? getTeamStats(awayTeamId, awayLeagueId, currentSeason).catch(() => ({ response: [] }))
          : Promise.resolve({ response: [] }),
        // Últimos partidos (para forma reciente)
        getTeamFixtures(homeTeamId, 10).catch(() => ({ response: [] })),
        getTeamFixtures(awayTeamId, 10).catch(() => ({ response: [] })),
        // Lesiones
        getTeamInjuries(homeTeamId).catch(() => ({ response: [] })),
        getTeamInjuries(awayTeamId).catch(() => ({ response: [] })),
        // Estadísticas de jugadores (para top goleadores)
        homeLeagueId && currentSeason
          ? getTeamPlayersStats(homeTeamId, homeLeagueId, currentSeason).catch(() => ({ response: [] }))
          : Promise.resolve({ response: [] }),
        awayLeagueId && currentSeason
          ? getTeamPlayersStats(awayTeamId, awayLeagueId, currentSeason).catch(() => ({ response: [] }))
          : Promise.resolve({ response: [] }),
        // Información básica de equipos
        axios.get(`/api/team-info/${homeTeamId}`).catch(() => ({ data: { response: [] } })),
        axios.get(`/api/team-info/${awayTeamId}`).catch(() => ({ data: { response: [] } }))
      ]);

      // Procesar y estructurar los datos exactamente como esperan los modelos
      return processMatchData({
        h2h: h2hData?.response || [],
        homeStats: homeStats?.response?.[0] || {},
        awayStats: awayStats?.response?.[0] || {},
        homeFixtures: homeFixtures?.response || [],
        awayFixtures: awayFixtures?.response || [],
        homeInjuries: homeInjuries?.response || [],
        awayInjuries: awayInjuries?.response || [],
      homePlayersStats: homePlayersStats?.response || [],
      awayPlayersStats: awayPlayersStats?.response || [],
      homeTeamId,
      awayTeamId: awayTeamId
    });
    } catch (err) {
      console.error("Error obteniendo datos del partido:", err);
      throw err;
    }
  };

  /**
   * Procesar y normalizar los datos para los modelos de predicción
   * Estructura los datos exactamente como esperan los modelos
   */
  const processMatchData = (rawData) => {
    const {
      h2h,
      homeStats,
      awayStats,
      homeFixtures,
      awayFixtures,
      homeInjuries,
      awayInjuries,
      homePlayersStats,
      awayPlayersStats,
      homeTeamId,
      awayTeamId
    } = rawData;

    // Procesar H2H
    const h2hStats = calculateH2HStats(h2h, homeTeamId);

    // Procesar forma reciente (últimos partidos)
    const homeForm = calculateForm(homeFixtures, parseInt(homeTeamId));
    const awayForm = calculateForm(awayFixtures, parseInt(awayTeamId));

    // Combinar forma (promedio de ambos equipos)
    const formData = {
      homeWinRate: (homeForm.homeWinRate + (1 - awayForm.homeWinRate)) / 2,
      awayWinRate: (awayForm.homeWinRate + (1 - homeForm.homeWinRate)) / 2,
      drawRate: (homeForm.drawRate + awayForm.drawRate) / 2,
      homeUnbeaten: homeForm.homeUnbeaten
    };

    // Procesar estadísticas de equipos
    const homeTeamStats = extractTeamStats(homeStats, homeTeamId);
    const awayTeamStats = extractTeamStats(awayStats, awayTeamId);

    // Procesar lesiones
    const injuriesData = processInjuries(homeInjuries, awayInjuries);

    // Obtener top goleadores (del equipo local)
    const topScorers = extractTopScorers(homePlayersStats);
    const teamTotalGoals = topScorers.reduce((sum, p) => sum + p.goals, 0);

    // Estadísticas del fixture (valores por defecto, se pueden mejorar con datos reales)
    const fixtureStats = {
      homeCards: 2,
      awayCards: 2,
      homeCorners: 6,
      awayCorners: 6,
      homeFouls: 12,
      awayFouls: 12
    };

    // Datos del árbitro (valor por defecto)
    const referee = {
      avgCards: 3.5
    };

    return {
      h2h: h2hStats,
      form: formData,
      stats: {
        homeGoalsFor: homeTeamStats.goalsFor,
        awayGoalsFor: awayTeamStats.goalsFor,
        homeBTTS: homeTeamStats.btts,
        awayBTTS: awayTeamStats.btts,
        homeCards: fixtureStats.homeCards,
        awayCards: fixtureStats.awayCards,
        homeCorners: fixtureStats.homeCorners,
        awayCorners: fixtureStats.awayCorners,
        homeFouls: fixtureStats.homeFouls,
        awayFouls: fixtureStats.awayFouls,
        homeEarlyGoals: homeTeamStats.earlyGoals,
        awayEarlyGoals: awayTeamStats.earlyGoals,
        homeScoringRate: homeTeamStats.scoringRate
      },
      injuries: injuriesData,
      topScorers,
      teamTotalGoals,
      homeAdvantage: 0.15, // Ventaja de jugar en casa
      referee
    };
  };

  // Calcular estadísticas H2H
  const calculateH2HStats = (h2hFixtures, homeTeamId) => {
    if (!Array.isArray(h2hFixtures) || h2hFixtures.length === 0) {
      return { homeWinRate: 0.33, awayWinRate: 0.33, drawRate: 0.34 };
    }

    let homeWins = 0;
    let awayWins = 0;
    let draws = 0;
    const homeTeamIdNum = parseInt(homeTeamId);

    h2hFixtures.forEach(fix => {
      const isHome = fix.teams?.home?.id === homeTeamIdNum;
      const homeGoals = fix.goals?.home || 0;
      const awayGoals = fix.goals?.away || 0;

      if (homeGoals > awayGoals) {
        if (isHome) homeWins++;
        else awayWins++;
      } else if (awayGoals > homeGoals) {
        if (isHome) awayWins++;
        else homeWins++;
      } else {
        draws++;
      }
    });

    const total = h2hFixtures.length;
    return {
      homeWinRate: total > 0 ? homeWins / total : 0.33,
      awayWinRate: total > 0 ? awayWins / total : 0.33,
      drawRate: total > 0 ? draws / total : 0.34
    };
  };

  // Calcular forma reciente
  const calculateForm = (fixtures, teamId) => {
    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      return { homeWinRate: 0.33, awayWinRate: 0.33, drawRate: 0.34, homeUnbeaten: 0 };
    }

    let wins = 0;
    let draws = 0;
    let losses = 0;
    const teamIdNum = parseInt(teamId);
    let unbeatenStreak = 0;

    // Calcular desde el más reciente hacia atrás
    for (let i = fixtures.length - 1; i >= 0; i--) {
      const fix = fixtures[i];
      if (!fix.teams || !fix.goals) continue;
      
      const isHome = fix.teams.home?.id === teamIdNum;
      const goalsFor = isHome ? (fix.goals?.home || 0) : (fix.goals?.away || 0);
      const goalsAgainst = isHome ? (fix.goals?.away || 0) : (fix.goals?.home || 0);

      if (goalsFor > goalsAgainst) {
        wins++;
        if (i === fixtures.length - 1 || unbeatenStreak > 0) {
          unbeatenStreak++;
        }
      } else if (goalsFor === goalsAgainst) {
        draws++;
        if (i === fixtures.length - 1 || unbeatenStreak > 0) {
          unbeatenStreak++;
        }
      } else {
        losses++;
        if (i === fixtures.length - 1) {
          unbeatenStreak = 0;
        }
        break;
      }
    }

    const total = fixtures.length;
    return {
      homeWinRate: total > 0 ? wins / total : 0.33,
      awayWinRate: total > 0 ? losses / total : 0.33,
      drawRate: total > 0 ? draws / total : 0.34,
      homeUnbeaten: unbeatenStreak
    };
  };

  // Extraer estadísticas del equipo
  const extractTeamStats = (stats, teamId) => {
    if (!stats || !stats.league) {
      return {
        goalsFor: 1.5,
        goalsAgainst: 1.2,
        btts: 0.5,
        earlyGoals: 0.3,
        scoringRate: 0.6
      };
    }

    const fixtures = stats.fixtures || {};
    const goals = stats.goals || {};
    const played = Math.max(fixtures?.played?.total || 1, 1);

    return {
      goalsFor: (goals?.for?.total || 0) / played,
      goalsAgainst: (goals?.against?.total || 0) / played,
      btts: calculateBTTSRate(stats),
      earlyGoals: 0.3, // Valor por defecto
      scoringRate: (fixtures?.wins?.total || 0) / played
    };
  };

  // Calcular tasa de BTTS
  const calculateBTTSRate = (stats) => {
    if (!stats.goals) return 0.5;
    const avgGoalsFor = (stats.goals.for?.total || 0) / Math.max((stats.fixtures?.played?.total || 1), 1);
    const avgGoalsAgainst = (stats.goals.against?.total || 0) / Math.max((stats.fixtures?.played?.total || 1), 1);
    return Math.min(0.9, (avgGoalsFor + avgGoalsAgainst) / 4);
  };

  // Procesar lesiones
  const processInjuries = (homeInjuries, awayInjuries) => {
    const homeActive = (homeInjuries || []).filter(i => 
      i.fixture?.status?.long !== "Match Finished"
    ).length;
    const awayActive = (awayInjuries || []).filter(i => 
      i.fixture?.status?.long !== "Match Finished"
    ).length;

    return {
      homeDefense: Math.max(0, 1 - (homeActive * 0.1)),
      awayDefense: Math.max(0, 1 - (awayActive * 0.1))
    };
  };

  // Extraer top goleadores
  const extractTopScorers = (playersStats) => {
    if (playersStats && Array.isArray(playersStats)) {
      return playersStats
        .filter(p => p.statistics && p.statistics.length > 0)
        .map(p => ({
          name: p.player?.name || "N/D",
          goals: p.statistics[0]?.goals?.total || 0
        }))
        .sort((a, b) => b.goals - a.goals)
        .slice(0, 5);
    }
    return [];
  };

  // ============================================
  // LOS 9 MODELOS DE PREDICCIÓN (EXACTAMENTE COMO SE ESPECIFICARON)
  // ============================================

  // MODELO 1: Resultado del Partido (1X2)
  const predictMatchResult = (data) => {
    const score = { home: 0, draw: 0, away: 0 };

    score.home += data.form.homeWinRate * 0.4;
    score.away += data.form.awayWinRate * 0.4;

    score.home += data.homeAdvantage * 0.2;

    score.home += data.h2h.homeWinRate * 0.15;
    score.away += data.h2h.awayWinRate * 0.15;

    score.home += data.injuries.awayDefense * 0.1;
    score.away += data.injuries.homeDefense * 0.1;

    const total = score.home + score.draw + score.away;

    return {
      homeWin: score.home / total,
      draw: score.draw / total,
      awayWin: score.away / total
    };
  };

  // MODELO 2: Over / Under
  const predictGoals = (data) => {
    const avgGoals = (data.stats.homeGoalsFor + data.stats.awayGoalsFor) / 2;

    return {
      over15: Math.min(1, avgGoals / 1.5),
      over25: Math.min(1, avgGoals / 2.5),
      under25: 1 - Math.min(1, avgGoals / 2.5)
    };
  };

  // MODELO 3: BTTS
  const predictBTTS = (data) => {
    const yes = (data.stats.homeBTTS + data.stats.awayBTTS) / 2;
    return { yes, no: 1 - yes };
  };

  // MODELO 4: Marcador Probable
  const predictScoreline = (data) => {
    const homeGoals = Math.round(data.stats.homeGoalsFor * 1.1);
    const awayGoals = Math.round(data.stats.awayGoalsFor * 0.9);
    return `${homeGoals}-${awayGoals}`;
  };

  // MODELO 5: Primer Equipo en Anotar
  const predictFirstGoal = (data) => {
    const prob = data.stats.homeEarlyGoals / (data.stats.homeEarlyGoals + data.stats.awayEarlyGoals);
    return {
      firstTeam: prob > 0.5 ? "Local" : "Visitante",
      probability: prob
    };
  };

  // MODELO 6: Jugador con Probabilidad de Gol
  const predictScorer = (data) => {
    if (!data.topScorers || data.topScorers.length === 0) {
      return { player: "N/D", probability: 0 };
    }
    const best = data.topScorers.sort((a, b) => b.goals - a.goals)[0];
    return {
      player: best.name,
      probability: data.teamTotalGoals > 0 ? best.goals / data.teamTotalGoals : 0
    };
  };

  // MODELO 7: Tarjetas
  const predictCards = (data) => {
    const avg = (data.stats.homeCards + data.stats.awayCards + data.referee.avgCards) / 3;
    return {
      over35: avg / 4,
      mostCards: data.stats.homeFouls > data.stats.awayFouls ? "Local" : "Visitante"
    };
  };

  // MODELO 8: Corners
  const predictCorners = (data) => {
    const avg = (data.stats.homeCorners + data.stats.awayCorners) / 2;
    return {
      over85: avg / 8.5,
      mostCorners: data.stats.homeCorners > data.stats.awayCorners ? "Local" : "Visitante"
    };
  };

  // MODELO 9: Rachas y Tendencias
  const detectTrends = (data) => {
    const trends = [];

    if (data.form.homeUnbeaten >= 5)
      trends.push(`El local lleva ${data.form.homeUnbeaten} partidos sin perder`);

    if (data.stats.homeScoringRate >= 0.7)
      trends.push(`Marca en el ${data.stats.homeScoringRate * 100}% de partidos como local`);

    return trends;
  };

  // Función principal para generar predicciones
  const handleGeneratePredictions = async () => {
    if (!homeTeamId || !awayTeamId) {
      setError("Por favor, selecciona ambos equipos primero");
      return;
    }

    setLoading(true);
    setError(null);
    setPredictions(null);

    try {
      const data = await getMatchData();

      const predictionsResult = {
        result: predictMatchResult(data),
        goals: predictGoals(data),
        btts: predictBTTS(data),
        scoreline: predictScoreline(data),
        firstGoal: predictFirstGoal(data),
        scorer: predictScorer(data),
        cards: predictCards(data),
        corners: predictCorners(data),
        trends: detectTrends(data),
        disclaimer: "Predicción basada en datos estadísticos. La decisión final es del usuario."
      };

      setPredictions(predictionsResult);
    } catch (err) {
      console.error("Error generando predicciones:", err);
      setError("Error al generar las predicciones. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // Si no hay equipos seleccionados, no mostrar nada
  if (!homeTeamId || !awayTeamId) {
    return null;
  }

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

  const predictionCardStyle = {
    padding: "12px",
    backgroundColor: "#f8fafc",
    borderRadius: "8px",
    marginBottom: "10px",
    border: "1px solid #e2e8f0"
  };

  return (
    <div style={cardStyle}>
      <div style={titleStyle}>
        <GoalLogicTitle as="h2" size="md" />
      </div>
      
      {/* Botón para generar predicciones */}
      <button
        id="btnPredicciones"
        onClick={handleGeneratePredictions}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 20px",
          backgroundColor: loading ? "#cbd5e1" : "#F28A00",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          marginBottom: "16px",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = "#D47900";
            e.target.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.target.style.backgroundColor = "#F28A00";
            e.target.style.transform = "translateY(0)";
          }
        }}
      >
        {loading ? "Generando predicciones..." : "Generar Predicciones"}
      </button>

      {/* Mensaje de error */}
      {error && (
        <div style={{
          padding: "12px",
          backgroundColor: "#fee2e2",
          color: "#dc2626",
          borderRadius: "8px",
          marginBottom: "16px",
          fontSize: "13px"
        }}>
          {error}
        </div>
      )}

      {/* Predicciones generadas */}
      {predictions && (
        <div>
          {/* 1. Resultado del Partido (1X2) */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              1️⃣ Resultado del Partido (1X2)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Local</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.result.homeWin * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Empate</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.result.draw * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Visitante</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.result.awayWin * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 2. Over / Under */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              2️⃣ Over / Under
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Over 1.5</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.goals.over15 * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p className={ADVANCED_METRIC_LABEL_CLASS} style={getAdvancedMetricLabelStyle({ margin: "0 0 4px 0" })}>{ML.over25}</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.goals.over25 * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Under 2.5</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.goals.under25 * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 3. BTTS */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              3️⃣ Ambos Equipos Marcan (BTTS)
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Sí</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.btts.yes * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>No</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.btts.no * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* 4. Marcador Probable */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              4️⃣ Marcador Probable
            </h3>
            <p style={{ fontSize: "24px", fontWeight: "700", color: "#F28A00", margin: "0" }}>
              {predictions.scoreline}
            </p>
          </div>

          {/* 5. Primer Equipo en Anotar */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              5️⃣ Primer Equipo en Anotar
            </h3>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
              {predictions.firstGoal.firstTeam}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0" }}>
              Probabilidad: {(predictions.firstGoal.probability * 100).toFixed(1)}%
            </p>
          </div>

          {/* 6. Jugador con Probabilidad de Gol */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              6️⃣ Jugador con Probabilidad de Gol
            </h3>
            <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0 0 4px 0" }}>
              {predictions.scorer.player}
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", margin: "0" }}>
              Probabilidad: {(predictions.scorer.probability * 100).toFixed(1)}%
            </p>
          </div>

          {/* 7. Tarjetas */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              7️⃣ Tarjetas
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Over 3.5</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.cards.over35 * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Más Tarjetas</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {predictions.cards.mostCards}
                </p>
              </div>
            </div>
          </div>

          {/* 8. Corners */}
          <div style={predictionCardStyle}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
              8️⃣ Corners
            </h3>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Over 8.5</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {(predictions.corners.over85 * 100).toFixed(1)}%
                </p>
              </div>
              <div style={{ flex: "1", minWidth: "100px" }}>
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 4px 0" }}>Más Corners</p>
                <p style={{ fontSize: "16px", fontWeight: "600", color: "#1a1a1a", margin: "0" }}>
                  {predictions.corners.mostCorners}
                </p>
              </div>
            </div>
          </div>

          {/* 9. Rachas y Tendencias */}
          {predictions.trends && predictions.trends.length > 0 && (
            <div style={predictionCardStyle}>
              <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "8px", color: "#1a1a1a" }}>
                9️⃣ Rachas y Tendencias
              </h3>
              <ul style={{ margin: "0", paddingLeft: "20px" }}>
                {predictions.trends.map((trend, idx) => (
                  <li key={idx} style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                    {trend}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aviso legal */}
          <div style={{
            marginTop: "16px",
            padding: "12px",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            border: "1px solid #fbbf24"
          }}>
            <p style={{ 
              margin: "0", 
              fontSize: "12px", 
              color: "#92400e",
              fontStyle: "italic",
              textAlign: "center"
            }}>
              ⚠️ {predictions.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
