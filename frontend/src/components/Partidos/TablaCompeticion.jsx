import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/partidos.css";

/**
 * TablaCompeticion - Componente para mostrar la tabla de clasificación
 * @param {number} leagueId - ID de la liga
 * @param {number} season - Temporada
 */
export default function TablaCompeticion({ leagueId, season }) {
  const [tabla, setTabla] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calcular temporada si no se proporciona
  const calcularTemporada = () => {
    if (season) return season;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return currentMonth >= 8 ? currentYear : currentYear - 1;
  };

  useEffect(() => {
    const cargarTabla = async () => {
      if (!leagueId) {
        setLoading(false);
        return;
      }

      const temporada = calcularTemporada();

      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(
          `/estadisticas/torneo?leagueId=${leagueId}&season=${temporada}`
        );

        if (response.data && response.data.tabla && Array.isArray(response.data.tabla)) {
          setTabla(response.data.tabla);
        } else {
          setTabla([]);
        }
      } catch (err) {
        console.error("Error cargando tabla:", err);
        setError("Error al cargar la tabla de clasificación");
      } finally {
        setLoading(false);
      }
    };

    cargarTabla();
  }, [leagueId, season]);

  if (loading) {
    return (
      <div className="match-center-loading">
        <p>Cargando clasificación...</p>
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

  if (tabla.length === 0) {
    return (
      <div className="match-center-empty">
        <p>No hay datos de clasificación disponibles.</p>
      </div>
    );
  }

  return (
    <div className="tabla-competicion-container">
      <table className="tabla-competicion">
        <thead>
          <tr>
            <th>#</th>
            <th>Equipo</th>
            <th>PJ</th>
            <th>PG</th>
            <th>PE</th>
            <th>PP</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {tabla.map((equipo, index) => (
            <tr key={index}>
              <td className="tabla-posicion">{equipo.posicion || index + 1}</td>
              <td className="tabla-equipo">
                {equipo.logo && (
                  <img
                    src={equipo.logo}
                    alt={equipo.equipo}
                    className="tabla-equipo-logo"
                  />
                )}
                <span>{equipo.equipo || "N/A"}</span>
              </td>
              <td>{equipo.jugados || 0}</td>
              <td>{equipo.ganados || 0}</td>
              <td>{equipo.empatados || 0}</td>
              <td>{equipo.perdidos || 0}</td>
              <td>{equipo.golesFavor || 0}</td>
              <td>{equipo.golesContra || 0}</td>
              <td className={equipo.diferencia > 0 ? "positivo" : equipo.diferencia < 0 ? "negativo" : ""}>
                {equipo.diferencia > 0 ? "+" : ""}{equipo.diferencia || 0}
              </td>
              <td className="tabla-puntos">{equipo.puntos || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
