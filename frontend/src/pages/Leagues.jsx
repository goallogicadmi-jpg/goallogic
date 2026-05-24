import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import Toast from "../components/Toast";
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from "../constants/sessionMessages";
import { obtenerLigas } from "../api/api";
import StandingsTable from "../components/StandingsTable";
import EquipoDetalle from "../components/EquipoDetalle";
import Partidos from "./Partidos";
import SimuladorApuestas from "./SimuladorApuestas";
import MiCuenta from "../components/MiCuenta/MiCuenta";
import Predicciones from "./Predicciones";
import PremiumRequired from "../components/PremiumRequired";
import CupCompetitionView from "../components/CupCompetition/CupCompetitionView";
import axios from "axios";
import {
  applyCatalogDisplay,
  getCompetitionsByDomainFromCatalog,
} from "../config/competitionCatalog";
import brandLogoUrl from "../assets/images/goal-logic-logo.png";

const clubCompetitionFallback = getCompetitionsByDomainFromCatalog("club").map((competition) =>
  applyCatalogDisplay({
    id: competition.id,
    name: competition.name,
    country: competition.country,
    logo: competition.logo,
  })
);
const ligasPrincipalesIds = clubCompetitionFallback.map((competition) => competition.id);

// Función para obtener temporada actual usando API (FUENTE PRINCIPAL)
const obtenerTemporadaActual = async (leagueId) => {
  try {
    console.log(`🔄 [obtenerTemporadaActual] Obteniendo temporada para liga ${leagueId} desde API...`);
    const response = await axios.get(`/api/league/seasons?leagueId=${leagueId}`);
    const seasons = response.data.seasons || [];
    
    // Prioridad 1: Temporada marcada como "current"
    const temporadaActual = seasons.find(s => s.current);
    if (temporadaActual) {
      console.log(`✅ [obtenerTemporadaActual] Temporada actual encontrada: ${temporadaActual.year}`);
      return temporadaActual.year.toString();
    }
    
    // Prioridad 2: Última temporada disponible (más reciente)
    if (seasons.length > 0) {
      const ultimaTemporada = seasons.sort((a, b) => b.year - a.year)[0];
      console.log(`⚠️ [obtenerTemporadaActual] No hay temporada 'current', usando última disponible: ${ultimaTemporada.year}`);
      return ultimaTemporada.year.toString();
    }
    
    // Fallback final: cálculo básico (solo si la API falla completamente)
    console.warn(`⚠️ [obtenerTemporadaActual] No hay temporadas disponibles, usando cálculo básico`);
    return calcularTemporadaBasica(leagueId);
  } catch (error) {
    console.warn("⚠️ [obtenerTemporadaActual] Error obteniendo temporada desde API, usando cálculo básico:", error);
    return calcularTemporadaBasica(leagueId);
  }
};

// Función de cálculo básico como fallback
const calcularTemporadaBasica = (leagueId) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  
  // Copas internacionales (febrero-noviembre)
  const copasInternacionales = [13, 11, 2, 848, 849]; // Libertadores, Sudamericana, Champions, Europa, Conference
  if (copasInternacionales.includes(leagueId)) {
    if (currentMonth >= 2 && currentMonth <= 11) {
      return currentYear.toString();
    } else {
      return (currentYear - 1).toString();
    }
  }
  
  // Ligas europeas (agosto-mayo)
  const ligasEuropeas = [140, 39, 135, 78, 61, 88, 94, 141, 40, 203, 235]; // Top ligas europeas + Rusia
  const ligasAmericasCalendario = [239, 71, 72, 262, 253]; // Colombia, Brasil, México, MLS
  if (ligasAmericasCalendario.includes(leagueId)) {
    return currentYear.toString();
  }
  if (ligasEuropeas.includes(leagueId)) {
    if (currentMonth >= 8) {
      return currentYear.toString();
    } else {
      return (currentYear - 1).toString();
    }
  }
  
  // Por defecto, año actual
  return currentYear.toString();
};

export default function Leagues() {
  const location = useLocation();
  const {
    isAuthenticated,
    loading: userLoading,
    user,
    isAdmin,
    isMainAdmin,
  } = useUser();
  const [prediccionesEmbedAuthToast, setPrediccionesEmbedAuthToast] = useState(false);
  const canAccessPredicciones =
    isAuthenticated &&
    (user?.premium === true || isAdmin || isMainAdmin);
  const prediccionesPaymentUserId = user?.user_id || user?.id;
  const initialState = location.state?.activeSection || (location.pathname === '/torneos' ? "torneos" : "ligas");
  const [activeSection, setActiveSection] = useState(initialState); // Usar estado de navegación si está disponible
  const [activeSubSection, setActiveSubSection] = useState("simulador"); // Subsección dentro de "Mi Proyecto"
  const [dropdownOpen, setDropdownOpen] = useState(true); // Abrir por defecto cuando está en sección ligas
  const [ligas, setLigas] = useState([]);
  const [loadingLigas, setLoadingLigas] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState("2024");
  const [loadingSeason, setLoadingSeason] = useState(false);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);

  // Leer el estado de navegación al montar o cuando cambia la ubicación
  useEffect(() => {
    if (location.state?.activeSection) {
      const section = location.state.activeSection;
      if (section === 'proyecto' || section === 'escuela') {
        setActiveSection(section);
        setDropdownOpen(false);
      }
    }
  }, [location.state]);

  // Escuchar eventos de cambio de sección desde el Layout (header) para compatibilidad
  useEffect(() => {
    const handleSectionChange = (event) => {
      const section = event.detail;
      if (section === 'proyecto' || section === 'escuela') {
        // Actualizar estado inmediatamente
        setActiveSection(section);
        setDropdownOpen(false);
      }
    };

    // Agregar listener inmediatamente al montar
    window.addEventListener('changeSection', handleSectionChange);
    
    return () => {
      window.removeEventListener('changeSection', handleSectionChange);
    };
  }, []);

  // Predicciones embebidas en /torneos requieren sesión (misma regla que /predicciones)
  useEffect(() => {
    if (userLoading || activeSection !== "predicciones") return;
    if (!isAuthenticated) {
      setActiveSection(location.pathname === "/torneos" ? "torneos" : "ligas");
      setPrediccionesEmbedAuthToast(true);
    }
  }, [userLoading, isAuthenticated, activeSection, location.pathname]);

  // Cargar ligas cuando se activa la sección ligas o torneos
  useEffect(() => {
    if ((activeSection === "ligas" || activeSection === "torneos") && ligas.length === 0) {
      setLoadingLigas(true);
      setDropdownOpen(true);
      console.log("🔄 Iniciando carga de ligas desde API...");
      
      obtenerLigas()
        .then(data => {
          console.log("📦 Datos recibidos en Leagues.jsx:", data);
          
          // Extraer las ligas de la respuesta usando filtrado híbrido
          let ligasDisponibles = [];
          
          if (data.response && Array.isArray(data.response)) {
            console.log("✅ Respuesta tiene array 'response' con", data.response.length, "competiciones");
            
            // Filtrar solo las ligas principales por ID (filtrado original)
            ligasDisponibles = data.response
              .filter(item => {
                const leagueId = item.league?.id;
                return leagueId && ligasPrincipalesIds.includes(leagueId);
              })
              .map((item) =>
                applyCatalogDisplay({
                  id: item.league.id,
                  name: item.league.name,
                  country: item.country?.name || item.country || "Unknown",
                  logo:
                    item.league.logo ||
                    `https://media.api-sports.io/football/leagues/${item.league.id}.png`,
                })
              )
              .sort((a, b) => a.name.localeCompare(b.name));
            
            console.log("✅ Ligas principales filtradas:", ligasDisponibles.length);
            console.log("📋 Ligas que se mostrarán:", ligasDisponibles.map(l => `${l.name} (${l.id})`));
          } else {
            console.warn("⚠️ Formato de respuesta no esperado, usando ligas por defecto");
            // Fallback: usar ligas hardcodeadas si la API no devuelve el formato esperado
            ligasDisponibles = clubCompetitionFallback;
          }
          
          if (ligasDisponibles.length > 0) {
            console.log("✅ Estableciendo", ligasDisponibles.length, "torneos filtrados en el estado");
            // IMPORTANTE: setLigas() recibe SOLO las competiciones filtradas
            // El render usará ligas.map() que mostrará SOLO estas competiciones
            setLigas(ligasDisponibles);
          } else {
            console.warn("⚠️ No se encontraron ligas principales, usando fallback");
            // Fallback final
            setLigas(clubCompetitionFallback);
          }
          
          setLoadingLigas(false);
        })
        .catch(err => {
          console.error("❌ Error cargando ligas:", err);
          console.error("❌ Detalles del error:", err.message, err.stack);
          
          // En caso de error, usar ligas por defecto
          console.log("🔄 Usando ligas por defecto debido a error");
          setLigas(clubCompetitionFallback);
          setLoadingLigas(false);
        });
    }
  }, [activeSection, ligas.length]);

  // Cerrar dropdown solo al hacer clic fuera del dropdown y del botón
  // Solo cuando activeSection === "ligas" o "torneos"
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && (activeSection === "ligas" || activeSection === "torneos")) {
        // Verificar si el clic fue fuera del dropdown y del botón
        const dropdown = document.querySelector('.dropdown-ligas');
        const button = event.target.closest('.nav-button');
        const leagueItem = event.target.closest('.league-logo-item');
        const isClickInDropdown = dropdown && dropdown.contains(event.target);
        const isClickInButton = button && button.contains(event.target);
        const isClickInLeagueItem = leagueItem && leagueItem.contains(event.target);
        
        // NO cerrar si el clic es en una liga o dentro del dropdown
        if (!isClickInDropdown && !isClickInButton && !isClickInLeagueItem) {
          // No cerrar el dropdown cuando está en sección ligas
          // setDropdownOpen(false);
        }
      }
    };
    
    if (dropdownOpen && (activeSection === "ligas" || activeSection === "torneos")) {
      // Usar un pequeño delay para evitar que se cierre inmediatamente
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [dropdownOpen, activeSection]);

  // Seleccionar automáticamente la primera liga cuando se cargan las ligas
  useEffect(() => {
    if (ligas.length > 0 && !selectedLeagueId && (activeSection === "ligas" || activeSection === "torneos")) {
      setSelectedLeagueId(ligas[0].id);
    }
  }, [ligas, selectedLeagueId, activeSection]);

  // Obtener temporada actual cuando se selecciona una liga
  useEffect(() => {
    if (selectedLeagueId) {
      console.log("🔄 Obteniendo temporada para torneo:", selectedLeagueId);
      setLoadingSeason(true);
      
      obtenerTemporadaActual(selectedLeagueId)
        .then(temporada => {
          console.log("✅ Temporada obtenida:", temporada);
          setSelectedSeason(temporada);
          setLoadingSeason(false);
        })
        .catch(error => {
          console.error("❌ Error obteniendo temporada:", error);
          setLoadingSeason(false);
        });
    }
  }, [selectedLeagueId]);

  const handleLeagueSelect = (leagueId, e) => {
    e.stopPropagation(); // Prevenir propagación
    console.log("🔵 Liga seleccionada:", leagueId);
    setSelectedLeagueId(leagueId);
    // NO resetear temporada aquí - el useEffect se encargará de obtener la correcta
    setLoadingSeason(true);
    // NO cerrar el dropdown - debe permanecer abierto
    // setDropdownOpen(false); // ELIMINADO - el dropdown debe permanecer visible
  };

  const handleLigasClick = (e) => {
    e.stopPropagation();
    setActiveSection("ligas");
    setDropdownOpen(true);
    // Si no hay liga seleccionada, seleccionar la primera disponible
    if (!selectedLeagueId && ligas.length > 0) {
      setSelectedLeagueId(ligas[0].id);
    }
  };

  const handleSectionChange = (section, e) => {
    e.stopPropagation();
    setActiveSection(section);
    if (section !== "ligas" && section !== "torneos") {
      setDropdownOpen(false);
    }
  };

  // Detectar si la competición seleccionada es una copa
  const torneoSeleccionado = ligas.find(t => t.id === selectedLeagueId);
  const esCopa = torneoSeleccionado?.type === 'Cup' || torneoSeleccionado?.type === 'Tournament';
  const esCopaConGrupos = esCopa && [13, 11, 848, 849].includes(selectedLeagueId); // Libertadores, Sudamericana, Europa, Conference

  // NOTA: La navegación del header ahora se maneja en Layout.jsx
  // Este efecto se ha eliminado para evitar conflictos con el Layout

  return (
    <>
      <style>{`
        .page-wrapper {
          width: 100%;
          min-height: 100vh;
          background: var(--bg-main);
          display: flex;
          flex-direction: column;
          align-items: stretch;
          position: relative;
          overflow: visible;
        }
        .header-title {
          width: 100%;
          text-align: center;
          font-size: var(--font-size-2xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          padding: var(--spacing-xl) 0;
          letter-spacing: 1px;
        }
        .floating-bar {
          display: none; /* Ocultar la barra flotante original */
        }
        /* Estilos de navegación movidos a Layout.jsx para evitar duplicación */
        .leagues-bar-container {
          width: 100%;
          background: var(--bg-secondary);
          padding: var(--spacing-md) var(--spacing-xl);
          border-bottom: 1px solid var(--border-color);
        }
        .dropdown-ligas-logos {
          display: flex;
          gap: var(--spacing-md);
          overflow-x: auto;
          padding: var(--spacing-sm) 0;
        }
        .league-logo-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--spacing-sm);
          min-width: 80px;
          cursor: pointer;
          padding: var(--spacing-sm);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          transition: all 0.2s;
        }
        .league-logo-item:hover {
          background: var(--bg-card);
          border-color: var(--accent-orange);
          transform: translateY(-3px);
          box-shadow: 0 0 12px rgba(242,138,0,0.5);
        }
        .league-logo-item.selected {
          background: var(--bg-card);
          border: 2px solid var(--accent-orange);
        }
        .league-logo-item img {
          width: 20px;
          height: 20px;
          object-fit: contain;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .league-logo-item:hover img,
        .league-logo-item.selected img {
          opacity: 1;
        }
        .league-logo-name {
          font-size: var(--font-size-xs);
          color: var(--text-secondary);
          text-align: center;
          font-weight: var(--font-weight-medium);
        }
        .league-logo-country {
          font-size: 9px;
          color: var(--text-secondary);
          text-align: center;
        }
        .loading-ligas {
          text-align: center;
          padding: var(--spacing-lg);
          color: var(--text-secondary);
        }
        .standings-table-container {
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
          padding: 80px var(--spacing-xl);
          overflow: visible;
          min-height: auto;
        }
        .section-content {
          width: 100%;
          padding: 80px var(--spacing-xl);
          text-align: center;
          color: var(--text-secondary);
        }
        .proyecto-container {
          width: 100%;
        }
        .proyecto-tabs {
          display: flex;
          gap: var(--spacing-sm);
          justify-content: center;
          margin-bottom: var(--spacing-xl);
          padding: 0 var(--spacing-lg);
          flex-wrap: wrap;
        }
        .proyecto-tab {
          padding: var(--spacing-sm) var(--spacing-md);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-md);
          cursor: pointer;
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          transition: all 0.2s ease;
          font-family: var(--font-family);
        }
        .proyecto-tab:hover {
          border-color: var(--accent-orange);
          background: var(--bg-card);
          color: var(--text-primary);
          box-shadow: 0 0 12px rgba(242,138,0,0.5);
          transform: translateY(-2px);
        }
        .proyecto-tab.active {
          background: var(--bg-card);
          border-color: var(--accent-orange);
          color: var(--text-primary);
          font-weight: var(--font-weight-semibold);
        }
        .hero-logo-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px var(--spacing-xl);
          text-align: center;
          min-height: 60vh;
        }
        .hero-logo-full {
          max-width: 400px;
          width: 100%;
          height: auto;
          margin-bottom: var(--spacing-xl);
          filter: drop-shadow(0 10px 30px rgba(242,138,0,0.3));
        }
        .hero-title {
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, #F28A00 0%, #D4A017 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--spacing-md);
          letter-spacing: 2px;
        }
        .hero-subtitle {
          font-size: 20px;
          color: var(--text-secondary);
          font-weight: 400;
        }
      `}</style>
      <div className="page-wrapper">

        {/* Barra de ligas - Solo cuando activeSection === "ligas" o "torneos" */}
        {(activeSection === "ligas" || activeSection === "torneos") && (
          <div className="leagues-bar-container">
            {loadingLigas ? (
              <div className="loading-ligas">Cargando ligas...</div>
            ) : ligas.length > 0 ? (
              <div className="dropdown-ligas-logos">
                {ligas.map((liga) => (
                  <div
                    key={liga.id}
                    className={`league-logo-item ${selectedLeagueId === liga.id ? 'selected' : ''}`}
                    onClick={(e) => handleLeagueSelect(liga.id, e)}
                  >
                    <img
                      src={liga.logo}
                      alt={liga.name}
                      loading="lazy"
                      decoding="async"
                      width={48}
                      height={48}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="league-logo-name">{liga.name}</div>
                    <div className="league-logo-country">{liga.country}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading-ligas">No hay ligas disponibles</div>
            )}
          </div>
        )}

        {/* Renderizar contenido según la sección activa */}
        {(activeSection === "ligas" || activeSection === "torneos") && (
          <>
            {!equipoSeleccionado ? (
              <>
                {/* Logo completo en página principal - Solo cuando no hay liga seleccionada */}
                {!selectedLeagueId && (
                  <div className="hero-logo-section">
                    <img
                      src={brandLogoUrl}
                      alt="GoalLogic Logo"
                      className="hero-logo-full"
                      width={400}
                      height={400}
                      decoding="async"
                      fetchPriority="high"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <p className="hero-subtitle">Análisis y Predicciones de Fútbol</p>
                  </div>
                )}
                {/* Header Premium de Competición */}
                {selectedLeagueId && torneoSeleccionado && (
                  <div className="competition-header" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '20px var(--spacing-xl) 10px',
                    maxWidth: '900px',
                    margin: '0 auto'
                  }}>
                    {torneoSeleccionado.logo && (
                      <img
                        src={torneoSeleccionado.logo}
                        alt={torneoSeleccionado.name}
                        className="competition-logo"
                        loading="lazy"
                        decoding="async"
                        width={38}
                        height={38}
                        style={{
                          width: '38px',
                          height: '38px',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.4))'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    <h1 className="competition-title" style={{
                      fontSize: '1.8rem',
                      fontWeight: '700',
                      color: 'var(--text-primary)',
                      letterSpacing: '0.4px',
                      margin: 0
                    }}>
                      {torneoSeleccionado.name}
                    </h1>
                  </div>
                )}
                {/* Tabla de posiciones centrada */}
                {selectedLeagueId && selectedSeason && !loadingSeason && (
                  <div className="standings-table-container">
                    {esCopaConGrupos ? (
                      <CupCompetitionView 
                        competitionId={parseInt(selectedLeagueId)}
                        season={selectedSeason}
                        competitionInfo={torneoSeleccionado}
                        onTeamSelect={(teamId) => setEquipoSeleccionado(teamId)}
                      />
                    ) : (
                      <StandingsTable 
                        leagueId={parseInt(selectedLeagueId)} 
                        season={selectedSeason}
                        onTeamClick={(teamId) => setEquipoSeleccionado(teamId)}
                        leagueInfo={torneoSeleccionado}
                        isCup={esCopa}
                      />
                    )}
                  </div>
                )}
                {selectedLeagueId && loadingSeason && (
                  <div className="section-content">
                    Cargando temporada...
                  </div>
                )}
              </>
            ) : (
              <EquipoDetalle 
                teamId={equipoSeleccionado} 
                onBack={() => setEquipoSeleccionado(null)}
              />
            )}
          </>
        )}

        {activeSection === "proyecto" && (
          <MiCuenta />
        )}

        {activeSection === "escuela" && (
          <div className="section-content">
            <h2>Comunidad</h2>
            <p>Contenido de Comunidad</p>
          </div>
        )}

        {activeSection === "predicciones" && isAuthenticated && canAccessPredicciones && (
          <Predicciones />
        )}

        {activeSection === "predicciones" && isAuthenticated && !canAccessPredicciones && (
          <div className="section-content" style={{ maxWidth: 560, margin: "0 auto" }}>
            <PremiumRequired userId={prediccionesPaymentUserId} />
          </div>
        )}

        {activeSection === "partidos" && (
          <Partidos />
        )}
      </div>

      {prediccionesEmbedAuthToast && (
        <Toast
          message={SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE}
          type="warning"
          duration={SESSION_REQUIRED_TOAST_DURATION_MS}
          onClose={() => setPrediccionesEmbedAuthToast(false)}
        />
      )}
    </>
  );
}
