import React from "react";
import "../../styles/partidos.css";

/**
 * BusquedaPartidos - Componente para buscar partidos por equipo o liga
 * @param {string} busqueda - Texto de búsqueda actual
 * @param {Function} setBusqueda - Función para actualizar búsqueda
 */
export default function BusquedaPartidos({ busqueda, setBusqueda }) {
  return (
    <div className="busqueda-wrapper">
      <input
        type="text"
        className="busqueda-input"
        placeholder="Buscar por equipo o competición..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
    </div>
  );
}
