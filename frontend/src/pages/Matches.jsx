import { useEffect, useState, useRef } from "react";
import { getFixturesByDateForLocalDay } from "../api/api";
import { getDateRange, getTodayDateString } from "../utils/getDates";

export default function Matches() {
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [dates, setDates] = useState([]);
  const dateBarRef = useRef(null);

  // Generar fechas al cargar el componente
  useEffect(() => {
    const dateRange = getDateRange();
    setDates(dateRange);
    const today = getTodayDateString();
    setSelectedDate(today);
  }, []);

  // Cargar partidos cuando cambia la fecha seleccionada
  useEffect(() => {
    if (selectedDate) {
      loadMatches(selectedDate);
    }
  }, [selectedDate]);

  // Función para cargar partidos por fecha
  const loadMatches = async (date) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getFixturesByDateForLocalDay(date);
      setPartidos(Array.isArray(data?.response) ? data.response : []);
    } catch (error) {
      console.error("Error obteniendo partidos:", error);
      setError("Error al cargar los partidos");
      setPartidos([]);
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar clic en fecha
  const handleDateClick = (dateString) => {
    setSelectedDate(dateString);
    
    // Scroll para centrar la fecha seleccionada
    setTimeout(() => {
      if (dateBarRef.current) {
        const selectedElement = dateBarRef.current.querySelector(`[data-date="${dateString}"]`);
        if (selectedElement) {
          selectedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 100);
  };

  // ============================================
  // ESTILOS (solo para este componente)
  // ============================================
  
  const containerStyle = {
    padding: "20px",
    margin: "0 auto",
    maxWidth: "1400px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#0d1117",
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box"
  };

  const titleStyle = {
    marginBottom: "24px",
    marginTop: "0",
    fontSize: "28px",
    color: "#FFFFFF",
    fontWeight: "600"
  };

  const dateBarContainerStyle = {
    marginBottom: "24px",
    padding: "12px 0",
    overflowX: "auto",
    overflowY: "hidden",
    WebkitOverflowScrolling: "touch",
    scrollbarWidth: "thin",
    scrollbarColor: "#1f6feb #0d1117"
  };

  const dateBarStyle = {
    display: "flex",
    gap: "12px",
    padding: "0 8px",
    minWidth: "max-content"
  };

  const getDateItemStyle = (isSelected, isToday) => ({
    padding: "12px 20px",
    backgroundColor: isSelected ? "#1f6feb" : isToday ? "rgba(31, 111, 235, 0.2)" : "#1A1A1A",
    border: isSelected ? "2px solid #4FC3F7" : "1px solid rgba(79, 195, 247, 0.3)",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: isSelected ? "#FFFFFF" : "#B0BEC5",
    fontSize: "14px",
    fontWeight: isSelected ? "600" : "500",
    whiteSpace: "nowrap",
    minWidth: "80px",
    textAlign: "center",
    userSelect: "none"
  });

  const matchesGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "20px",
    width: "100%",
    boxSizing: "border-box"
  };

  const matchCardStyle = {
    padding: "20px",
    backgroundColor: "#1A1A1A",
    border: "1px solid rgba(79, 195, 247, 0.2)",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
    cursor: "pointer",
    transition: "all 0.3s ease"
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div style={containerStyle}>
      {/* Título */}
      <h1 style={titleStyle}>Partidos</h1>
      
      {/* Barra de fechas */}
      {dates.length > 0 && (
        <div style={dateBarContainerStyle} ref={dateBarRef}>
          <div style={dateBarStyle}>
            {dates.map((dateObj) => {
              const isSelected = selectedDate === dateObj.dateString;
              return (
                <div
                  key={dateObj.dateString}
                  data-date={dateObj.dateString}
                  style={getDateItemStyle(isSelected, dateObj.isToday)}
                  onClick={() => handleDateClick(dateObj.dateString)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "#1f6feb";
                      e.currentTarget.style.borderColor = "#4FC3F7";
                      e.currentTarget.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      const style = getDateItemStyle(false, dateObj.isToday);
                      e.currentTarget.style.backgroundColor = style.backgroundColor;
                      e.currentTarget.style.borderColor = style.border;
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  {dateObj.display}
                  {dateObj.isToday && !isSelected && (
                    <div style={{ fontSize: "10px", marginTop: "4px", color: "#4FC3F7" }}>Hoy</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contenido de partidos */}
      {loading && (
        <div style={{ 
          margin: "40px 0", 
          padding: "40px 20px", 
          textAlign: "center", 
          minHeight: "200px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}>
          <p style={{ color: "#4FC3F7", fontSize: "16px", margin: "0" }}>Cargando partidos...</p>
        </div>
      )}

      {!loading && error && (
        <div style={{ 
          margin: "40px 0", 
          padding: "40px 20px", 
          textAlign: "center", 
          minHeight: "200px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          backgroundColor: "rgba(231, 76, 60, 0.1)",
          borderRadius: "8px",
          border: "1px solid rgba(231, 76, 60, 0.3)"
        }}>
          <p style={{ color: "#e74c3c", fontSize: "16px", margin: "0" }}>{error}</p>
        </div>
      )}

      {!loading && !error && partidos.length === 0 && (
        <div style={{ 
          margin: "40px 0", 
          padding: "40px 20px", 
          textAlign: "center", 
          minHeight: "200px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          backgroundColor: "rgba(79, 195, 247, 0.05)",
          borderRadius: "8px",
          border: "1px solid rgba(79, 195, 247, 0.2)"
        }}>
          <p style={{ color: "#B0BEC5", fontSize: "16px", margin: "0" }}>No hay partidos disponibles para esta fecha</p>
        </div>
      )}

      {!loading && !error && partidos.length > 0 && (
        <div style={matchesGridStyle}>
          {partidos.map((partido, index) => (
            <div
              key={partido.fixture?.id || `match-${index}`}
              style={matchCardStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#4FC3F7";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 195, 247, 0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(79, 195, 247, 0.2)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Equipos */}
              <div style={{ 
                margin: "0", 
                padding: "10px 0", 
                fontSize: "18px", 
                fontWeight: "bold", 
                textAlign: "center", 
                color: "#FFFFFF",
                wordWrap: "break-word", 
                overflowWrap: "break-word", 
                maxWidth: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {partido.teams?.home?.logo && (
                    <img 
                      src={partido.teams.home.logo} 
                      alt={partido.teams.home.name || "Equipo local"} 
                      style={{
                        width: "28px",
                        height: "28px",
                        objectFit: "contain"
                      }}
                    />
                  )}
                  <span>{partido.teams?.home?.name || "N/A"}</span>
                </div>
                <span>vs</span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{partido.teams?.away?.name || "N/A"}</span>
                  {partido.teams?.away?.logo && (
                    <img 
                      src={partido.teams.away.logo} 
                      alt={partido.teams.away.name || "Equipo visitante"} 
                      style={{
                        width: "28px",
                        height: "28px",
                        objectFit: "contain"
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Marcador */}
              <div style={{ 
                margin: "12px 0", 
                padding: "10px 0", 
                fontSize: "24px", 
                fontWeight: "bold", 
                textAlign: "center", 
                color: partido.goals?.home !== null && partido.goals?.away !== null ? "#4FC3F7" : "#B0BEC5"
              }}>
                {partido.goals?.home !== null && partido.goals?.away !== null 
                  ? `${partido.goals.home} - ${partido.goals.away}` 
                  : "VS"}
              </div>
              
              {/* Fecha y hora */}
              <div style={{ 
                margin: "8px 0", 
                padding: "5px 0", 
                fontSize: "14px", 
                textAlign: "center", 
                color: "#B0BEC5",
                wordWrap: "break-word", 
                overflowWrap: "break-word", 
                maxWidth: "100%" 
              }}>
                {partido.fixture?.date 
                  ? new Date(partido.fixture.date).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })
                  : ""}
              </div>
              
              {/* Liga */}
              {partido.league && (
                <div style={{ 
                  margin: "8px 0", 
                  padding: "5px 0", 
                  fontSize: "12px", 
                  textAlign: "center", 
                  color: "#4FC3F7"
                }}>
                  {partido.league.name}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
