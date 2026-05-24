import React from "react";
import "../../styles/partidos.css";

/**
 * OrdenPartidos - Componente para ordenar partidos
 * @param {string} orden - Orden actual seleccionado
 * @param {Function} setOrden - Función para actualizar orden
 */
export default function OrdenPartidos({ orden, setOrden }) {
  return (
    <div className="orden-wrapper">
      <label className="orden-label">Ordenar por:</label>
      <select
        className="orden-select"
        value={orden}
        onChange={(e) => setOrden(e.target.value)}
      >
        <option value="hora">Hora</option>
        <option value="competicion">Competicion</option>
        <option value="pais">País</option>
      </select>
    </div>
  );
}
