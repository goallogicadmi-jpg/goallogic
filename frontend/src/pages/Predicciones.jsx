import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import EstadisticasAvanzadasEquipo from "../components/EstadisticasAvanzadasEquipo";
import { cruzarDatosEquipos } from "../utils/cruzarDatosEquipos";
import {
  getH2H,
  getTeamInjuries,
  getTeamStats,
  getTeamPlayersStats,
  getTeamFixtures,
  getUpcomingFixtureWithOdds
} from "../api/api";
import { 
  procesarCornersDeFixtures, 
  expectedCorners,
  procesarTarjetasDeFixtures,
  expectedCards
} from "../utils/calcularCorners";
import { tokens } from "../styles/tokens";
import {
  ADVANCED_METRIC_LABELS as ML,
  ADVANCED_METRIC_LABEL_CLASS,
  getAdvancedMetricLabelStyle,
} from "../constants/advancedMetricLabels";
import {
  resolveDisplayXg,
  resolveDisplayXga,
  formatXgPromedioLabel,
  formatXgaPromedioLabel,
} from "../utils/xgDisplayUtils";
import "../styles/predicciones.css";
import { GoalLogicTitle } from "../components/GoalLogicTitle";
// Componentes visuales reorganizados (solo presentación)
import ResumenEjecutivo from "../components/Predicciones/ResumenEjecutivo";
import ComparacionConTabs from "../components/Predicciones/ComparacionConTabs";
import FichaEquipoSimplificada from "../components/Predicciones/FichaEquipoSimplificada";
import DatosAdicionales from "../components/Predicciones/DatosAdicionales";
import LesionadosEquipo from "../components/Predicciones/LesionadosEquipo";
import { enrichTeamInjuries } from "../utils/evaluateInjuryImpact";
import { buildH2HDisplayData } from "../utils/h2hFixturesUtils";
import PrediccionesSectionTitle from "../components/Predicciones/PrediccionesSectionTitle";
import { IconPanoramaEquipo } from "../components/Predicciones/PrediccionesIcons";
import { PREDICCIONES_TITLES } from "../constants/prediccionesSectionTitles";
import { buildConclusionesComparativaEquipos } from "../utils/conclusionesCopy";
import {
  fetchPredictionsLeagues,
  getLeagueSeasonMode,
  getPredictionsLeaguesFromCatalog,
} from "../utils/predictionsCatalog";

function getDefaultEuropeanSeasonString() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const seasonYear = currentMonth >= 8 ? currentYear : currentYear - 1;
  return seasonYear.toString();
}

function normalizeRoutePredictionDomain(raw) {
  return raw === "selection" ? "selection" : "club";
}

function getCalendarYearSeasonFallback() {
  return String(new Date().getFullYear());
}

async function fetchPreferredSeasonYearForLeague(leagueId) {
  const seasonMode = getLeagueSeasonMode(leagueId);
  const calendarFallback = getCalendarYearSeasonFallback();
  const europeanFallback = getDefaultEuropeanSeasonString();

  try {
    const { data } = await axios.get(`/api/league/seasons?leagueId=${leagueId}`);
    const seasons = data?.seasons;
    if (!Array.isArray(seasons) || seasons.length === 0) {
      return seasonMode === "calendar_year" ? calendarFallback : europeanFallback;
    }
    const current = seasons.find((s) => s.current === true);
    if (current?.year != null) return String(current.year);
    const maxYear = Math.max(...seasons.map((s) => Number(s.year) || 0));
    if (maxYear > 0) return String(maxYear);
    return seasonMode === "calendar_year" ? calendarFallback : europeanFallback;
  } catch {
    try {
      const { data } = await axios.get(`/api/league-info/${leagueId}`);
      const entry = data?.response?.[0];
      const seasons = entry?.seasons;
      if (Array.isArray(seasons) && seasons.length > 0) {
        const current = seasons.find((s) => s.current === true);
        if (current?.year != null) return String(current.year);
        const maxYear = Math.max(...seasons.map((s) => Number(s.year) || 0));
        if (maxYear > 0) return String(maxYear);
      }
    } catch {
      // ignore
    }
    return seasonMode === "calendar_year" ? calendarFallback : europeanFallback;
  }
}

export default function Predicciones() {
  const location = useLocation();
  const { homeTeam, awayTeam, leagueId, season: routeSeason, fixtureId: routeFixtureId, domain: routeDomainRaw } = location.state || {};
  const routePredictionDomain = normalizeRoutePredictionDomain(routeDomainRaw);

  // Estados para ligas (global)
  const [ligas, setLigas] = useState([]);
  const [ligasLoading, setLigasLoading] = useState(false);
  const [predictionDomain, setPredictionDomain] = useState(routePredictionDomain);
  const skipPredictionDomainResetOnce = useRef(true);

  // Estados para equipo local
  const [ligaLocal, setLigaLocal] = useState(null);
  const [equiposLocal, setEquiposLocal] = useState([]);
  const [equipoLocal, setEquipoLocal] = useState(null);

  // Estados para equipo visitante
  const [ligaVisitante, setLigaVisitante] = useState(null);
  const [equiposVisitante, setEquiposVisitante] = useState([]);
  const [equipoVisitante, setEquipoVisitante] = useState(null);

  // Flag para controlar si ya se ejecutó el análisis automático
  const [analisisAutomaticoEjecutado, setAnalisisAutomaticoEjecutado] = useState(false);
  const [analisisAutomaticoIniciado, setAnalisisAutomaticoIniciado] = useState(false);

  // Estados para el módulo de predicciones (mantener compatibilidad con código anterior)
  const [ligaA, setLigaA] = useState(null);
  const [equiposA, setEquiposA] = useState([]);
  const [equipoA, setEquipoA] = useState(null);
  const [ligaB, setLigaB] = useState(null);
  const [equiposB, setEquiposB] = useState([]);
  const [equipoB, setEquipoB] = useState(null);

  // Estados generales (mantenidos para futura reconstrucción)
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Estado para datos adicionales reales (FASE 2)
  const [datosAdicionales, setDatosAdicionales] = useState(null);

  const ligasFetchSeqRef = useRef(0);

  const ligasInDomain = useMemo(
    () => ligas.filter((l) => l.domain === predictionDomain),
    [ligas, predictionDomain]
  );

  // Cargar ligas desde /api/predicciones/ligas (catálogo + API).
  useEffect(() => {
    const domainLocked = predictionDomain;
    const seq = ++ligasFetchSeqRef.current;
    let ignore = false;

    setLigasLoading(true);
    setLigas([]);

    fetchPredictionsLeagues(domainLocked)
      .then((normalized) => {
        if (ignore || ligasFetchSeqRef.current !== seq) return;
        setLigas(normalized);
      })
      .catch((err) => {
        if (ignore || ligasFetchSeqRef.current !== seq) return;
        console.error("Error cargando ligas:", err);
        setLigas(getPredictionsLeaguesFromCatalog(domainLocked));
      })
      .finally(() => {
        if (!ignore && ligasFetchSeqRef.current === seq) {
          setLigasLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [predictionDomain]);

  // Al cambiar de Clubes / Selecciones, limpiar selección y resultados (no en el primer montaje)
  useEffect(() => {
    if (skipPredictionDomainResetOnce.current) {
      skipPredictionDomainResetOnce.current = false;
      return;
    }
    setLigaLocal(null);
    setLigaVisitante(null);
    setEquipoLocal(null);
    setEquipoVisitante(null);
    setEquiposLocal([]);
    setEquiposVisitante([]);
    setResultados(null);
    setDatosAdicionales(null);
    setError(null);
    setAnalisisAutomaticoEjecutado(false);
    setAnalisisAutomaticoIniciado(false);
    setLoading(false);
  }, [predictionDomain]);

  // Cargar equipos cuando cambia ligaLocal
  useEffect(() => {
    if (!ligaLocal) {
      setEquiposLocal([]);
      return;
    }
    const ac = new AbortController();
    const leagueIdLocked = ligaLocal;
    const url =
      predictionDomain === "selection"
        ? `/api/ligas/${leagueIdLocked}/equipos?domain=selection`
        : `/api/ligas/${leagueIdLocked}/equipos`;
    axios
      .get(url, { signal: ac.signal })
      .then((res) => {
        if (ac.signal.aborted) return;
        if (res.data && res.data.success && Array.isArray(res.data.equipos)) {
          setEquiposLocal(res.data.equipos);
        } else {
          setEquiposLocal([]);
        }
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
        console.error("Error cargando equipos de Liga Local:", err);
        setEquiposLocal([]);
      });
    return () => ac.abort();
  }, [ligaLocal, predictionDomain]);

  // Cargar equipos cuando cambia ligaVisitante
  useEffect(() => {
    if (!ligaVisitante) {
      setEquiposVisitante([]);
      return;
    }
    const ac = new AbortController();
    const leagueIdLocked = ligaVisitante;
    const url =
      predictionDomain === "selection"
        ? `/api/ligas/${leagueIdLocked}/equipos?domain=selection`
        : `/api/ligas/${leagueIdLocked}/equipos`;
    axios
      .get(url, { signal: ac.signal })
      .then((res) => {
        if (ac.signal.aborted) return;
        if (res.data && res.data.success && Array.isArray(res.data.equipos)) {
          setEquiposVisitante(res.data.equipos);
        } else {
          setEquiposVisitante([]);
        }
      })
      .catch((err) => {
        if (err.code === "ERR_CANCELED" || err.name === "CanceledError") return;
        console.error("Error cargando equipos de Liga Visitante:", err);
        setEquiposVisitante([]);
      });
    return () => ac.abort();
  }, [ligaVisitante, predictionDomain]);

  // Sincronizar con estados antiguos para compatibilidad
  useEffect(() => {
    setLigaA(ligaLocal);
    setEquiposA(equiposLocal);
    setEquipoA(equipoLocal);
  }, [ligaLocal, equiposLocal, equipoLocal]);

  useEffect(() => {
    setLigaB(ligaVisitante);
    setEquiposB(equiposVisitante);
    setEquipoB(equipoVisitante);
  }, [ligaVisitante, equiposVisitante, equipoVisitante]);

  // Limpiar equipoLocal cuando cambia ligaLocal (solo si no es carga automática)
  useEffect(() => {
    if (!analisisAutomaticoEjecutado) {
      setEquipoLocal(null);
      setResultados(null);
      setError(null);
    }
  }, [ligaLocal, analisisAutomaticoEjecutado]);

  // Limpiar equipoVisitante cuando cambia ligaVisitante (solo si no es carga automática)
  useEffect(() => {
    if (!analisisAutomaticoEjecutado) {
      setEquipoVisitante(null);
      setResultados(null);
      setError(null);
    }
  }, [ligaVisitante, analisisAutomaticoEjecutado]);

  // Efecto para cargar automáticamente equipos desde el state (cuando se navega desde PartidoCard)
  useEffect(() => {
    if (homeTeam && awayTeam && leagueId && ligasInDomain.length > 0 && !analisisAutomaticoEjecutado) {
      const stateDomain = normalizeRoutePredictionDomain(routeDomainRaw);
      if (stateDomain !== predictionDomain) {
        return;
      }
      // Convertir leagueId a número si es necesario
      const leagueIdNum = typeof leagueId === 'string' ? parseInt(leagueId, 10) : leagueId;
      
      // Verificar que la liga existe en la lista de ligas disponibles
      const ligaEncontrada = ligasInDomain.find(liga => liga.id === leagueIdNum);
      
      if (ligaEncontrada && ligaEncontrada.domain === predictionDomain) {
        // Establecer la misma liga para ambos equipos (asumiendo que juegan en la misma liga)
        setLigaLocal(leagueIdNum);
        setLigaVisitante(leagueIdNum);
        setAnalisisAutomaticoEjecutado(true);
      } else {
        console.warn(`⚠️ Liga con ID ${leagueIdNum} no encontrada en la lista de ligas disponibles`);
        setError(`La liga del partido (ID: ${leagueIdNum}) no está disponible en el sistema.`);
      }
    }
  }, [homeTeam, awayTeam, leagueId, ligasInDomain, analisisAutomaticoEjecutado, predictionDomain, routeDomainRaw]);

  // Efecto para seleccionar equipos automáticamente cuando se cargan los equipos
  useEffect(() => {
    if (homeTeam && awayTeam && equiposLocal.length > 0 && equiposVisitante.length > 0 && analisisAutomaticoEjecutado && !equipoLocal && !equipoVisitante) {
      // Buscar el equipo local en la lista de equipos
      const equipoLocalEncontrado = equiposLocal.find(eq => eq.id === homeTeam.id);
      const equipoVisitanteEncontrado = equiposVisitante.find(eq => eq.id === awayTeam.id);

      if (equipoLocalEncontrado && equipoVisitanteEncontrado) {
        setEquipoLocal(equipoLocalEncontrado);
        setEquipoVisitante(equipoVisitanteEncontrado);
      }
    }
  }, [homeTeam, awayTeam, equiposLocal, equiposVisitante, analisisAutomaticoEjecutado, equipoLocal, equipoVisitante]);

  // Efecto para ejecutar automáticamente el análisis cuando ambos equipos estén seleccionados
  useEffect(() => {
    if (equipoLocal && equipoVisitante && analisisAutomaticoEjecutado && !loading && !resultados && !analisisAutomaticoIniciado) {
      // Marcar que se inició el análisis automático para evitar múltiples ejecuciones
      setAnalisisAutomaticoIniciado(true);
      // Ejecutar el análisis automáticamente
      handleAnalizar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equipoLocal, equipoVisitante, analisisAutomaticoEjecutado, loading, resultados, analisisAutomaticoIniciado]);

  // Función para manejar el análisis
  const handleAnalizar = async () => {
    // Validar que todos los datos estén seleccionados
    if (!ligaA || !equipoA || !ligaB || !equipoB) {
      setError("Por favor, selecciona ambos equipos antes de analizar.");
      return;
    }

    // Obtener los objetos completos de las ligas seleccionadas
    const ligaACompleta = ligasInDomain.find(l => l.id === ligaA);
    const ligaBCompleta = ligasInDomain.find(l => l.id === ligaB);

    if (!ligaACompleta || !ligaBCompleta) {
      setError("No se pudieron obtener los datos completos de las ligas.");
      return;
    }

    const domainA = ligaACompleta.domain;
    const domainB = ligaBCompleta.domain;
    if (domainA !== predictionDomain || domainB !== predictionDomain) {
      setError("Las competiciones elegidas no corresponden al modo Clubes o Selecciones activo.");
      return;
    }

    // Activar estado de carga
    setLoading(true);
    setError(null);
    setResultados(null);
    setDatosAdicionales(null);

    const [statsSeasonA, statsSeasonB] = await Promise.all([
      routeSeason != null ? Promise.resolve(String(routeSeason)) : fetchPreferredSeasonYearForLeague(ligaA),
      routeSeason != null ? Promise.resolve(String(routeSeason)) : fetchPreferredSeasonYearForLeague(ligaB),
    ]);

    try {
      // Cargar datos detallados de ambos equipos en paralelo
      const [responseA, responseB] = await Promise.all([
        axios.get(`/api/equipos/${equipoA.id}/detalle?leagueId=${ligaA}&season=${statsSeasonA}`),
        axios.get(`/api/equipos/${equipoB.id}/detalle?leagueId=${ligaB}&season=${statsSeasonB}`)
      ]);

      if (responseA.data.success && responseB.data.success) {
        const datosEquipoA = responseA.data.equipo;
        const datosEquipoB = responseB.data.equipo;

        // Cruzar datos de ambos equipos para generar predicciones
        const predicciones = cruzarDatosEquipos(datosEquipoA, datosEquipoB);

        // Guardar los datos completos en el estado resultados
        setResultados({
          ligaA: ligaACompleta,
          equipoA: datosEquipoA,
          ligaB: ligaBCompleta,
          equipoB: datosEquipoB,
          predicciones
        });

        // ============================================
        // FASE 2: OBTENER DATOS ADICIONALES REALES
        // ============================================
        try {
          // 0. Buscar fixture próximo y odds (probabilidades del mercado)
          let fixtureConOdds = null;
          try {
            fixtureConOdds = await getUpcomingFixtureWithOdds(equipoA.id, equipoB.id, {
              leagueId: ligaA,
              season: statsSeasonA,
              fixtureId: routeFixtureId ?? null,
            });
          } catch (err) {
            console.warn("⚠️ Error obteniendo fixture próximo y odds:", err);
            fixtureConOdds = { fixture: null, odds: null };
          }

          // 1. H2H (Historial de enfrentamientos directos)
          const h2hData = await getH2H(equipoA.id, equipoB.id).catch(err => {
            console.warn("⚠️ Error obteniendo H2H:", err);
            return { response: [] };
          });

          // 2. Lesiones y sanciones
          const upcomingFixtureId =
            fixtureConOdds?.fixture?.fixture?.id ?? fixtureConOdds?.fixture?.id ?? routeFixtureId ?? null;

          const [injuriesA, injuriesB] = await Promise.all([
            getTeamInjuries(equipoA.id, {
              leagueId: ligaA,
              season: statsSeasonA,
              fixtureId: upcomingFixtureId,
            }).catch(err => {
              console.warn("⚠️ Error obteniendo lesiones equipo A:", err);
              return { response: [], meta: { error: err.message } };
            }),
            getTeamInjuries(equipoB.id, {
              leagueId: ligaB,
              season: statsSeasonB,
              fixtureId: upcomingFixtureId,
            }).catch(err => {
              console.warn("⚠️ Error obteniendo lesiones equipo B:", err);
              return { response: [], meta: { error: err.message } };
            })
          ]);

          // 3. Estadísticas detalladas del equipo (incluye local/visitante si está disponible)
          const [statsA, statsB] = await Promise.all([
            getTeamStats(equipoA.id, ligaA, statsSeasonA).catch(err => {
              console.warn("⚠️ Error obteniendo estadísticas equipo A:", err);
              return { response: [] };
            }),
            getTeamStats(equipoB.id, ligaB, statsSeasonB).catch(err => {
              console.warn("⚠️ Error obteniendo estadísticas equipo B:", err);
              return { response: [] };
            })
          ]);

          // 4. Estadísticas de jugadores (goleadores, asistencias, etc.)
          const [playersStatsA, playersStatsB] = await Promise.all([
            getTeamPlayersStats(equipoA.id, ligaA, statsSeasonA).catch(err => {
              console.warn("⚠️ Error obteniendo estadísticas de jugadores equipo A:", err);
              return { response: [] };
            }),
            getTeamPlayersStats(equipoB.id, ligaB, statsSeasonB).catch(err => {
              console.warn("⚠️ Error obteniendo estadísticas de jugadores equipo B:", err);
              return { response: [] };
            })
          ]);

          // 5. Últimos partidos (para calcular promedios de corners, faltas, etc.)
          const [fixturesA, fixturesB] = await Promise.all([
            getTeamFixtures(equipoA.id, 10).catch(err => {
              console.warn("⚠️ Error obteniendo fixtures equipo A:", err);
              return { response: [] };
            }),
            getTeamFixtures(equipoB.id, 10).catch(err => {
              console.warn("⚠️ Error obteniendo fixtures equipo B:", err);
              return { response: [] };
            })
          ]);

          // Procesar corners de los fixtures
          const [cornersDataA, cornersDataB] = await Promise.all([
            procesarCornersDeFixtures(fixturesA?.response || [], equipoA.id, 5),
            procesarCornersDeFixtures(fixturesB?.response || [], equipoB.id, 5)
          ]);

          // Calcular corners esperados
          const cornersEsperados = expectedCorners(
            { cornersFor: cornersDataA.cornersFor, cornersAgainst: cornersDataA.cornersAgainst },
            { cornersFor: cornersDataB.cornersFor, cornersAgainst: cornersDataB.cornersAgainst }
          );

          // Procesar tarjetas de los fixtures
          const [tarjetasDataA, tarjetasDataB] = await Promise.all([
            procesarTarjetasDeFixtures(fixturesA?.response || [], equipoA.id, 5),
            procesarTarjetasDeFixtures(fixturesB?.response || [], equipoB.id, 5)
          ]);

          // Calcular tarjetas esperadas
          const tarjetasEsperadas = expectedCards(
            { cardsFor: tarjetasDataA.cardsFor, cardsAgainst: tarjetasDataA.cardsAgainst },
            { cardsFor: tarjetasDataB.cardsFor, cardsAgainst: tarjetasDataB.cardsAgainst }
          );

          // Procesar y estructurar los datos adicionales
          const datosAdicionalesEstructurados = {
            // 1. H2H (últimos 4 enfrentamientos más recientes)
            h2h: buildH2HDisplayData(h2hData?.response || []),

            // 2. Lesiones con evaluación de impacto
            lesiones: {
              equipoA: {
                ...enrichTeamInjuries(injuriesA, playersStatsA),
                fetchMeta: injuriesA?.meta || null,
              },
              equipoB: {
                ...enrichTeamInjuries(injuriesB, playersStatsB),
                fetchMeta: injuriesB?.meta || null,
              },
            },

            // 3. Estadísticas local/visitante
            estadisticasLocalVisitante: {
              equipoA: {
                estadisticas: statsA?.response || null,
                // Extraer promedios de local/visitante si están disponibles
                local: statsA?.response?.fixtures?.home || null,
                visitante: statsA?.response?.fixtures?.away || null
              },
              equipoB: {
                estadisticas: statsB?.response || null,
                local: statsB?.response?.fixtures?.home || null,
                visitante: statsB?.response?.fixtures?.away || null
              }
            },

            // 4. Goleadores y estadísticas de jugadores
            goleadores: {
              equipoA: {
                total: playersStatsA?.response?.length || 0,
                jugadores: (playersStatsA?.response || [])
                  .filter(j => j.statistics && j.statistics.length > 0)
                  .map(jugador => ({
                    nombre: jugador.player?.name,
                    posicion: jugador.statistics[0]?.games?.position,
                    goles: jugador.statistics[0]?.goals?.total || 0,
                    asistencias: jugador.statistics[0]?.goals?.assists || 0,
                    partidos: jugador.statistics[0]?.games?.appearences || 0,
                    minutos: jugador.statistics[0]?.games?.minutes || 0
                  }))
                  .sort((a, b) => b.goles - a.goles)
                  .slice(0, 10) // Top 10 goleadores
              },
              equipoB: {
                total: playersStatsB?.response?.length || 0,
                jugadores: (playersStatsB?.response || [])
                  .filter(j => j.statistics && j.statistics.length > 0)
                  .map(jugador => ({
                    nombre: jugador.player?.name,
                    posicion: jugador.statistics[0]?.games?.position,
                    goles: jugador.statistics[0]?.goals?.total || 0,
                    asistencias: jugador.statistics[0]?.goals?.assists || 0,
                    partidos: jugador.statistics[0]?.games?.appearences || 0,
                    minutos: jugador.statistics[0]?.games?.minutes || 0
                  }))
                  .sort((a, b) => b.goles - a.goles)
                  .slice(0, 10) // Top 10 goleadores
              }
            },

            // 5. Corners y tarjetas (extraídos de fixtures recientes)
            cornersYFaltas: {
              equipoA: {
                fixtures: fixturesA?.response || [],
                cornersFor: cornersDataA.cornersFor,
                cornersAgainst: cornersDataA.cornersAgainst,
                promedioCorners: cornersDataA.promedioFor,
                promedioCornersContra: cornersDataA.promedioAgainst,
                cardsFor: tarjetasDataA.cardsFor,
                cardsAgainst: tarjetasDataA.cardsAgainst,
                promedioTarjetas: tarjetasDataA.promedioFor,
                promedioTarjetasContra: tarjetasDataA.promedioAgainst
              },
              equipoB: {
                fixtures: fixturesB?.response || [],
                cornersFor: cornersDataB.cornersFor,
                cornersAgainst: cornersDataB.cornersAgainst,
                promedioCorners: cornersDataB.promedioFor,
                promedioCornersContra: cornersDataB.promedioAgainst,
                cardsFor: tarjetasDataB.cardsFor,
                cardsAgainst: tarjetasDataB.cardsAgainst,
                promedioTarjetas: tarjetasDataB.promedioFor,
                promedioTarjetasContra: tarjetasDataB.promedioAgainst
              },
              // Corners esperados del partido
              cornersEsperados: cornersEsperados,
              // Tarjetas esperadas del partido
              tarjetasEsperadas: tarjetasEsperadas
            },

            // 6. Árbitro (se obtendrá cuando haya un fixture específico)
            arbitro: {
              disponible: false,
              nombre: null,
              promedioTarjetas: null,
              tendencias: null
            },

            // 7. Alineaciones probables (se obtendrá cuando haya un fixture específico)
            alineaciones: {
              disponible: false,
              equipoA: null,
              equipoB: null
            },

            // 8. Fixture próximo y odds (probabilidades del mercado)
            fixtureConOdds: fixtureConOdds
          };

          // Guardar los datos adicionales en el estado
          setDatosAdicionales(datosAdicionalesEstructurados);

          console.log("✅ Datos adicionales obtenidos y guardados:", datosAdicionalesEstructurados);

        } catch (err) {
          console.error("⚠️ Error obteniendo datos adicionales (no crítico):", err);
          // No bloqueamos el flujo principal si fallan los datos adicionales
        }
      } else {
        setError("No se pudieron obtener los datos completos de los equipos.");
      }
    } catch (err) {
      console.error("Error analizando equipos:", err);
      setError(`Error al analizar: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="predicciones-container">
      <div className="predicciones-header">
        <GoalLogicTitle as="h1" size="lg" className="predicciones-title" />
        <p className="predicciones-subtitle">
          Selecciona dos equipos para generar predicciones basadas en datos estadísticos.
        </p>
      </div>

      <div className="predicciones-domain-tabs" role="tablist" aria-label="Tipo de competición">
        <button
          type="button"
          role="tab"
          aria-selected={predictionDomain === "club"}
          className={`predicciones-domain-tab ${predictionDomain === "club" ? "active" : ""}`}
          onClick={() => setPredictionDomain("club")}
        >
          Clubes
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={predictionDomain === "selection"}
          className={`predicciones-domain-tab ${predictionDomain === "selection" ? "active" : ""}`}
          onClick={() => setPredictionDomain("selection")}
        >
          Selecciones
        </button>
      </div>
      {ligasLoading && (
        <p className="predicciones-ligas-loading" role="status">
          Cargando competiciones…
        </p>
      )}

      <div className="predicciones-filtros">
        {/* Equipo Local */}
        <div className="filtros-equipo">
          <h3 className="filtros-titulo">Equipo Local</h3>
          <div className="filtros-row">
            <div className="filtro-item">
              <label htmlFor="ligaLocal">Liga</label>
              <select
                id="ligaLocal"
                className="filtro-select"
                value={ligaLocal ? String(ligaLocal) : ""}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : null;
                  setLigaLocal(value);
                }}
              >
                <option value="">-- Selecciona una liga --</option>
                {ligasInDomain.map((liga) => (
                  <option key={liga.id} value={liga.id}>
                    {liga.nombre} ({liga.pais})
                  </option>
                ))}
              </select>
            </div>
            <div className="filtro-item">
              <label htmlFor="equipoLocal">Equipo</label>
              <select
                id="equipoLocal"
                className="filtro-select"
                value={equipoLocal?.id || ""}
                onChange={(e) => {
                  const equipoId = e.target.value ? parseInt(e.target.value, 10) : null;
                  const equipoSeleccionado = equiposLocal.find(eq => eq.id === equipoId);
                  setEquipoLocal(equipoSeleccionado || null);
                }}
                disabled={!ligaLocal || equiposLocal.length === 0}
              >
                <option value="">-- Selecciona un equipo --</option>
                {equiposLocal.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Equipo Visitante */}
        <div className="filtros-equipo">
          <h3 className="filtros-titulo">Equipo Visitante</h3>
          <div className="filtros-row">
            <div className="filtro-item">
              <label htmlFor="ligaVisitante">Liga</label>
              <select
                id="ligaVisitante"
                className="filtro-select"
                value={ligaVisitante ? String(ligaVisitante) : ""}
                onChange={(e) => {
                  const value = e.target.value ? parseInt(e.target.value, 10) : null;
                  setLigaVisitante(value);
                }}
              >
                <option value="">-- Selecciona una liga --</option>
                {ligasInDomain.map((liga) => (
                  <option key={liga.id} value={liga.id}>
                    {liga.nombre} ({liga.pais})
                  </option>
                ))}
              </select>
            </div>
            <div className="filtro-item">
              <label htmlFor="equipoVisitante">Equipo</label>
              <select
                id="equipoVisitante"
                className="filtro-select"
                value={equipoVisitante?.id || ""}
                onChange={(e) => {
                  const equipoId = e.target.value ? parseInt(e.target.value, 10) : null;
                  const equipoSeleccionado = equiposVisitante.find(eq => eq.id === equipoId);
                  setEquipoVisitante(equipoSeleccionado || null);
                }}
                disabled={!ligaVisitante || equiposVisitante.length === 0}
              >
                <option value="">-- Selecciona un equipo --</option>
                {equiposVisitante.map((equipo) => (
                  <option key={equipo.id} value={equipo.id}>
                    {equipo.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Botón Analizar (mantener para compatibilidad con código anterior) */}
      <div className="predicciones-acciones" style={{ marginTop: "30px" }}>
        <button
          type="button"
          className="btn-analizar"
          onClick={handleAnalizar}
          disabled={!equipoA || !equipoB || loading}
        >
          {loading ? "Analizando..." : "Analizar Comparación"}
        </button>
        {(!equipoA || !equipoB) && !loading && (
          <p className="btn-analizar-hint">
            Selecciona ambos equipos para habilitar el análisis comparativo.
          </p>
        )}
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="predicciones-error">
          <p>{error}</p>
        </div>
      )}

      {/* Estado de carga */}
      {loading && (
        <div className="predicciones-loading">
          <p>Analizando equipos...</p>
        </div>
      )}

      {/* Resultados del análisis */}
      {resultados && !loading && (
        <div className="predicciones-resultados">
          {/* Resumen Ejecutivo - Destacado */}
          {resultados.predicciones && (
            <ResumenEjecutivo 
              predicciones={resultados.predicciones}
              equipoA={resultados.equipoA}
              equipoB={resultados.equipoB}
              fixtureConOdds={datosAdicionales?.fixtureConOdds}
              datosAdicionales={datosAdicionales}
            />
          )}

          {/* Comparación con Tabs */}
          {resultados.predicciones && (
            <ComparacionConTabs 
              predicciones={resultados.predicciones}
              equipoA={resultados.equipoA}
              equipoB={resultados.equipoB}
              datosAdicionales={datosAdicionales}
            />
          )}

          {datosAdicionales?.lesiones && (
            <LesionadosEquipo
              lesiones={datosAdicionales.lesiones}
              nombreEquipoA={resultados.equipoA?.nombre}
              nombreEquipoB={resultados.equipoB?.nombre}
            />
          )}

          {/* Fichas de equipos simplificadas */}
          <PrediccionesSectionTitle
            as="h3"
            size="lg"
            icon={IconPanoramaEquipo}
            className="predicciones-fichas-heading"
            style={{ marginTop: tokens.spacing['2xl'] }}
          >
            {PREDICCIONES_TITLES.panoramaEquipo}
          </PrediccionesSectionTitle>
          <div className="fichas-equipos">
            <div className="ficha-wrapper">
              <FichaEquipoSimplificada 
                equipo={resultados.equipoA} 
                tipo="A" 
              />
            </div>
            
            <div className="ficha-wrapper">
              <FichaEquipoSimplificada 
                equipo={resultados.equipoB} 
                tipo="B" 
              />
            </div>
          </div>

          {/* Datos Adicionales Colapsables */}
          {datosAdicionales && (
            <DatosAdicionales 
              datosAdicionales={datosAdicionales}
              nombreEquipoA={resultados.equipoA?.nombre}
              nombreEquipoB={resultados.equipoB?.nombre}
            />
          )}
        </div>
      )}

    </div>
  );
}

// Componente para comparación de datos reales
function ComparacionDatosReales({ predicciones, equipoA, equipoB, datosAdicionales }) {
  // Detectar viewport para responsive
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calcular eficiencias
  const xgDisplayA = useMemo(() => resolveDisplayXg(equipoA), [equipoA]);
  const xgDisplayB = useMemo(() => resolveDisplayXg(equipoB), [equipoB]);
  const xgaDisplayA = useMemo(() => resolveDisplayXga(equipoA), [equipoA]);
  const xgaDisplayB = useMemo(() => resolveDisplayXga(equipoB), [equipoB]);

  const eficienciaOfensivaA = useMemo(() => {
    const xG = xgDisplayA.value || 0;
    const goles = equipoA?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoA, xgDisplayA]);

  const eficienciaOfensivaB = useMemo(() => {
    const xG = xgDisplayB.value || 0;
    const goles = equipoB?.promedioGolesFavor || 0;
    if (xG === 0) return null;
    return ((goles / xG) * 100).toFixed(1);
  }, [equipoB, xgDisplayB]);

  const eficienciaDefensivaA = useMemo(() => {
    const xGA = xgaDisplayA.value || 0;
    const golesRecibidos = equipoA?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoA, xgaDisplayA]);

  const eficienciaDefensivaB = useMemo(() => {
    const xGA = xgaDisplayB.value || 0;
    const golesRecibidos = equipoB?.promedioGolesContra || 0;
    if (xGA === 0) return null;
    return ((golesRecibidos / xGA) * 100).toFixed(1);
  }, [equipoB, xgaDisplayB]);

  // Calcular tendencia de forma
  const tendenciaForma = useMemo(() => {
    const diferencia = predicciones.puntosFormaA - predicciones.puntosFormaB;
    if (diferencia > 2) return { icon: '↑', texto: 'Mejor', color: tokens.colors.accentPositive };
    if (diferencia < -2) return { icon: '↓', texto: 'Peor', color: tokens.colors.accentNegative };
    return { icon: '→', texto: 'Similar', color: tokens.colors.accentNeutral };
  }, [predicciones]);

  // Conclusiones (mismo catálogo y umbrales que ComparacionConTabs)
  const insights = useMemo(
    () => buildConclusionesComparativaEquipos(predicciones, equipoA, equipoB),
    [predicciones, equipoA, equipoB]
  );

  // Estilos inline usando tokens
  const containerStyle = {
    marginTop: tokens.spacing.xl,
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.bgCard,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const tituloStyle = {
    fontSize: tokens.typography.fontSize2xl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    borderBottom: `2px solid ${tokens.colors.borderDefault}`,
  };

  const bloqueStyle = {
    marginBottom: tokens.spacing.xl,
  };

  const bloqueTituloStyle = {
    fontSize: tokens.typography.fontSizeLg,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const comparacionGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: tokens.spacing.md,
  };

  const columnaStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const columnaTituloStyle = {
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  };

  const metricaStyle = {
    marginBottom: tokens.spacing.md,
  };

  const metricaLabelStyle = getAdvancedMetricLabelStyle({}, 'dark', 'compact');

  const metricaValorStyle = {
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
  };

  const tendenciaStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizeSm,
    color: tendenciaForma.color,
    fontWeight: tokens.typography.fontWeightSemibold,
  };

  const insightsStyle = {
    marginTop: tokens.spacing.xl,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: tokens.radius.md,
    border: `1px solid ${tokens.colors.borderDefault}`,
  };

  const insightsTituloStyle = {
    fontSize: tokens.typography.fontSizeBase,
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
    marginBottom: tokens.spacing.sm,
  };

  const insightItemStyle = {
    fontSize: tokens.typography.fontSizeSm,
    color: tokens.colors.textSecondary,
    lineHeight: tokens.typography.lineHeightRelaxed,
    marginBottom: tokens.spacing.xs,
    paddingLeft: tokens.spacing.md,
    borderLeft: `3px solid ${tokens.colors.accentOrange}`,
  };

  return (
    <div style={containerStyle}>
      <h3 style={tituloStyle}>Comparación de Datos Reales</h3>

      {/* A. Rendimiento Reciente */}
      <div style={bloqueStyle}>
        <h4 style={bloqueTituloStyle}>
          <span>📈</span>
          <span>Rendimiento Reciente</span>
        </h4>
        <div style={comparacionGridStyle}>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo A</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>G / E / P</span>
              <div style={metricaValorStyle}>
                {predicciones.formaA.ganados} / {predicciones.formaA.empatados} / {predicciones.formaA.perdidos}
              </div>
            </div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Puntos</span>
              <div style={metricaValorStyle}>{predicciones.puntosFormaA} pts</div>
            </div>
            {predicciones.puntosFormaA > predicciones.puntosFormaB && (
              <div style={tendenciaStyle}>
                <span>↑</span>
                <span>Mejor forma</span>
              </div>
            )}
          </div>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo B</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>G / E / P</span>
              <div style={metricaValorStyle}>
                {predicciones.formaB.ganados} / {predicciones.formaB.empatados} / {predicciones.formaB.perdidos}
              </div>
            </div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Puntos</span>
              <div style={metricaValorStyle}>{predicciones.puntosFormaB} pts</div>
            </div>
            {predicciones.puntosFormaB > predicciones.puntosFormaA && (
              <div style={tendenciaStyle}>
                <span>↑</span>
                <span>Mejor forma</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* B. Ataque */}
      <div style={bloqueStyle}>
        <h4 style={bloqueTituloStyle}>
          <span>⚽</span>
          <span>Ataque</span>
        </h4>
        <div style={comparacionGridStyle}>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo A</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Promedio Goles</span>
              <div style={metricaValorStyle}>
                {(equipoA?.promedioGolesFavor || 0).toFixed(2)}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                {formatXgPromedioLabel(xgDisplayA.source)}
              </span>
              <div style={metricaValorStyle}>
                {xgDisplayA.value != null ? xgDisplayA.value.toFixed(2) : 'N/D'}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.over25}</span>
              <div style={metricaValorStyle}>{predicciones.over25A}%</div>
            </div>
            {eficienciaOfensivaA && (
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Eficiencia Ofensiva</span>
                <div style={{ ...metricaValorStyle, color: parseFloat(eficienciaOfensivaA) > 100 ? tokens.colors.accentPositive : tokens.colors.accentNeutral }}>
                  {eficienciaOfensivaA}%
                </div>
              </div>
            )}
          </div>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo B</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Promedio Goles</span>
              <div style={metricaValorStyle}>
                {(equipoB?.promedioGolesFavor || 0).toFixed(2)}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                {formatXgPromedioLabel(xgDisplayB.source)}
              </span>
              <div style={metricaValorStyle}>
                {xgDisplayB.value != null ? xgDisplayB.value.toFixed(2) : 'N/D'}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.over25}</span>
              <div style={metricaValorStyle}>{predicciones.over25B}%</div>
            </div>
            {eficienciaOfensivaB && (
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Eficiencia Ofensiva</span>
                <div style={{ ...metricaValorStyle, color: parseFloat(eficienciaOfensivaB) > 100 ? tokens.colors.accentPositive : tokens.colors.accentNeutral }}>
                  {eficienciaOfensivaB}%
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* C. Defensa */}
      <div style={bloqueStyle}>
        <h4 style={bloqueTituloStyle}>
          <span>🛡️</span>
          <span>Defensa</span>
        </h4>
        <div style={comparacionGridStyle}>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo A</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Promedio Goles Recibidos</span>
              <div style={metricaValorStyle}>
                {(equipoA?.promedioGolesContra || 0).toFixed(2)}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                {formatXgaPromedioLabel(xgaDisplayA.source)}
              </span>
              <div style={metricaValorStyle}>
                {xgaDisplayA.value != null ? xgaDisplayA.value.toFixed(2) : 'N/D'}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.cleanSheets}</span>
              <div style={metricaValorStyle}>{predicciones.cleanSheetsA}%</div>
            </div>
            {eficienciaDefensivaA && (() => {
              // Usar la misma lógica que ComparacionConTabs para consistencia
              const getDefensiveEfficiencyColor = (value) => {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                if (numValue === null || numValue === undefined || isNaN(numValue)) {
                  return tokens.colors.textPrimary;
                }
                if (numValue < 80) return tokens.colors.accentPositive; // Verde
                if (numValue < 95) return tokens.colors.accentGold; // Amarillo
                return tokens.colors.accentNegative; // Rojo
              };
              
              const colorAplicado = getDefensiveEfficiencyColor(eficienciaDefensivaA);
              
              return (
                <div style={metricaStyle}>
                  <span style={metricaLabelStyle}>Eficiencia Defensiva</span>
                  <div style={{ ...metricaValorStyle, color: colorAplicado }}>
                    {eficienciaDefensivaA}%
                  </div>
                </div>
              );
            })()}
          </div>
          <div style={columnaStyle}>
            <div style={columnaTituloStyle}>Equipo B</div>
            <div style={metricaStyle}>
              <span style={metricaLabelStyle}>Promedio Goles Recibidos</span>
              <div style={metricaValorStyle}>
                {(equipoB?.promedioGolesContra || 0).toFixed(2)}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>
                {formatXgaPromedioLabel(xgaDisplayB.source)}
              </span>
              <div style={metricaValorStyle}>
                {xgaDisplayB.value != null ? xgaDisplayB.value.toFixed(2) : 'N/D'}
              </div>
            </div>
            <div style={metricaStyle}>
              <span className={ADVANCED_METRIC_LABEL_CLASS} style={metricaLabelStyle}>{ML.cleanSheets}</span>
              <div style={metricaValorStyle}>{predicciones.cleanSheetsB}%</div>
            </div>
            {eficienciaDefensivaB && (() => {
              // Usar la misma lógica que ComparacionConTabs para consistencia
              const getDefensiveEfficiencyColor = (value) => {
                const numValue = typeof value === 'string' ? parseFloat(value) : value;
                if (numValue === null || numValue === undefined || isNaN(numValue)) {
                  return tokens.colors.textPrimary;
                }
                if (numValue < 80) return tokens.colors.accentPositive; // Verde
                if (numValue < 95) return tokens.colors.accentGold; // Amarillo
                return tokens.colors.accentNegative; // Rojo
              };
              
              const colorAplicado = getDefensiveEfficiencyColor(eficienciaDefensivaB);
              
              return (
                <div style={metricaStyle}>
                  <span style={metricaLabelStyle}>Eficiencia Defensiva</span>
                  <div style={{ ...metricaValorStyle, color: colorAplicado }}>
                    {eficienciaDefensivaB}%
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* D. Corners Esperados */}
      {datosAdicionales?.cornersYFaltas?.cornersEsperados && (
        <div style={bloqueStyle}>
          <h4 style={bloqueTituloStyle}>
            <span>🎯</span>
            <span>Corners Esperados</span>
          </h4>
          <div style={comparacionGridStyle}>
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>Equipo A</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Corners Esperados</span>
                <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                  {datosAdicionales.cornersYFaltas.cornersEsperados.expectedA}
                </div>
              </div>
            </div>
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>Equipo B</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Corners Esperados</span>
                <div style={{ ...metricaValorStyle, color: tokens.colors.accentOrange }}>
                  {datosAdicionales.cornersYFaltas.cornersEsperados.expectedB}
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...columnaStyle, marginTop: tokens.spacing.md, textAlign: 'center' }}>
            <span style={metricaLabelStyle}>Corners Totales Esperados del Partido</span>
            <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentOrange }}>
              {datosAdicionales.cornersYFaltas.cornersEsperados.total}
            </div>
          </div>
        </div>
      )}

      {/* E. Tarjetas Esperadas */}
      {datosAdicionales?.cornersYFaltas?.tarjetasEsperadas && (
        <div style={bloqueStyle}>
          <h4 style={bloqueTituloStyle}>
            <span>🟨</span>
            <span>Tarjetas Esperadas</span>
          </h4>
          <div style={comparacionGridStyle}>
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>Equipo A</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                  {datosAdicionales.cornersYFaltas.tarjetasEsperadas.expectedA}
                </div>
              </div>
            </div>
            <div style={columnaStyle}>
              <div style={columnaTituloStyle}>Equipo B</div>
              <div style={metricaStyle}>
                <span style={metricaLabelStyle}>Tarjetas Esperadas</span>
                <div style={{ ...metricaValorStyle, color: tokens.colors.accentGold }}>
                  {datosAdicionales.cornersYFaltas.tarjetasEsperadas.expectedB}
                </div>
              </div>
            </div>
          </div>
          <div style={{ ...columnaStyle, marginTop: tokens.spacing.md, textAlign: 'center' }}>
            <span style={metricaLabelStyle}>Tarjetas Totales Esperadas del Partido</span>
            <div style={{ ...metricaValorStyle, fontSize: tokens.typography.fontSize3xl, color: tokens.colors.accentGold }}>
              {datosAdicionales.cornersYFaltas.tarjetasEsperadas.total}
            </div>
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div style={insightsStyle}>
          <h4 style={insightsTituloStyle}>📊 Conclusiones de análisis</h4>
          {insights.map((insight, index) => (
            <div key={index} style={insightItemStyle}>
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente para mostrar la ficha de un equipo
function FichaEquipo({ equipo, tipo }) {
  // Calcular forma reciente (últimos 5 partidos)
  const calcularFormaReciente = () => {
    if (!equipo.ultimosPartidos || equipo.ultimosPartidos.length === 0) {
      return null;
    }

    const resultados = equipo.ultimosPartidos.map(p => p.resultado);
    return resultados.join(" ");
  };

  const formaReciente = calcularFormaReciente();

  // Calcular tendencias básicas
  const calcularTendencias = () => {
    if (!equipo.ultimosPartidos || equipo.ultimosPartidos.length === 0) {
      return null;
    }

    let over25 = 0;
    let btts = 0;
    let totalPartidos = equipo.ultimosPartidos.length;

    equipo.ultimosPartidos.forEach(partido => {
      const totalGoles = partido.golesFavor + partido.golesContra;
      if (totalGoles > 2.5) over25++;
      if (partido.golesFavor > 0 && partido.golesContra > 0) btts++;
    });

    return {
      over25Porcentaje: totalPartidos > 0 ? Math.round((over25 / totalPartidos) * 100) : 0,
      bttsPorcentaje: totalPartidos > 0 ? Math.round((btts / totalPartidos) * 100) : 0
    };
  };

  const tendencias = calcularTendencias();

  return (
    <div className="ficha-equipo">
      <div className="ficha-header">
        {equipo.logo && (
          <img src={equipo.logo} alt={equipo.nombre} className="ficha-logo" />
        )}
        <div className="ficha-info-basica">
          <h3>{equipo.nombre}</h3>
          <p className="ficha-liga">{equipo.liga}</p>
          <p className="ficha-pais">{equipo.pais}</p>
        </div>
      </div>

      <div className="ficha-estadisticas">
        {equipo.posicion !== null && equipo.posicion !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Posición:</span>
            <span className="stat-value">{equipo.posicion}°</span>
          </div>
        )}
        {equipo.puntos !== null && equipo.puntos !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Puntos:</span>
            <span className="stat-value">{equipo.puntos}</span>
          </div>
        )}
        {equipo.golesFavor !== null && equipo.golesFavor !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Goles a favor:</span>
            <span className="stat-value">{equipo.golesFavor}</span>
          </div>
        )}
        {equipo.golesContra !== null && equipo.golesContra !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Goles en contra:</span>
            <span className="stat-value">{equipo.golesContra}</span>
          </div>
        )}
        {equipo.promedioGolesFavor !== null && equipo.promedioGolesFavor !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Promedio goles a favor:</span>
            <span className="stat-value">{equipo.promedioGolesFavor.toFixed(2)}</span>
          </div>
        )}
        {equipo.promedioGolesContra !== null && equipo.promedioGolesContra !== undefined && (
          <div className="ficha-stat">
            <span className="stat-label">Promedio goles en contra:</span>
            <span className="stat-value">{equipo.promedioGolesContra.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Forma reciente */}
      {formaReciente && (
        <div className="ficha-forma-reciente">
          <h4>Forma Reciente</h4>
          <div className="forma-indicadores">
            {equipo.ultimosPartidos.map((partido, index) => {
              const color = partido.resultado === "G" ? "#27ae60" : 
                           partido.resultado === "E" ? "#f39c12" : "#e74c3c";
              const letra = partido.resultado === "G" ? "G" : 
                           partido.resultado === "E" ? "E" : "P";
              return (
                <span
                  key={index}
                  className="forma-indicador"
                  style={{
                    backgroundColor: color,
                    color: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    minWidth: "24px",
                    textAlign: "center"
                  }}
                >
                  {letra}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Últimos partidos */}
      {equipo.ultimosPartidos && equipo.ultimosPartidos.length > 0 && (
        <div className="ficha-ultimos-partidos">
          <h4>Últimos 5 partidos</h4>
          <div className="partidos-lista">
            {equipo.ultimosPartidos.map((partido, index) => (
              <div key={index} className={`partido-resultado ${partido.resultado.toLowerCase()}`}>
                {partido.resultado === "G" && "✅"}
                {partido.resultado === "E" && "➖"}
                {partido.resultado === "P" && "❌"}
                <span>
                  {partido.golesFavor} - {partido.golesContra}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencias básicas */}
      {tendencias && (
        <div className="ficha-tendencias">
          <h4>Tendencias</h4>
          <div className="tendencias-grid">
            <div className="tendencia-item">
              <span className="tendencia-label">{ML.over25}:</span>
              <span className="tendencia-value">{tendencias.over25Porcentaje}%</span>
            </div>
            <div className="tendencia-item">
              <span className="tendencia-label">BTTS:</span>
              <span className="tendencia-value">{tendencias.bttsPorcentaje}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas ofensivas y defensivas (si están disponibles) */}
      {(equipo.estadisticasOfensivas || equipo.estadisticasDefensivas) && (
        <div className="ficha-estadisticas-avanzadas">
          <h4>Estadísticas Avanzadas</h4>
          {equipo.estadisticasOfensivas && (
            <div className="estadisticas-seccion">
              <h5>Ofensivas</h5>
              <div className="estadisticas-grid">
                {equipo.estadisticasOfensivas.tirosAlArco !== null && (
                  <div className="ficha-stat">
                    <span className="stat-label">Tiros al arco:</span>
                    <span className="stat-value">{equipo.estadisticasOfensivas.tirosAlArco}</span>
                  </div>
                )}
                {equipo.estadisticasOfensivas.tirosAlArcoPromedio !== null && (
                  <div className="ficha-stat">
                    <span className="stat-label">Tiros/partido:</span>
                    <span className="stat-value">{equipo.estadisticasOfensivas.tirosAlArcoPromedio?.toFixed(1)}</span>
                  </div>
                )}
                <div className="ficha-stat">
                  <span className="stat-label">
                    {formatXgPromedioLabel(
                      equipo.estadisticasOfensivas?.xGSource
                        || (resolveDisplayXg(equipo).source)
                    )}:
                  </span>
                  <span className="stat-value">
                    {(resolveDisplayXg(equipo).value ?? equipo.estadisticasOfensivas?.xG)?.toFixed(2) ?? 'N/D'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {equipo.estadisticasDefensivas && (
            <div className="estadisticas-seccion">
              <h5>Defensivas</h5>
              <div className="estadisticas-grid">
                {equipo.estadisticasDefensivas.tirosEnContra !== null && (
                  <div className="ficha-stat">
                    <span className="stat-label">Tiros recibidos:</span>
                    <span className="stat-value">{equipo.estadisticasDefensivas.tirosEnContra}</span>
                  </div>
                )}
                {equipo.estadisticasDefensivas.tirosEnContraPromedio !== null && (
                  <div className="ficha-stat">
                    <span className="stat-label">Tiros recibidos/partido:</span>
                    <span className="stat-value">{equipo.estadisticasDefensivas.tirosEnContraPromedio?.toFixed(1)}</span>
                  </div>
                )}
                <div className="ficha-stat">
                  <span className="stat-label">
                    {formatXgaPromedioLabel(
                      equipo.estadisticasDefensivas?.xGASource
                        || (resolveDisplayXga(equipo).source)
                    )}:
                  </span>
                  <span className="stat-value">
                    {(resolveDisplayXga(equipo).value ?? equipo.estadisticasDefensivas?.xGA)?.toFixed(2) ?? 'N/D'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Estadísticas Avanzadas Calculadas desde Últimos Partidos */}
      {equipo.ultimosPartidos && equipo.ultimosPartidos.length > 0 && (
        <EstadisticasAvanzadasEquipo 
          ultimosPartidos={equipo.ultimosPartidos}
          teamId={equipo.id}
          tipo={tipo}
        />
      )}
    </div>
  );
}
