import { useState, useEffect } from "react";
import axios from "axios";
import TeamCard from "../components/TeamCard";
import PredictionsPanel from "../components/PredictionsPanel";
import TeamComparison from "../components/TeamComparison";
import StatisticalPredictions from "../components/StatisticalPredictions";
import HeadToHead from "../components/HeadToHead";

const LIGAS_POPULARES = [
  { id: 39, nombre: "Premier League" },
  { id: 140, nombre: "La Liga" },
  { id: 135, nombre: "Serie A" },
  { id: 78, nombre: "Bundesliga" },
  { id: 61, nombre: "Ligue 1" }
];

export default function MatchAnalysis() {
  const [liga, setLiga] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [season, setSeason] = useState("2024");
  const [local, setLocal] = useState("");
  const [visitante, setVisitante] = useState("");
  const [localId, setLocalId] = useState("");
  const [visitanteId, setVisitanteId] = useState("");
  const [localTeamInfo, setLocalTeamInfo] = useState(null);
  const [visitanteTeamInfo, setVisitanteTeamInfo] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState("analysis");
  const [showSearch, setShowSearch] = useState({ local: false, visitante: false });

  // Buscar equipos cuando se escribe en los inputs
  useEffect(() => {
    const searchTeams = async (query, type) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await axios.get(`/api/search?q=${encodeURIComponent(query)}&type=teams`);
        if (res.data.response) {
          setSearchResults(res.data.response.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (showSearch.local && local) {
      searchTeams(local, "local");
    } else if (showSearch.visitante && visitante) {
      searchTeams(visitante, "visitante");
    } else {
      setSearchResults([]);
    }
  }, [local, visitante, showSearch]);

  const handleTeamSelect = (team, type) => {
    if (type === "local") {
      setLocal(team.name);
      setLocalId(team.id);
      setLocalTeamInfo(team);
      setShowSearch({ ...showSearch, local: false });
    } else {
      setVisitante(team.name);
      setVisitanteId(team.id);
      setVisitanteTeamInfo(team);
      setShowSearch({ ...showSearch, visitante: false });
    }
    setSearchResults([]);
  };

  const handleAnalyze = async () => {
    if (!liga || !local || !visitante || !leagueId || !localId || !visitanteId) {
      alert("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(
        `/api/analizar?liga=${liga}&local=${encodeURIComponent(local)}&visitante=${encodeURIComponent(visitante)}`
      );
      setData(res.data);
      setActiveTab("analysis");
    } catch (err) {
      console.error(err);
      alert("Error al analizar el partido");
    } finally {
      setLoading(false);
    }
  };

  const containerStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "20px"
  };

  const inputStyle = {
    padding: "10px 15px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "100%",
    marginBottom: "10px"
  };

  const buttonStyle = {
    padding: "12px 24px",
    backgroundColor: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px"
  };

  const tabButtonStyle = (isActive) => ({
    padding: "12px 24px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    backgroundColor: isActive ? "#007bff" : "#e0e0e0",
    color: isActive ? "#fff" : "#333",
    fontWeight: isActive ? "bold" : "normal",
    marginRight: "10px",
    marginBottom: "10px"
  });

  const cardStyle = {
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    marginBottom: "20px"
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "30px" }}>Análisis de Partido</h1>

      {/* Formulario de Selección */}
      <div style={cardStyle}>
        <h2 style={{ marginBottom: "20px" }}>Selecciona los Equipos</h2>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Liga:</label>
          <select
            value={leagueId}
            onChange={(e) => {
              const selected = LIGAS_POPULARES.find(l => l.id.toString() === e.target.value);
              setLeagueId(e.target.value);
              setLiga(selected ? selected.nombre : "");
            }}
            style={inputStyle}
          >
            <option value="">Selecciona una liga</option>
            {LIGAS_POPULARES.map((liga) => (
              <option key={liga.id} value={liga.id}>
                {liga.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Equipo Local:</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Buscar equipo..."
                value={local}
                onChange={(e) => {
                  setLocal(e.target.value);
                  setShowSearch({ ...showSearch, local: true });
                }}
                onFocus={() => setShowSearch({ ...showSearch, local: true })}
                style={inputStyle}
              />
              {showSearch.local && searchResults.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 1000
                }}>
                  {searchResults.map((team) => (
                    <div
                      key={team.team.id}
                      onClick={() => handleTeamSelect(team.team, "local")}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                    >
                      {team.team.logo && (
                        <img src={team.team.logo} alt={team.team.name} style={{ width: "30px", height: "30px" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: "bold" }}>{team.team.name}</div>
                        {team.team.country && (
                          <div style={{ fontSize: "12px", color: "#666" }}>{team.team.country}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {localTeamInfo && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "5px" }}>
                <strong>Seleccionado:</strong> {localTeamInfo.name}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Equipo Visitante:</label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Buscar equipo..."
                value={visitante}
                onChange={(e) => {
                  setVisitante(e.target.value);
                  setShowSearch({ ...showSearch, visitante: true });
                }}
                onFocus={() => setShowSearch({ ...showSearch, visitante: true })}
                style={inputStyle}
              />
              {showSearch.visitante && searchResults.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "5px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  zIndex: 1000
                }}>
                  {searchResults.map((team) => (
                    <div
                      key={team.team.id}
                      onClick={() => handleTeamSelect(team.team, "visitante")}
                      style={{
                        padding: "10px",
                        cursor: "pointer",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f0f0f0"}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#fff"}
                    >
                      {team.team.logo && (
                        <img src={team.team.logo} alt={team.team.name} style={{ width: "30px", height: "30px" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: "bold" }}>{team.team.name}</div>
                        {team.team.country && (
                          <div style={{ fontSize: "12px", color: "#666" }}>{team.team.country}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {visitanteTeamInfo && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#f8f9fa", borderRadius: "5px" }}>
                <strong>Seleccionado:</strong> {visitanteTeamInfo.name}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: "15px" }}>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Temporada:</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            style={{ ...inputStyle, width: "200px" }}
          >
            <option value="2024">2024</option>
            <option value="2023">2023</option>
            <option value="2022">2022</option>
            <option value="2021">2021</option>
          </select>
        </div>

        <button onClick={handleAnalyze} disabled={loading} style={buttonStyle}>
          {loading ? "Analizando..." : "Analizar Partido"}
        </button>
      </div>

      {/* Tabs de Análisis */}
      {data && localId && visitanteId && (
        <>
          <div style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap" }}>
            <button onClick={() => setActiveTab("analysis")} style={tabButtonStyle(activeTab === "analysis")}>
              📊 Análisis Básico
            </button>
            <button onClick={() => setActiveTab("predictions")} style={tabButtonStyle(activeTab === "predictions")}>
              🔮 Predicciones Estadísticas
            </button>
            <button onClick={() => setActiveTab("comparison")} style={tabButtonStyle(activeTab === "comparison")}>
              ⚔️ Comparación Detallada
            </button>
            <button onClick={() => setActiveTab("h2h")} style={tabButtonStyle(activeTab === "h2h")}>
              📜 Historial H2H
            </button>
          </div>

          {activeTab === "analysis" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <TeamCard team={data.localTeam} title="Equipo Local" />
                <TeamCard team={data.awayTeam} title="Equipo Visitante" />
              </div>
              <PredictionsPanel predictions={data.predictions} />
            </div>
          )}

          {activeTab === "predictions" && (
            <div style={cardStyle}>
              <StatisticalPredictions 
                team1Id={localId} 
                team2Id={visitanteId} 
                leagueId={leagueId} 
                season={season} 
              />
            </div>
          )}

          {activeTab === "comparison" && (
            <div style={cardStyle}>
              <TeamComparison 
                team1Id={localId} 
                team2Id={visitanteId} 
                leagueId={leagueId} 
                season={season} 
              />
            </div>
          )}

          {activeTab === "h2h" && (
            <div style={cardStyle}>
              <HeadToHead team1Id={localId} team2Id={visitanteId} />
            </div>
          )}
        </>
      )}

      {/* Sección Educativa */}
      <div style={{ ...cardStyle, backgroundColor: "#e7f3ff", marginTop: "30px" }}>
        <h2>Guía de Análisis Estadístico</h2>
        <div style={{ display: "grid", gap: "15px" }}>
          <div>
            <h3>xG (Expected Goals - Goles Esperados)</h3>
            <p style={{ color: "#666" }}>
              Los xG miden la calidad de las oportunidades de gol. Un xG de 1.5 significa que el equipo debería haber marcado 1.5 goles 
              en promedio basándose en la calidad de sus tiros. Si un equipo marca más goles que su xG, indica eficiencia alta.
            </p>
          </div>
          <div>
            <h3>Posesión</h3>
            <p style={{ color: "#666" }}>
              La posesión indica qué porcentaje del tiempo un equipo controla el balón durante el partido. 
              Mayor posesión no siempre significa mayor efectividad, pero puede indicar control del juego.
            </p>
          </div>
          <div>
            <h3>Tiros al Arco</h3>
            <p style={{ color: "#666" }}>
              Los tiros al arco son más valiosos que los tiros fuera. Un equipo que convierte muchos tiros al arco 
              generalmente tiene mejor precisión y genera más oportunidades de gol.
            </p>
          </div>
          <div>
            <h3>Interpretación de Probabilidades</h3>
            <p style={{ color: "#666" }}>
              Las probabilidades estadísticas se calculan basándose en datos históricos y tendencias recientes. 
              Son indicadores útiles pero no garantías. Siempre analiza múltiples factores antes de tomar decisiones basadas en estadísticas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
