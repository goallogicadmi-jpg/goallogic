import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Toast from "../components/Toast";
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from "../constants/sessionMessages";
import { getMatchesFeed } from "../api/api";
import FiltrosPartidos from "../components/Partidos/FiltrosPartidos";
import BusquedaPartidos from "../components/Partidos/BusquedaPartidos";
import OrdenPartidos from "../components/Partidos/OrdenPartidos";
import AgrupadorPartidos from "../components/Partidos/AgrupadorPartidos";
import MatchCenter from "../components/Partidos/MatchCenter";
import { getDateRange, getTodayDateString } from "../utils/getDates";
import "../styles/partidos.css";
import { GoalLogicSectionHeader } from "../components/GoalLogicTitle";

export default function DomainMatchesPage({ scope = "club", domain }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [showSessionToast, setShowSessionToast] = useState(false);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());
  const [filtros, setFiltros] = useState({
    competitionId: null,
    country: null,
    status: null,
  });
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState("hora");
  const [partidoSeleccionado, setPartidoSeleccionado] = useState(null);
  const [favoritosActualizados, setFavoritosActualizados] = useState(0);

  const cacheRef = useRef({});
  const dates = useMemo(() => getDateRange(), []);
  const resolvedScope = scope === "all" ? "all" : (domain || scope || "club");

  const loadMatches = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `${resolvedScope}:${date}`;
      if (cacheRef.current[cacheKey]) {
        setPartidos(cacheRef.current[cacheKey]);
        return;
      }

      const fixtures = await getMatchesFeed(resolvedScope, { date });
      cacheRef.current[cacheKey] = fixtures;
      setPartidos(Array.isArray(fixtures) ? fixtures : []);
    } catch (err) {
      console.error(`Error cargando partidos de ${resolvedScope}:`, err);
      setError("Hubo un problema al cargar los partidos del feed solicitado.");
      setPartidos([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedScope]);

  useEffect(() => {
    if (selectedDate) {
      loadMatches(selectedDate);
    }
  }, [loadMatches, selectedDate]);

  const handlePrediccionesClick = useCallback((partido) => {
    if (!isAuthenticated) {
      setShowSessionToast(true);
      return;
    }

    const homeTeam = partido?.teams?.home;
    const awayTeam = partido?.teams?.away;
    const matchDomain =
      partido?.domain ||
      partido?.competitionMeta?.domain ||
      (resolvedScope === "all" ? null : resolvedScope);

    if (!homeTeam || !awayTeam) {
      return;
    }

    navigate("/predicciones", {
      state: {
        domain: matchDomain,
        leagueId: partido.league?.id,
        fixtureId: partido.fixture?.id ?? null,
        fromMatchesRoute: window.location.pathname,
        homeTeam: {
          id: homeTeam.id,
          name: homeTeam.name,
          logo: homeTeam.logo,
        },
        awayTeam: {
          id: awayTeam.id,
          name: awayTeam.name,
          logo: awayTeam.logo,
        },
      },
    });
  }, [navigate, resolvedScope, isAuthenticated]);

  return (
    <div className="partidos-container">
      <div className="partidos-header">
        <GoalLogicSectionHeader size="lg" className="partidos-brand-header" />
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
          {resolvedScope !== "all" && (
            <button
              type="button"
              className="fecha-button"
              onClick={() => navigate("/partidos")}
            >
              Ver feed global
            </button>
          )}
          {resolvedScope !== "club" && (
            <button
              type="button"
              className="fecha-button"
              onClick={() => navigate("/clubes/partidos")}
            >
              Ver solo clubes
            </button>
          )}
          {resolvedScope !== "selection" && (
            <button
              type="button"
              className="fecha-button"
              onClick={() => navigate("/selecciones/partidos")}
            >
              Ver solo selecciones
            </button>
          )}
        </div>
      </div>

      <div className="fechas-container">
        {dates.map((dateObj) => {
          const isSelected = dateObj.dateString === selectedDate;

          return (
            <button
              key={dateObj.dateString}
              className={`fecha-button ${dateObj.isToday ? "today" : ""} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedDate(dateObj.dateString)}
            >
              {dateObj.display}
            </button>
          );
        })}
      </div>

      {!loading && partidos.length > 0 && (
        <div className="controles-container">
          <FiltrosPartidos
            partidos={partidos}
            filtros={filtros}
            setFiltros={setFiltros}
            domain={domain}
          />
          <BusquedaPartidos busqueda={busqueda} setBusqueda={setBusqueda} />
          <OrdenPartidos orden={orden} setOrden={setOrden} />
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <p>Cargando partidos...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <p>{error}</p>
        </div>
      )}

      {!loading && partidos.length === 0 && !error && (
        <div className="empty-state">
          <p>
            {resolvedScope === "all"
              ? "No hay partidos disponibles para esta fecha en el feed global."
              : `No hay partidos disponibles para esta fecha dentro de ${resolvedScope === "selection" ? "selecciones" : "clubes"}.`}
          </p>
        </div>
      )}

      {!loading && partidos.length > 0 && (
        <AgrupadorPartidos
          key={`${resolvedScope}-${favoritosActualizados}`}
          partidos={partidos}
          filtros={filtros}
          busqueda={busqueda}
          orden={orden}
          scope={resolvedScope}
          onPartidoClick={setPartidoSeleccionado}
          onPrediccionesClick={handlePrediccionesClick}
          onFavoritoChange={() => setFavoritosActualizados((prev) => prev + 1)}
        />
      )}

      {partidoSeleccionado && (
        <MatchCenter
          partido={partidoSeleccionado}
          domain={
            partidoSeleccionado.domain ||
            partidoSeleccionado.competitionMeta?.domain ||
            (resolvedScope === "all" ? "club" : resolvedScope)
          }
          onClose={() => setPartidoSeleccionado(null)}
        />
      )}

      {showSessionToast && (
        <Toast
          message={SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE}
          type="warning"
          duration={SESSION_REQUIRED_TOAST_DURATION_MS}
          onClose={() => setShowSessionToast(false)}
        />
      )}
    </div>
  );
}
