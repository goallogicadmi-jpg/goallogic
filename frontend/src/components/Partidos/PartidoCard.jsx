import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import BadgeEstado from "./BadgeEstado";
import PrediccionesCard from "./PrediccionesCard";
import { getMatchPredictions } from "../../api/api";
import {
  esPartidoFavorito,
  esEquipoFavorito,
  esLigaFavorita,
  agregarEquipoFavorito,
  quitarEquipoFavorito,
  agregarLigaFavorito,
  quitarLigaFavorito,
  invalidarCacheFavoritos,
} from "../../utils/favoritos";
import "../../styles/partidos.css";

/**
 * PartidoCard - Tarjeta individual de un partido
 * @param {Object} partido - Datos del partido
 * @param {Function} onClick - Función al hacer clic en la tarjeta
 * @param {Function} onFavoritoChange - Función callback cuando cambia un favorito
 */
// Caché global para predicciones (compartido entre todas las instancias)
const cachePredicciones = {};

function PartidoCard({ 
  partido, 
  onClick, 
  onFavoritoChange,
  domain = "club",
  onPrediccionesClick,
}) {
  if (!partido.fixture || !partido.teams) return null;

  const [esFavorito, setIsFavorito] = useState(false);
  const [predicciones, setPredicciones] = useState(null);
  const [cargandoPredicciones, setCargandoPredicciones] = useState(false);
  const [errorPredicciones, setErrorPredicciones] = useState(null);
  const [mostrarPredicciones, setMostrarPredicciones] = useState(false);
  const [perfilPrediccion, setPerfilPrediccion] = useState('balanceado');

  // Obtener fixtureId de forma memoizada
  const fixtureId = useMemo(() => partido.fixture?.id, [partido.fixture?.id]);

  useEffect(() => {
    // Cargar estado de favorito de forma asíncrona
    const checkFavorito = async () => {
      try {
        const esFav = await esPartidoFavorito(partido);
        setIsFavorito(esFav);
      } catch (error) {
        console.error("Error verificando favorito:", error);
        setIsFavorito(false);
      }
    };
    
    checkFavorito();
    
    // Limpiar predicciones cuando cambia el partido
    if (fixtureId && cachePredicciones[fixtureId]) {
      setPredicciones(cachePredicciones[fixtureId]);
      setMostrarPredicciones(false);
    } else {
      setPredicciones(null);
      setMostrarPredicciones(false);
    }
  }, [partido, fixtureId]);

  // Memoizar funciones de formateo
  const formatearFecha = useCallback((fechaISO) => {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const obtenerHora = useCallback((fechaISO) => {
    if (!fechaISO) return null;
    return new Date(fechaISO).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }, []);

  // Memoizar valores calculados
  const fechaPartido = useMemo(() => formatearFecha(partido.fixture?.date), [partido.fixture?.date, formatearFecha]);
  const horaPartido = useMemo(() => obtenerHora(partido.fixture?.date), [partido.fixture?.date, obtenerHora]);
  const tieneResultado = useMemo(() => 
    partido.goals?.home !== null && partido.goals?.away !== null,
    [partido.goals?.home, partido.goals?.away]
  );
  const estado = useMemo(() => partido.fixture?.status?.short || "NS", [partido.fixture?.status?.short]);

  const handleFavoritoClick = useCallback(async (e) => {
    e.stopPropagation(); // Evitar que se abra el modal

    const equipoLocalId = partido.teams?.home?.id;
    const equipoVisitanteId = partido.teams?.away?.id;
    const ligaId = partido.league?.id;

    try {
      if (esFavorito) {
        // Quitar de favoritos
        const promises = [];
        
        if (equipoLocalId) {
          const esFav = await esEquipoFavorito(equipoLocalId);
          if (esFav) {
            promises.push(quitarEquipoFavorito(equipoLocalId));
          }
        }
        if (equipoVisitanteId) {
          const esFav = await esEquipoFavorito(equipoVisitanteId);
          if (esFav) {
            promises.push(quitarEquipoFavorito(equipoVisitanteId));
          }
        }
        if (ligaId) {
          const esFav = await esLigaFavorita(ligaId);
          if (esFav) {
            promises.push(quitarLigaFavorito(ligaId));
          }
        }
        
        await Promise.all(promises);
      } else {
        // Agregar a favoritos (prioridad: liga > equipos)
        if (ligaId) {
          await agregarLigaFavorito(ligaId);
        } else {
          const promises = [];
          if (equipoLocalId) promises.push(agregarEquipoFavorito(equipoLocalId));
          if (equipoVisitanteId) promises.push(agregarEquipoFavorito(equipoVisitanteId));
          await Promise.all(promises);
        }
      }

      // Invalidar cache para que otros componentes se actualicen
      invalidarCacheFavoritos();
      
      setIsFavorito(!esFavorito);
      if (onFavoritoChange) onFavoritoChange();
    } catch (error) {
      console.error("Error actualizando favoritos:", error);
      // No cambiar el estado si hay error
    }
  }, [esFavorito, partido, onFavoritoChange]);

  // Función para cargar predicciones (reutilizable)
  const cargarPredicciones = useCallback(async (perfil = perfilPrediccion) => {
    if (!fixtureId) {
      setErrorPredicciones("No se pudo obtener el ID del partido");
      return;
    }

    // Verificar caché primero (incluyendo perfil)
    const cacheKey = `${fixtureId}_${perfil}`;
    if (cachePredicciones[cacheKey]) {
      setPredicciones(cachePredicciones[cacheKey]);
      setMostrarPredicciones(true);
      setErrorPredicciones(null);
      return;
    }

    setCargandoPredicciones(true);
    setErrorPredicciones(null);

    try {
      const data = await getMatchPredictions(fixtureId, perfil);
      
      // Verificar que los datos tengan la estructura esperada
      if (data && (data.prob_local !== undefined || data.probabilidad_local !== undefined)) {
        // Normalizar nombres de propiedades (por si vienen con nombres diferentes)
        const prediccionesNormalizadas = {
          prob_local: data.prob_local ?? data.probabilidad_local ?? 0,
          prob_empate: data.prob_empate ?? data.probabilidad_empate ?? 0,
          prob_visita: data.prob_visita ?? data.probabilidad_visita ?? 0,
          goles_local: data.goles_local ?? data.golesLocal ?? 0,
          goles_visita: data.goles_visita ?? data.golesVisita ?? 0,
          recomendacion: data.recomendacion ?? data.recomendation ?? null,
          metricas_avanzadas: data.metricas_avanzadas ?? null,
          profile: data.profile ?? perfil,
        };
        
        // Guardar en caché con clave que incluye perfil
        cachePredicciones[cacheKey] = prediccionesNormalizadas;
        setPredicciones(prediccionesNormalizadas);
        setMostrarPredicciones(true);
      } else {
        setErrorPredicciones("Formato de datos inesperado");
      }
    } catch (error) {
      console.error("Error obteniendo predicciones:", error);
      setErrorPredicciones("No se pudieron cargar las predicciones");
    } finally {
      setCargandoPredicciones(false);
    }
  }, [fixtureId, perfilPrediccion]);

  const handlePrediccionesClick = useCallback(async (e) => {
    e.stopPropagation(); // Evitar que se abra el modal

    if (onPrediccionesClick) {
      onPrediccionesClick(partido);
    } else {
      setErrorPredicciones("No se pudieron obtener los datos de los equipos");
    }
  }, [onPrediccionesClick, partido]);

  // Efecto para recargar cuando cambia el perfil
  useEffect(() => {
    if (mostrarPredicciones && fixtureId) {
      cargarPredicciones(perfilPrediccion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfilPrediccion]); // Solo cuando cambia el perfil


  return (
    <div className={`partido-card ${esFavorito ? "favorito" : ""}`} onClick={onClick}>
      <div className="partido-card-header">
        <div className="partido-card-info">
          <div>
            <p className="partido-card-competicion">
              {partido.league?.name || "Competición"}
            </p>
            <p className="partido-card-fecha">{fechaPartido}</p>
          </div>
        </div>
        <div className="partido-card-header-right">
          <BadgeEstado estado={estado} />
          <button
            className={`favorito-button ${esFavorito ? "activo" : ""}`}
            onClick={handleFavoritoClick}
            title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            {esFavorito ? "⭐" : "☆"}
          </button>
        </div>
      </div>

      <div className="partido-card-body">
        <div className="partido-card-equipo">
          {partido.teams.home?.logo && (
            <img 
              src={partido.teams.home.logo} 
              alt={partido.teams.home.name || "Equipo local"} 
              className="logo-equipo"
            />
          )}
          <span>{partido.teams.home?.name || "N/A"}</span>
        </div>
        <div className="partido-card-center">
          {horaPartido && (
            <span className="partido-card-hora">{horaPartido}</span>
          )}
          <span
            className={`partido-card-resultado ${
              !tieneResultado ? "pendiente" : ""
            }`}
          >
            {tieneResultado
              ? `${partido.goals.home} - ${partido.goals.away}`
              : "vs"}
          </span>
        </div>
        <div className="partido-card-equipo away">
          <span>{partido.teams.away?.name || "N/A"}</span>
          {partido.teams.away?.logo && (
            <img 
              src={partido.teams.away.logo} 
              alt={partido.teams.away.name || "Equipo visitante"} 
              className="logo-equipo"
            />
          )}
        </div>
        {/* Botón de Predicciones - Movido a la derecha */}
        <div className="partido-card-actions">
          <button
            className="predicciones-button"
            onClick={handlePrediccionesClick}
            disabled={cargandoPredicciones}
          >
            GoalLogic Predic
          </button>
        </div>
      </div>

      {/* Spinner de carga */}
      {cargandoPredicciones && (
        <div style={{ textAlign: "center", padding: "12px", marginTop: "8px" }}>
          <div
            style={{
              display: "inline-block",
              width: "20px",
              height: "20px",
              border: "3px solid #2A313D",
              borderTopColor: "#F28A00",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Mensaje de error */}
      {errorPredicciones && !cargandoPredicciones && (
        <div
          style={{
            backgroundColor: "#1A1A1A",
            color: "#EF4444",
            padding: "12px",
            borderRadius: "6px",
            marginTop: "8px",
            fontSize: "13px",
            textAlign: "center",
            border: "1px solid #EF4444",
          }}
        >
          {errorPredicciones}
        </div>
      )}

      {/* Componente de Predicciones con animación */}
      <div
        style={{
          maxHeight: mostrarPredicciones && predicciones ? "1000px" : "0",
          opacity: mostrarPredicciones && predicciones ? 1 : 0,
          overflow: "hidden",
          transition: "opacity 250ms ease-in-out, max-height 300ms ease-in-out",
          marginTop: mostrarPredicciones && predicciones ? "12px" : "0",
        }}
      >
        {predicciones && !cargandoPredicciones && !errorPredicciones && (
          <PrediccionesCard 
            {...predicciones}
            perfil={perfilPrediccion}
            fixtureId={fixtureId}
            onPerfilChange={(nuevoPerfil) => {
              setPerfilPrediccion(nuevoPerfil);
            }}
          />
        )}
      </div>
    </div>
  );
}

export default React.memo(PartidoCard);
