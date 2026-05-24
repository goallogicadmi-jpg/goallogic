import React, { useMemo } from "react";
import "../../styles/partidos.css";

/**
 * FiltrosPartidos - Filtros exactos por competición, país y estado.
 * No aplica ninguna heurística adicional sobre los partidos recibidos.
 */
export default function FiltrosPartidos({ partidos, filtros, setFiltros, domain = "club" }) {
  const options = useMemo(() => {
    const competitionsMap = new Map();
    const countriesMap = new Map();

    partidos.forEach((partido) => {
      const competitionId = partido.league?.id;
      const competitionName = partido.league?.name;
      const countryName = partido.league?.country;

      if (competitionId && competitionName && !competitionsMap.has(competitionId)) {
        competitionsMap.set(competitionId, {
          id: competitionId,
          name: competitionName,
        });
      }

      if (countryName && countryName !== "World" && !countriesMap.has(countryName)) {
        countriesMap.set(countryName, countryName);
      }
    });

    return {
      competitions: Array.from(competitionsMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
      countries: Array.from(countriesMap.values()).sort((left, right) => left.localeCompare(right)),
    };
  }, [partidos]);

  const handleFilterChange = (key, value) => {
    setFiltros((previous) => ({
      ...previous,
      [key]: value === "todos" ? null : value,
    }));
  };

  const showCountryFilter = domain !== "selection" && options.countries.length > 0;

  return (
    <div className="filtros-wrapper">
      <div className="filtro-group">
        <label className="filtro-label">Competición</label>
        <select
          className="filtro-select"
          value={filtros.competitionId || "todos"}
          onChange={(event) => handleFilterChange("competitionId", event.target.value)}
        >
          <option value="todos">Todas las competiciones</option>
          {options.competitions.map((competition) => (
            <option key={competition.id} value={competition.id}>
              {competition.name}
            </option>
          ))}
        </select>
      </div>

      {showCountryFilter && (
        <div className="filtro-group">
          <label className="filtro-label">País</label>
          <select
            className="filtro-select"
            value={filtros.country || "todos"}
            onChange={(event) => handleFilterChange("country", event.target.value)}
          >
            <option value="todos">Todos los países</option>
            {options.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="filtro-group">
        <label className="filtro-label">Estado</label>
        <select
          className="filtro-select"
          value={filtros.status || "todos"}
          onChange={(event) => handleFilterChange("status", event.target.value)}
        >
          <option value="todos">Todos los estados</option>
          <option value="live">En vivo</option>
          <option value="finished">Finalizado</option>
          <option value="scheduled">Programado</option>
        </select>
      </div>
    </div>
  );
}
