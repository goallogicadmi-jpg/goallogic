import { useEffect, useState } from "react";
import axios from "axios";

export default function EstadisticasEquipo({ equipoId, leagueId, season }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!equipoId || !leagueId || !season) return;

    setLoading(true);
    setError(null);

    axios.get(`/estadisticas/equipo/${equipoId}?leagueId=${leagueId}&season=${season}`)
      .then(res => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error al cargar estadísticas del equipo");
        setLoading(false);
      });
  }, [equipoId, leagueId, season]);

  if (loading) return <p>Cargando estadísticas...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!stats) return null;

  const cardStyle = {
    display: "inline-block",
    padding: "15px 25px",
    margin: "5px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    textAlign: "center"
  };

  const valorStyle = {
    fontSize: "24px",
    fontWeight: "bold",
    color: "#333"
  };

  const labelStyle = {
    fontSize: "12px",
    color: "#666",
    marginTop: "5px"
  };

  return (
    <div style={{ marginTop: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
        {stats.logo && (
          <img src={stats.logo} alt={stats.equipo} style={{ width: "60px", marginRight: "15px" }} />
        )}
        <h2 style={{ margin: 0 }}>Estadísticas de {stats.equipo}</h2>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{ marginBottom: "20px" }}>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.partidosJugados}</div>
          <div style={labelStyle}>Partidos</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.victorias}</div>
          <div style={labelStyle}>Victorias</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.empates}</div>
          <div style={labelStyle}>Empates</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.derrotas}</div>
          <div style={labelStyle}>Derrotas</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.golesFavor}</div>
          <div style={labelStyle}>Goles a favor</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.golesContra}</div>
          <div style={labelStyle}>Goles en contra</div>
        </div>
        <div style={cardStyle}>
          <div style={valorStyle}>{stats.posesionPromedio}%</div>
          <div style={labelStyle}>Posesión</div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...valorStyle, color: "#f1c40f" }}>{stats.tarjetasAmarillas}</div>
          <div style={labelStyle}>Amarillas</div>
        </div>
        <div style={cardStyle}>
          <div style={{ ...valorStyle, color: "#e74c3c" }}>{stats.tarjetasRojas}</div>
          <div style={labelStyle}>Rojas</div>
        </div>
      </div>

      {/* Tendencias */}
      <h3>Tendencias (últimos 6 partidos)</h3>
      {stats.tendencias && stats.tendencias.length > 0 ? (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8f9fa" }}>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Fecha</th>
              <th style={{ padding: "10px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Rival</th>
              <th style={{ padding: "10px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>Resultado</th>
              <th style={{ padding: "10px", textAlign: "center", borderBottom: "2px solid #dee2e6" }}>Marcador</th>
            </tr>
          </thead>
          <tbody>
            {stats.tendencias.map((t, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #dee2e6" }}>
                <td style={{ padding: "10px" }}>{t.fecha}</td>
                <td style={{ padding: "10px" }}>{t.rival}</td>
                <td style={{ 
                  padding: "10px", 
                  textAlign: "center",
                  color: t.resultado === "Victoria" ? "#27ae60" : t.resultado === "Derrota" ? "#e74c3c" : "#f39c12",
                  fontWeight: "bold"
                }}>
                  {t.resultado}
                </td>
                <td style={{ padding: "10px", textAlign: "center" }}>
                  {t.golesFavor} - {t.golesContra}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay datos de partidos recientes</p>
      )}
    </div>
  );
}
