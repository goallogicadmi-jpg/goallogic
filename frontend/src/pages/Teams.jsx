import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { obtenerEquiposPorLiga } from "../api/api";

export default function Teams() {
  const { liga } = useParams();
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      if (liga) {
        setLoading(true);
        try {
          const data = await obtenerEquiposPorLiga(liga);
          if (Array.isArray(data)) {
            setEquipos(data);
          } else {
            setError("No se pudieron obtener los equipos");
          }
        } catch (err) {
          console.error("Error obteniendo equipos:", err);
          setError("Error al cargar los equipos");
        } finally {
          setLoading(false);
        }
      }
    }
    load();
  }, [liga]);

  const handleTeamSelect = (equipo) => {
    navigate(`/ligas/${liga}/teams/${equipo}`);
  };

  const containerStyle = {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "20px"
  };

  const cardStyle = {
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    backgroundColor: "#fff",
    marginBottom: "20px"
  };

  const teamItemStyle = {
    padding: "15px",
    marginBottom: "10px",
    border: "1px solid #e0e0e0",
    borderRadius: "5px",
    backgroundColor: "#f8f9fa",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    transition: "background-color 0.2s"
  };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "30px" }}>Equipos de la Liga: {liga}</h1>

      {loading && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#666", fontSize: "16px" }}>Cargando equipos...</p>
        </div>
      )}

      {!loading && error && (
        <div style={{ ...cardStyle, backgroundColor: "#fff3cd", borderColor: "#ffc107", textAlign: "center" }}>
          <p style={{ color: "#cc0000", fontSize: "16px", margin: 0 }}>{error}</p>
        </div>
      )}

      {!loading && !error && equipos.length === 0 && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <p style={{ color: "#666", fontSize: "16px" }}>No hay equipos disponibles para esta liga</p>
        </div>
      )}

      {!loading && !error && equipos.length > 0 && (
        <div style={cardStyle}>
          <h2 style={{ marginBottom: "20px" }}>Lista de Equipos</h2>
          <div>
            {equipos.map((equipo, index) => (
              <div
                key={index}
                onClick={() => handleTeamSelect(equipo)}
                style={teamItemStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e9ecef";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8f9fa";
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: "500" }}>{equipo}</span>
                <button
                  style={{
                    padding: "8px 16px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "14px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTeamSelect(equipo);
                  }}
                >
                  Ver detalles
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
