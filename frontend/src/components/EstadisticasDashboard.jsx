import { useState } from "react";
import { GoalLogicSectionHeader } from "./GoalLogicTitle";
import EstadisticasEquipo from "./EstadisticasEquipo";
import EstadisticasTorneo from "./EstadisticasTorneo";
import EstadisticasAvanzadas from "./EstadisticasAvanzadas";

const LIGAS = [
  { id: 39, nombre: "Premier League" },
  { id: 140, nombre: "La Liga" },
  { id: 135, nombre: "Serie A" },
  { id: 78, nombre: "Bundesliga" },
  { id: 61, nombre: "Ligue 1" },
  { id: 2, nombre: "Champions League" },
  { id: 3, nombre: "Europa League" }
];

export default function EstadisticasDashboard() {
  const [vista, setVista] = useState("torneo");
  const [equipoId, setEquipoId] = useState("");
  const [leagueId, setLeagueId] = useState("39");
  const [season, setSeason] = useState("2024");

  const buttonStyle = (active) => ({
    padding: "10px 20px",
    marginRight: "10px",
    marginBottom: "10px",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    backgroundColor: active ? "#007bff" : "#e0e0e0",
    color: active ? "#fff" : "#333",
    fontWeight: active ? "bold" : "normal"
  });

  const selectStyle = {
    padding: "8px 12px",
    marginRight: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px"
  };

  const inputStyle = {
    padding: "8px 12px",
    marginRight: "10px",
    borderRadius: "5px",
    border: "1px solid #ccc",
    fontSize: "14px",
    width: "150px"
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1400px", margin: "0 auto" }}>
      <GoalLogicSectionHeader size="lg" />

      <h2 style={{ marginBottom: "20px", fontSize: "1.25rem", color: "#e8eaed" }}>Dashboard de Estadísticas</h2>

      {/* Selector de liga y temporada */}
      <div style={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
        <label style={{ marginRight: "10px", fontWeight: "bold" }}>Liga:</label>
        <select 
          value={leagueId} 
          onChange={(e) => setLeagueId(e.target.value)}
          style={selectStyle}
        >
          {LIGAS.map((liga) => (
            <option key={liga.id} value={liga.id}>{liga.nombre}</option>
          ))}
        </select>

        <label style={{ marginRight: "10px", fontWeight: "bold" }}>Temporada:</label>
        <select 
          value={season} 
          onChange={(e) => setSeason(e.target.value)}
          style={selectStyle}
        >
          <option value="2024">2024</option>
          <option value="2023">2023</option>
          <option value="2022">2022</option>
          <option value="2021">2021</option>
        </select>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => setVista("equipo")}
          style={buttonStyle(vista === "equipo")}
        >
          Estadísticas por Equipo
        </button>
        <button
          onClick={() => setVista("torneo")}
          style={buttonStyle(vista === "torneo")}
        >
          Estadísticas del Torneo
        </button>
        <button
          onClick={() => setVista("avanzadas")}
          style={buttonStyle(vista === "avanzadas")}
        >
          Estadísticas Avanzadas
        </button>
      </div>

      {/* Vista de estadísticas por equipo */}
      {vista === "equipo" && (
        <div style={{ padding: "15px", backgroundColor: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
          <h3>Buscar equipo por ID</h3>
          <p style={{ color: "#666", fontSize: "14px", marginBottom: "10px" }}>
            Ingresa el ID del equipo (ej: 33 para Manchester United, 50 para Manchester City)
          </p>
          <input
            type="text"
            placeholder="ID del equipo"
            value={equipoId}
            onChange={(e) => setEquipoId(e.target.value)}
            style={inputStyle}
          />

          {equipoId && (
            <EstadisticasEquipo 
              equipoId={equipoId} 
              leagueId={leagueId} 
              season={season} 
            />
          )}
        </div>
      )}

      {/* Vista de estadísticas del torneo */}
      {vista === "torneo" && (
        <EstadisticasTorneo leagueId={leagueId} season={season} />
      )}

      {/* Vista de estadísticas avanzadas */}
      {vista === "avanzadas" && (
        <EstadisticasAvanzadas leagueId={leagueId} season={season} />
      )}
    </div>
  );
}
