import React, { useState, useEffect } from "react";
import EventosPartido from "./EventosPartido";
import Lineups from "./Lineups";
import EstadisticasPartido from "./EstadisticasPartido";
import TablaCompeticion from "./TablaCompeticion";
import EquipoDetalle from "../EquipoDetalle";
import "../../styles/partidos.css";

/**
 * MatchCenter - Panel avanzado de detalles del partido con pestañas
 * @param {Object} partido - Datos del partido
 * @param {Function} onClose - Función para cerrar el panel
 */
export default function MatchCenter({ partido, onClose, domain = "club" }) {
  const [tabActiva, setTabActiva] = useState("eventos");
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const resolvedDomain = partido?.domain || partido?.competitionMeta?.domain || domain;

  // Resetear pestaña a "eventos" cuando cambia el partido
  useEffect(() => {
    setTabActiva("eventos");
    setEquipoSeleccionado(null);
  }, [partido?.fixture?.id]);

  if (!partido) return null;

  // Si hay un equipo seleccionado, mostrar el detalle correcto según el dominio
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

  const tabs = [
    { id: "eventos", label: "Eventos" },
    { id: "alineaciones", label: "Alineaciones" },
    { id: "analisis", label: "Análisis" },
    { id: "clasificacion", label: "Clasificación" },
  ];

  return (
    <div className="match-center-overlay" onClick={onClose}>
      <div
        className="match-center-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Match Center */}
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
                style={{ cursor: partido.teams?.home?.id ? 'pointer' : 'default' }}
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
                style={{ cursor: partido.teams?.away?.id ? 'pointer' : 'default' }}
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
            </div>
          </div>
          <button className="match-center-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Pestañas */}
        <div className="match-center-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`match-center-tab ${tabActiva === tab.id ? "activa" : ""}`}
              onClick={() => setTabActiva(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Contenido de las pestañas */}
        <div className="match-center-content">
          {tabActiva === "eventos" && partido.fixture?.id && (
            <EventosPartido fixtureId={partido.fixture.id} partido={partido} />
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
