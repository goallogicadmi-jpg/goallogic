import { useEffect, useState } from "react";
import axios from "axios";

export default function EstadisticasAvanzadas({ leagueId, season }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!leagueId || !season) return;

    setLoading(true);
    setError(null);

    axios.get(`/estadisticas/avanzadas?leagueId=${leagueId}&season=${season}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error al cargar estadísticas avanzadas");
        setLoading(false);
      });
  }, [leagueId, season]);

  if (loading) return <p>Cargando estadísticas avanzadas... (esto puede tardar unos segundos)</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;
  if (!data) return null;

  const equipos = data.equipos || [];

  const thStyle = {
    padding: "12px 8px",
    textAlign: "center",
    borderBottom: "2px solid #dee2e6",
    backgroundColor: "#343a40",
    color: "#fff",
    fontSize: "12px"
  };

  const tdStyle = {
    padding: "10px 8px",
    textAlign: "center",
    borderBottom: "1px solid #dee2e6"
  };

  return (
    <div>
      <h2>Estadísticas Avanzadas</h2>
      <p style={{ color: "#666", marginBottom: "20px" }}>
        Temporada {data.temporada} - Datos basados en tiros, goles y pases
      </p>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "left" }}>Equipo</th>
              <th style={thStyle}>Goles</th>
              <th style={thStyle}>Tiros</th>
              <th style={thStyle}>Al Arco</th>
              <th style={thStyle}>Pases Clave</th>
              <th style={thStyle}>xG</th>
              <th style={thStyle}>xA</th>
              <th style={thStyle}>Eficiencia</th>
              <th style={thStyle}>Posesión</th>
              <th style={thStyle}>🟨</th>
              <th style={thStyle}>🟥</th>
              <th style={thStyle}>Penales ✓</th>
              <th style={thStyle}>Penales ✗</th>
            </tr>
          </thead>
          <tbody>
            {equipos.map((e, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#fff" : "#f8f9fa" }}>
                <td style={{ ...tdStyle, textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {e.logo && (
                      <img src={e.logo} alt={e.equipo} style={{ width: "25px", marginRight: "10px" }} />
                    )}
                    {e.equipo}
                  </div>
                </td>
                <td style={{ ...tdStyle, fontWeight: "bold" }}>{e.goles}</td>
                <td style={tdStyle}>{e.tiros}</td>
                <td style={tdStyle}>{e.tirosAlArco}</td>
                <td style={tdStyle}>{e.pasesClave}</td>
                <td style={{ ...tdStyle, color: "#3498db", fontWeight: "bold" }}>{e.xG}</td>
                <td style={{ ...tdStyle, color: "#9b59b6", fontWeight: "bold" }}>{e.xA}</td>
                <td style={{ 
                  ...tdStyle, 
                  fontWeight: "bold",
                  color: e.eficiencia >= 1 ? "#27ae60" : "#e74c3c"
                }}>
                  {e.eficiencia}
                </td>
                <td style={tdStyle}>{e.posesion}%</td>
                <td style={{ ...tdStyle, color: "#f1c40f" }}>{e.tarjetasAmarillas}</td>
                <td style={{ ...tdStyle, color: "#e74c3c" }}>{e.tarjetasRojas}</td>
                <td style={{ ...tdStyle, color: "#27ae60" }}>{e.penaltisAnotados}</td>
                <td style={{ ...tdStyle, color: "#e74c3c" }}>{e.penaltisFallados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
        <h4 style={{ marginTop: 0 }}>Leyenda</h4>
        <ul style={{ margin: 0, paddingLeft: "20px", color: "#666" }}>
          <li><strong>xG (Expected Goals):</strong> Goles esperados basados en la calidad de los tiros</li>
          <li><strong>xA (Expected Assists):</strong> Asistencias esperadas basadas en pases clave</li>
          <li><strong>Eficiencia:</strong> Goles reales / xG (mayor a 1 = mejor de lo esperado)</li>
        </ul>
      </div>
    </div>
  );
}
