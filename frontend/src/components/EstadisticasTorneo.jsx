import { useEffect, useState } from "react";
import axios from "axios";

export default function EstadisticasTorneo({ leagueId, season }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState(null);

  useEffect(() => {
    if (!leagueId || !season) return;

    setLoading(true);
    setError(null);

    axios.get(`/estadisticas/torneo?leagueId=${leagueId}&season=${season}`)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError("Error al cargar estadísticas del torneo");
        setLoading(false);
      });
  }, [leagueId, season]);

  // Estilos según el tema oscuro con azul claro
  const containerStyle = {
    backgroundColor: "#0D0D0D",
    padding: "20px",
    borderRadius: "8px",
    minHeight: "100px"
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "20px",
    padding: "15px",
    backgroundColor: "#1A1A1A",
    borderRadius: "8px",
    border: "1px solid rgba(79, 195, 247, 0.2)"
  };

  const titleStyle = {
    margin: 0,
    color: "#FFFFFF",
    fontSize: "1.5rem",
    fontWeight: "600"
  };

  const subtitleStyle = {
    margin: "5px 0 0 0",
    color: "#B0BEC5",
    fontSize: "0.9rem"
  };

  const seasonBadgeStyle = {
    display: "inline-block",
    padding: "6px 12px",
    backgroundColor: "#4FC3F7",
    color: "#0A0A0A",
    borderRadius: "6px",
    fontSize: "0.85rem",
    fontWeight: "600",
    marginLeft: "10px"
  };

  const loadingStyle = {
    color: "#B0BEC5",
    textAlign: "center",
    padding: "40px 20px"
  };

  const errorStyle = {
    color: "#e74c3c",
    textAlign: "center",
    padding: "20px",
    backgroundColor: "#1A1A1A",
    borderRadius: "8px",
    border: "1px solid rgba(231, 76, 60, 0.3)"
  };

  const tableContainerStyle = {
    overflowX: "auto",
    backgroundColor: "#121212",
    borderRadius: "8px",
    border: "1px solid rgba(79, 195, 247, 0.1)"
  };

  const thStyle = {
    padding: "12px 8px",
    textAlign: "center",
    borderBottom: "1px solid #2A2A2A",
    backgroundColor: "rgba(79, 195, 247, 0.2)",
    color: "#4FC3F7",
    fontSize: "12px",
    fontWeight: "600"
  };

  const tdStyle = {
    padding: "10px 8px",
    textAlign: "center",
    borderBottom: "1px solid #2A2A2A",
    color: "#FFFFFF"
  };

  const trHoverStyle = {
    backgroundColor: "rgba(79, 195, 247, 0.1)",
    transition: "background-color 0.2s ease"
  };

  const getFormaColor = (letra) => {
    if (letra === "W") return "#27ae60";
    if (letra === "L") return "#e74c3c";
    return "#f39c12";
  };

  if (loading) return <div style={loadingStyle}>Cargando estadísticas del torneo...</div>;
  if (error) return <div style={errorStyle}>{error}</div>;
  if (!data) return null;

  const tabla = data.tabla || [];

  const toggleAccordion = (item) => {
    setActiveAccordion(activeAccordion === item ? null : item);
  };

  const accordionItems = [
    { id: "partidos", title: "PARTIDOS", content: "Contenido de partidos aquí..." },
    { id: "estadisticas", title: "ESTADÍSTICAS", content: "Contenido de estadísticas aquí..." },
    { id: "jugadores", title: "JUGADORES", content: "Contenido de jugadores aquí..." }
  ];

  const accordionButtonStyle = (isActive) => ({
    width: "100%",
    padding: "15px 20px",
    backgroundColor: isActive ? "rgba(79, 195, 247, 0.15)" : "#1A1A1A",
    border: "1px solid #4FC3F7",
    borderBottom: isActive ? "none" : "1px solid #4FC3F7",
    color: isActive ? "#4FC3F7" : "#FFFFFF",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.3s ease",
    borderRadius: isActive ? "8px 8px 0 0" : "8px",
    marginBottom: isActive ? "0" : "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  });

  const accordionContentStyle = {
    padding: "15px 20px",
    backgroundColor: "#1A1A1A",
    border: "1px solid #4FC3F7",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    color: "#B0BEC5",
    marginBottom: "10px"
  };

  const mainTitleStyle = {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: "32px",
    fontWeight: "600",
    marginBottom: "10px",
    textShadow: "0 0 10px rgba(79, 195, 247, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)"
  };

  const subtitleCenteredStyle = {
    textAlign: "center",
    color: "#B0BEC5",
    fontSize: "16px",
    marginBottom: "30px"
  };

  const layoutContainerStyle = {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start"
  };

  const tableWrapperStyle = {
    flex: "1",
    minWidth: 0
  };

  const accordionWrapperStyle = {
    width: "300px",
    flexShrink: 0
  };

  return (
    <div style={containerStyle}>
      {/* Header Premium de Competición */}
      <div className="competition-header" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        marginBottom: '30px'
      }}>
        {data.logo && (
          <img 
            src={data.logo} 
            alt={data.liga} 
            className="competition-logo"
            style={{
              width: '38px',
              height: '38px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))'
            }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <h1 className="competition-title" style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: 'var(--text-primary)',
          letterSpacing: '0.4px',
          margin: 0
        }}>
          {data.liga}
        </h1>
      </div>
      <p style={subtitleCenteredStyle}>
        Temporada <span style={seasonBadgeStyle}>{data.temporada}</span>
      </p>

      {/* Layout de dos columnas: Tabla + Acordeón */}
      <div style={layoutContainerStyle}>
        {/* Tabla a la izquierda */}
        <div style={tableWrapperStyle}>
          <div style={tableContainerStyle} className="table-responsive">
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: "center", width: "40px" }}>#</th>
                  <th style={{ ...thStyle, textAlign: "left" }}>Equipo</th>
                  <th style={thStyle}>Pts</th>
                  <th style={thStyle}>PJ</th>
                  <th style={thStyle}>G</th>
                  <th style={thStyle}>E</th>
                  <th style={thStyle}>P</th>
                  <th style={thStyle}>GF</th>
                  <th style={thStyle}>GC</th>
                  <th style={thStyle}>DG</th>
                  <th style={thStyle}>Rend%</th>
                  <th style={{ ...thStyle, width: "100px" }}>Forma</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map((e, i) => (
                  <tr 
                    key={i} 
                    style={{ 
                      backgroundColor: i % 2 === 0 ? "#121212" : "#1A1A1A",
                      ...tdStyle
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "rgba(79, 195, 247, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = i % 2 === 0 ? "#121212" : "#1A1A1A";
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: "bold", color: "#4FC3F7" }}>{e.posicion}</td>
                    <td style={{ ...tdStyle, textAlign: "left" }}>
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {e.logo && (
                          <img src={e.logo} alt={e.equipo} style={{ width: "25px", marginRight: "10px" }} />
                        )}
                        <span style={{ color: "#FFFFFF" }}>{e.equipo}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: "bold", color: "#4FC3F7" }}>{e.puntos}</td>
                    <td style={tdStyle}>{e.jugados}</td>
                    <td style={tdStyle}>{e.ganados}</td>
                    <td style={tdStyle}>{e.empatados}</td>
                    <td style={tdStyle}>{e.perdidos}</td>
                    <td style={tdStyle}>{e.golesFavor}</td>
                    <td style={tdStyle}>{e.golesContra}</td>
                    <td style={{ 
                      ...tdStyle, 
                      color: e.diferencia > 0 ? "#27ae60" : e.diferencia < 0 ? "#e74c3c" : "#B0BEC5",
                      fontWeight: "600"
                    }}>
                      {e.diferencia > 0 ? "+" : ""}{e.diferencia}
                    </td>
                    <td style={tdStyle}>{e.rendimiento}%</td>
                    <td style={tdStyle}>
                      {e.forma && e.forma.split("").map((letra, idx) => (
                        <span 
                          key={idx} 
                          style={{
                            display: "inline-block",
                            width: "18px",
                            height: "18px",
                            lineHeight: "18px",
                            textAlign: "center",
                            backgroundColor: getFormaColor(letra),
                            color: "#fff",
                            borderRadius: "3px",
                            marginRight: "2px",
                            fontSize: "11px",
                            fontWeight: "bold"
                          }}
                        >
                          {letra}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Columna de botones acordeón a la derecha */}
        <div style={accordionWrapperStyle}>
          {accordionItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => toggleAccordion(item.id)}
                style={accordionButtonStyle(activeAccordion === item.id)}
                onMouseEnter={(e) => {
                  if (activeAccordion !== item.id) {
                    e.currentTarget.style.backgroundColor = "rgba(79, 195, 247, 0.1)";
                    e.currentTarget.style.borderColor = "#64B5F6";
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeAccordion !== item.id) {
                    e.currentTarget.style.backgroundColor = "#1A1A1A";
                    e.currentTarget.style.borderColor = "#4FC3F7";
                  }
                }}
              >
                <span>{item.title}</span>
                <span style={{ fontSize: "18px" }}>
                  {activeAccordion === item.id ? "−" : "+"}
                </span>
              </button>
              {activeAccordion === item.id && (
                <div style={accordionContentStyle}>
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
