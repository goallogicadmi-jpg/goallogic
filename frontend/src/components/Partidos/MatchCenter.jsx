import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

import EventosPartido from "./EventosPartido";

import MatchMomentumChart from "./Cronologia/MatchMomentumChart";

import TacticalView from "./Tactical/TacticalView";

import Lineups from "./Lineups";

import EstadisticasPartido from "./EstadisticasPartido";

import TablaCompeticion from "./TablaCompeticion";

import EquipoDetalle from "../EquipoDetalle";

import useMatchTimeline from "../../hooks/useMatchTimeline";

import useMediaQuery from "../../hooks/useMediaQuery";

import useSwipeTabs from "../../hooks/useSwipeTabs";

import BadgeEstado from "./BadgeEstado";
import PremiumTabs from "../ui/PremiumTabs";

import {

  formatFixtureLiveMinute,

  shouldShowFixtureLiveMinute,

} from "../../utils/matchEvents";

import "../../styles/partidos.css";



const MATCH_CENTER_TABS = [
  { id: "eventos", label: "Eventos" },
  { id: "cronologia", label: "Cronología" },
  { id: "tactica", label: "Táctica" },
  { id: "alineaciones", label: "Alineaciones" },
  { id: "analisis", label: "Análisis" },
  { id: "clasificacion", label: "Clasificación" },
];



/**

 * MatchCenter - Panel avanzado de detalles del partido con pestañas

 * @param {Object} partido - Datos del partido

 * @param {Function} onClose - Función para cerrar el panel

 */

export default function MatchCenter({ partido, onClose, domain = "club" }) {

  const [tabActiva, setTabActiva] = useState("eventos");

  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  const resolvedDomain = partido?.domain || partido?.competitionMeta?.domain || domain;

  const fixtureId = partido?.fixture?.id;

  const isUltraCompact = useMediaQuery("(max-width: 360px)");



  const timeline = useMatchTimeline(fixtureId, partido, {

    enabled: Boolean(fixtureId),

  });



  const liveMinuteLabel = useMemo(() => {

    if (!shouldShowFixtureLiveMinute(partido)) {

      return null;

    }

    return formatFixtureLiveMinute(partido?.fixture?.status);

  }, [partido?.fixture?.status, partido]);



  const estadoPartido = partido?.fixture?.status?.short || "NS";

  const contentRef = useRef(null);



  const activeTabIndex = useMemo(

    () => MATCH_CENTER_TABS.findIndex((tab) => tab.id === tabActiva),

    [tabActiva]

  );



  const goToTabByIndex = useCallback((index) => {

    const tab = MATCH_CENTER_TABS[index];

    if (tab) {

      setTabActiva(tab.id);

    }

  }, []);



  const swipeHandlers = useSwipeTabs({

    onSwipeLeft: () => goToTabByIndex(activeTabIndex + 1),

    onSwipeRight: () => goToTabByIndex(activeTabIndex - 1),

  });



  useEffect(() => {

    setTabActiva("eventos");

    setEquipoSeleccionado(null);

  }, [partido?.fixture?.id]);



  useEffect(() => {

    if (contentRef.current) {

      contentRef.current.scrollTop = 0;

    }

  }, [tabActiva]);



  if (!partido) return null;



  if (equipoSeleccionado) {

    return (

      <div className="match-center-overlay" onClick={onClose}>

        <div

          className="match-center-modal"

          onClick={(e) => e.stopPropagation()}

          style={{ maxWidth: "95%", width: "100%", maxHeight: "95vh", overflowY: "auto" }}

        >

          <div style={{ position: "relative", padding: "20px" }}>

            <button

              className="match-center-close"

              onClick={() => setEquipoSeleccionado(null)}

              style={{ position: "absolute", top: "10px", right: "10px", zIndex: 1000 }}

            >

              ×

            </button>

            <EquipoDetalle

              teamId={equipoSeleccionado}

              onBack={() => setEquipoSeleccionado(null)}

              domain={resolvedDomain === "selection" ? "selection" : "club"}

              competitionId={partido.league?.id}

              season={

                partido.league?.season != null && partido.league?.season !== ""

                  ? String(partido.league.season)

                  : null

              }

            />

          </div>

        </div>

      </div>

    );

  }



  return (

    <div className="match-center-overlay" onClick={onClose}>

      <div

        className={[

          "match-center-modal",

          isUltraCompact ? "match-center-modal--ultra-compact" : "",

        ].filter(Boolean).join(" ")}

        onClick={(e) => e.stopPropagation()}

      >

        <div className="match-center-header">

          <div className="match-center-header-info">

            <div className="match-center-equipos">

              <div

                className="match-center-equipo"

                onClick={(e) => {

                  e.stopPropagation();

                  if (partido.teams?.home?.id) {

                    setEquipoSeleccionado(partido.teams.home.id);

                  }

                }}

                style={{ cursor: partido.teams?.home?.id ? "pointer" : "default" }}

              >

                {partido.teams?.home?.logo && (

                  <img

                    src={partido.teams.home.logo}

                    alt={partido.teams.home.name}

                    className="match-center-equipo-logo"

                  />

                )}

                <span className="match-center-equipo-nombre">

                  {partido.teams?.home?.name || "N/A"}

                </span>

              </div>

              <div className="match-center-resultado">

                {partido.goals?.home !== null && partido.goals?.away !== null ? (

                  <>

                    <span className="match-center-goles">

                      {partido.goals.home}

                    </span>

                    <span className="match-center-separador">-</span>

                    <span className="match-center-goles">

                      {partido.goals.away}

                    </span>

                  </>

                ) : (

                  <span className="match-center-vs">VS</span>

                )}

              </div>

              <div

                className="match-center-equipo"

                onClick={(e) => {

                  e.stopPropagation();

                  if (partido.teams?.away?.id) {

                    setEquipoSeleccionado(partido.teams.away.id);

                  }

                }}

                style={{ cursor: partido.teams?.away?.id ? "pointer" : "default" }}

              >

                {partido.teams?.away?.logo && (

                  <img

                    src={partido.teams.away.logo}

                    alt={partido.teams.away.name}

                    className="match-center-equipo-logo"

                  />

                )}

                <span className="match-center-equipo-nombre">

                  {partido.teams?.away?.name || "N/A"}

                </span>

              </div>

            </div>

            <div className="match-center-liga">

              {partido.league?.logo && (

                <img

                  src={partido.league.logo}

                  alt={partido.league.name}

                  className="match-center-liga-logo"

                />

              )}

              <span>{partido.league?.name || "Competición"}</span>

              <div className="match-center-status-row">

                <BadgeEstado estado={estadoPartido} />

                {liveMinuteLabel && (

                  <span className="match-center-live-minute">{liveMinuteLabel}</span>

                )}

              </div>

            </div>

          </div>

          <button className="match-center-close" onClick={onClose}>

            ×

          </button>

        </div>



        <PremiumTabs
          tabs={MATCH_CENTER_TABS}
          activeTab={tabActiva}
          onTabChange={setTabActiva}
          ariaLabel="Secciones del partido"
          wrapClassName="match-center-tabs-wrap"
          className="match-center-tabs"
          tabClassName="match-center-tab"
        />



        <div

          className="match-center-content"

          ref={contentRef}

          onTouchStart={swipeHandlers.onTouchStart}

          onTouchEnd={swipeHandlers.onTouchEnd}

          onTouchCancel={swipeHandlers.onTouchCancel}

        >

          {partido.fixture?.id && (

            <>

              <div

                className={`match-center-panel${tabActiva === "eventos" ? " is-active" : ""}`}

                aria-hidden={tabActiva !== "eventos"}

              >

                <EventosPartido

                  fixtureId={partido.fixture.id}

                  partido={partido}

                  timeline={timeline}

                />

              </div>

              <div

                className={`match-center-panel${tabActiva === "cronologia" ? " is-active" : ""}`}

                aria-hidden={tabActiva !== "cronologia"}

              >

                <MatchMomentumChart

                  fixtureId={partido.fixture.id}

                  partido={partido}

                  timeline={timeline}

                />

              </div>

            </>

          )}

          {tabActiva === "tactica" && partido.fixture?.id && (

            <TacticalView fixtureId={partido.fixture.id} partido={partido} />

          )}

          {tabActiva === "alineaciones" && partido.fixture?.id && (

            <Lineups

              fixtureId={partido.fixture.id}

              partido={partido}

              onTeamClick={(teamId) => setEquipoSeleccionado(teamId)}

            />

          )}

          {tabActiva === "analisis" && partido.fixture?.id && (

            <EstadisticasPartido fixtureId={partido.fixture.id} partido={partido} />

          )}

          {tabActiva === "clasificacion" && partido.league?.id && (

            <TablaCompeticion

              leagueId={partido.league.id}

              season={partido.league?.season || new Date().getFullYear()}

            />

          )}

          {!partido.fixture?.id && tabActiva !== "clasificacion" && (

            <div className="match-center-empty">

              <p>No hay información disponible para este partido.</p>

            </div>

          )}

          {!partido.league?.id && tabActiva === "clasificacion" && (

            <div className="match-center-empty">

              <p>No hay información de clasificación disponible.</p>

            </div>

          )}

        </div>

      </div>

    </div>

  );

}


