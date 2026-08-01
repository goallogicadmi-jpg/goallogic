import { useCallback, useEffect, useRef, useState } from "react";
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
import { useLiveFixturesPolling } from "../hooks/useLiveFixturesPolling";
import { getDateRange, getTodayDateString } from "../utils/getDates";
import { hasFixtureLiveSnapshotChanged } from "../utils/matchEvents";
import "../styles/partidos.css";
import { GoalLogicSectionHeader } from "../components/GoalLogicTitle";

export default function DomainMatchesPage({ scope = "club", domain }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useUser();
  const [showSessionToast, setShowSessionToast] = useState(false);
  const [partidos, setPartidos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
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
  const [dates, setDates] = useState([]);
  const resolvedScope = scope === "all" ? "all" : (domain || scope || "club");

  useEffect(() => {
    setDates(getDateRange());
    setSelectedDate(getTodayDateString());
  }, []);

  const loadMatches = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);

      const cacheKey = `${resolvedScope}:local:${date}`;
      if (cacheRef.current[cacheKey]) {
        setPartidos(cacheRef.current[cacheKey]);
        setLoading(false);
        return;
      }

      const fixtures = await getMatchesFeed(resolvedScope, { date });
      const list = Array.isArray(fixtures) ? fixtures : [];
      cacheRef.current[cacheKey] = list;
      setPartidos(list);
    } catch (err) {
      console.error(`Error cargando partidos de ${resolvedScope}:`, err);
      setError("Hubo un problema al cargar los partidos del feed solicitado.");
      setPartidos([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedScope]);

  const updatePartidos = useCallback((updater) => {
    setPartidos((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      if (selectedDate) {
        const cacheKey = `${resolvedScope}:local:${selectedDate}`;
        cacheRef.current[cacheKey] = next;
      }

      return next;
    });
  }, [resolvedScope, selectedDate]);

  useLiveFixturesPolling(partidos, updatePartidos, {
    enabled: !loading && partidos.length > 0,
  });

  useEffect(() => {
    setPartidoSeleccionado((current) => {
      if (!current?.fixture?.id) {
        return current;
      }

      const fresh = partidos.find((partido) => partido.fixture?.id === current.fixture.id);
      if (!fresh || !hasFixtureLiveSnapshotChanged(current, fresh)) {
        return current;
      }

      return fresh;
    });
  }, [partidos]);

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
        leagueName: partido.league?.name ?? null,
        leagueLogo: partido.league?.logo ?? null,
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
        {dates.length > 0 && dates.map((dateObj) => {
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
