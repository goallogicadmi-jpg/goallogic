import React, { useEffect, useState } from "react";
import { getFixtureStatistics } from "../../api/api";
import "../../styles/partidos.css";

/**
 * EstadisticasPartido - Componente para mostrar estadísticas del partido
 * @param {number} fixtureId - ID del partido
 * @param {Object} partido - Datos del partido (para obtener IDs de equipos)
 */
export default function EstadisticasPartido({ fixtureId, partido }) {
  const [estadisticas, setEstadisticas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const cargarEstadisticas = async () => {
      if (!fixtureId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getFixtureStatistics(fixtureId);
        
        if (data && data.response && Array.isArray(data.response)) {
          setEstadisticas(data.response);
        } else {
          setEstadisticas([]);
        }
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        setError("Error al cargar estadísticas del partido");
      } finally {
        setLoading(false);
      }
    };

    cargarEstadisticas();
  }, [fixtureId]);

  const obtenerEstadistica = (estadisticasEquipo, tipo) => {
    if (!estadisticasEquipo || !Array.isArray(estadisticasEquipo)) return null;
    const stat = estadisticasEquipo.find((s) => s.type === tipo);
    return stat?.value || "0";
  };

  const traducirEstadistica = (tipo) => {
    const traducciones = {
      "Ball Possession": "Posesión",
      "Total Shots": "Tiros Totales",
      "Shots on Goal": "Tiros al Arco",
      "Shots off Goal": "Tiros Desviados",
      "Shots insidebox": "Tiros dentro del Área",
      "Shots outsidebox": "Tiros fuera del Área",
      "Shots blocked": "Tiros Bloqueados",
      "Fouls": "Faltas",
      "Corner Kicks": "Córners",
      "Offsides": "Offsides",
      "Goalkeeper Saves": "Paradas del Portero",
      "Yellow Cards": "Tarjetas Amarillas",
      "Red Cards": "Tarjetas Rojas",
      "Total passes": "Total de Pases",
      "Passes accurate": "Pases Precisos",
      "Passes %": "Precisión de Pases",
    };
    return traducciones[tipo] || tipo;
  };

  if (loading) {
    return (
      <div className="match-center-loading">
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="match-center-error">
        <p>{error}</p>
      </div>
    );
  }

  if (!estadisticas || estadisticas.length === 0) {
    return (
      <div className="match-center-empty">
        <p>No hay estadísticas disponibles para este partido.</p>
      </div>
    );
  }

  const statsLocal = estadisticas.find(
    (s) => s.team?.id === partido?.teams?.home?.id
  );
  const statsVisitante = estadisticas.find(
    (s) => s.team?.id === partido?.teams?.away?.id
  );

  if (!statsLocal || !statsVisitante) {
    return (
      <div className="match-center-empty">
        <p>No se pudieron cargar las estadísticas completas.</p>
      </div>
    );
  }

  // Tipos de estadísticas a mostrar
  const tiposEstadisticas = [
    "Ball Possession",
    "Total Shots",
    "Shots on Goal",
    "Shots off Goal",
    "Fouls",
    "Corner Kicks",
    "Offsides",
    "Yellow Cards",
    "Red Cards",
  ];

  return (
    <div className="estadisticas-container">
      <div className="estadisticas-header">
        <div className="estadisticas-equipo">
          {partido?.teams?.home?.logo && (
            <img
              src={partido.teams.home.logo}
              alt={partido.teams.home.name}
              className="estadisticas-equipo-logo"
            />
          )}
          <span>{partido?.teams?.home?.name || "Local"}</span>
        </div>
        <div className="estadisticas-equipo">
          {partido?.teams?.away?.logo && (
            <img
              src={partido.teams.away.logo}
              alt={partido.teams.away.name}
              className="estadisticas-equipo-logo"
            />
          )}
          <span>{partido?.teams?.away?.name || "Visitante"}</span>
        </div>
      </div>

      <div className="estadisticas-lista">
        {tiposEstadisticas.map((tipo) => {
          const valorLocal = obtenerEstadistica(statsLocal.statistics, tipo);
          const valorVisitante = obtenerEstadistica(statsVisitante.statistics, tipo);
          const maxValor = Math.max(parseInt(valorLocal) || 0, parseInt(valorVisitante) || 0);

          return (
            <div key={tipo} className="estadistica-item">
              <div className="estadistica-nombre">
                {traducirEstadistica(tipo)}
              </div>
              <div className="estadistica-barras">
                <div className="estadistica-barra-wrapper">
                  <div
                    className="estadistica-barra estadistica-local"
                    style={{
                      width: maxValor > 0 ? `${(valorLocal / maxValor) * 100}%` : "0%",
                    }}
                  >
                    <span className="estadistica-valor">{valorLocal}</span>
                  </div>
                </div>
                <div className="estadistica-barra-wrapper">
                  <div
                    className="estadistica-barra estadistica-visitante"
                    style={{
                      width: maxValor > 0 ? `${(valorVisitante / maxValor) * 100}%` : "0%",
                    }}
                  >
                    <span className="estadistica-valor">{valorVisitante}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
