import { useMemo } from 'react';
import '../../styles/partidos.css';

function SearchIcon() {
  return (
    <svg
      className="partidos-filter-bar__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SortIcon() {
  return (
    <svg
      className="partidos-filter-bar__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Barra compacta de filtros premium — exclusiva de la sección Partidos.
 */
export default function PartidosFilterBar({
  partidos,
  filtros,
  setFiltros,
  busqueda,
  setBusqueda,
  orden,
  setOrden,
  domain = 'club',
}) {
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

      if (countryName && countryName !== 'World' && !countriesMap.has(countryName)) {
        countriesMap.set(countryName, countryName);
      }
    });

    return {
      competitions: Array.from(competitionsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
      countries: Array.from(countriesMap.values()).sort((a, b) => a.localeCompare(b)),
    };
  }, [partidos]);

  const handleFilterChange = (key, value) => {
    setFiltros((previous) => ({
      ...previous,
      [key]: value === 'todos' ? null : value,
    }));
  };

  const showCountryFilter = domain !== 'selection' && options.countries.length > 0;

  return (
    <div className="partidos-filter-bar" role="toolbar" aria-label="Filtros de partidos">
      <div className="partidos-filter-bar__scroll">
        <div className="partidos-filter-bar__field">
          <label className="partidos-filter-bar__sr-only" htmlFor="partidos-filter-competition">
            Competición
          </label>
          <select
            id="partidos-filter-competition"
            className="partidos-filter-bar__control"
            value={filtros.competitionId || 'todos'}
            onChange={(event) => handleFilterChange('competitionId', event.target.value)}
          >
            <option value="todos">Competición</option>
            {options.competitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>
        </div>

        {showCountryFilter ? (
          <div className="partidos-filter-bar__field">
            <label className="partidos-filter-bar__sr-only" htmlFor="partidos-filter-country">
              País
            </label>
            <select
              id="partidos-filter-country"
              className="partidos-filter-bar__control"
              value={filtros.country || 'todos'}
              onChange={(event) => handleFilterChange('country', event.target.value)}
            >
              <option value="todos">País</option>
              {options.countries.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="partidos-filter-bar__field">
          <label className="partidos-filter-bar__sr-only" htmlFor="partidos-filter-status">
            Estado
          </label>
          <select
            id="partidos-filter-status"
            className="partidos-filter-bar__control"
            value={filtros.status || 'todos'}
            onChange={(event) => handleFilterChange('status', event.target.value)}
          >
            <option value="todos">Estado</option>
            <option value="live">En vivo</option>
            <option value="finished">Finalizado</option>
            <option value="scheduled">Programado</option>
          </select>
        </div>

        <div className="partidos-filter-bar__field partidos-filter-bar__field--search">
          <label className="partidos-filter-bar__sr-only" htmlFor="partidos-filter-search">
            Buscar
          </label>
          <SearchIcon />
          <input
            id="partidos-filter-search"
            type="search"
            className="partidos-filter-bar__control partidos-filter-bar__control--search"
            placeholder="Buscar"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>

        <div className="partidos-filter-bar__field partidos-filter-bar__field--sort">
          <label className="partidos-filter-bar__sr-only" htmlFor="partidos-filter-sort">
            Ordenar por
          </label>
          <SortIcon />
          <select
            id="partidos-filter-sort"
            className="partidos-filter-bar__control partidos-filter-bar__control--sort"
            value={orden}
            onChange={(event) => setOrden(event.target.value)}
          >
            <option value="hora">Ordenar: Hora</option>
            <option value="competicion">Ordenar: Competición</option>
            <option value="pais">Ordenar: País</option>
          </select>
        </div>
      </div>
    </div>
  );
}
