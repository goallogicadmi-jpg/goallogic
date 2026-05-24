import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "../styles/standings.css";
import { applyCupAllocation } from "../logic/cupAllocation";
import { getVisualClassification } from "../logic/classificationVisual";
import Legend from "./Legend";
// ✅ MÓDULO CHAMPIONS LEAGUE
import { 
  buildChampionsClassification,
  getChampionsRowVisualProps 
} from "../championsLeague";
// ✅ MÓDULO KNOCKOUT CHAMPIONS LEAGUE
import {
  generatePlayoffMatches,
  createEmptyBracket,
  getTop8Teams
} from "../championsLeague/knockout";
import ChampionsBracket from "./ChampionsBracket";

export default function StandingsTable({ leagueId, season, onTeamClick, leagueInfo, isCup }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null);

  useEffect(() => {
    if (!leagueId || !season) {
      console.log("⚠️ StandingsTable: Faltan leagueId o season", { leagueId, season });
      return;
    }

    console.log("🔄 StandingsTable: Cargando datos para leagueId:", leagueId, "season:", season);
    setLoading(true);
    setError(null);

    axios.get(`/estadisticas/torneo?leagueId=${leagueId}&season=${season}`)
      .then(res => {
        console.log("📦 ===== RESPUESTA CRUDA DEL SERVIDOR =====");
        console.log("📦 Respuesta completa:", res.data);
        console.log("📦 Tipo de respuesta:", typeof res.data);
        console.log("📦 Keys de res.data:", Object.keys(res.data || {}));
        
        // ✅ LOGS DETALLADOS DE ESTRUCTURA
        console.log("📦 Tiene 'tabla'?:", res.data.tabla !== undefined);
        if (res.data.tabla) {
          console.log("📦 data.tabla es array?:", Array.isArray(res.data.tabla));
          console.log("📦 data.tabla.length:", Array.isArray(res.data.tabla) ? res.data.tabla.length : 'N/A');
        }
        
        console.log("📦 Tiene 'grupos'?:", res.data.grupos !== undefined);
        if (res.data.grupos) {
          console.log("📦 data.grupos es array?:", Array.isArray(res.data.grupos));
          console.log("📦 data.grupos.length:", Array.isArray(res.data.grupos) ? res.data.grupos.length : 'N/A');
          if (Array.isArray(res.data.grupos) && res.data.grupos.length > 0) {
            console.log("📦 Estructura de grupos:", res.data.grupos.map((g, i) => ({
              index: i,
              groupName: g.groupName,
              groupIndex: g.groupIndex,
              tablaLength: Array.isArray(g.tabla) ? g.tabla.length : 'N/A'
            })));
          }
        }
        
        console.log("📦 Tiene 'hasMultipleGroups'?:", res.data.hasMultipleGroups !== undefined);
        console.log("📦 hasMultipleGroups:", res.data.hasMultipleGroups);
        
        console.log("📦 Tiene 'response'?:", res.data.response !== undefined);
        console.log("📦 Tiene 'standings'?:", res.data.standings !== undefined);
        console.log("📦 Tiene 'data'?:", res.data.data !== undefined);
        
        // ✅ LOG ESPECÍFICO: Verificar estructura de standings si viene directamente
        if (res.data.response && res.data.response[0] && res.data.response[0].league && res.data.response[0].league.standings) {
          const standings = res.data.response[0].league.standings;
          console.log("📦 ===== ESTRUCTURA DE STANDINGS DESDE API =====");
          console.log("📦 standings es array?:", Array.isArray(standings));
          console.log("📦 standings.length:", Array.isArray(standings) ? standings.length : 'N/A');
          if (Array.isArray(standings) && standings.length > 0) {
            console.log("📦 standings[0] es array?:", Array.isArray(standings[0]));
            console.log("📦 standings[0].length:", Array.isArray(standings[0]) ? standings[0].length : 'N/A');
            if (standings.length > 1) {
              console.log("📦 standings[1] existe?:", standings[1] !== undefined);
              console.log("📦 standings[1] es array?:", Array.isArray(standings[1]));
              console.log("📦 standings[1].length:", Array.isArray(standings[1]) ? standings[1].length : 'N/A');
            }
          }
        }
        
        // Log específico de la tabla si existe
        if (res.data.tabla && res.data.tabla.length > 0) {
          console.log("📦 Primer equipo de la tabla:", res.data.tabla[0]);
          console.log("📦 Primer equipo tiene equipoId?:", res.data.tabla[0].equipoId !== undefined);
          console.log("📦 equipoId del primer equipo:", res.data.tabla[0].equipoId);
        }
        
        console.log("📦 ===== FIN DE LOGS DE RESPUESTA =====");
        
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("❌ StandingsTable: Error cargando datos:", err);
        setError("Error al cargar estadísticas del torneo");
        setLoading(false);
      });
  }, [leagueId, season]);

  const getFormaClass = (letra) => {
    if (letra === "W" || letra === "G") return "win";
    if (letra === "L" || letra === "P") return "loss";
    if (letra === "D" || letra === "E") return "draw";
    return "";
  };

  // ✅ DETECCIÓN DE CHAMPIONS LEAGUE
  const isChampionsLeague = () => {
    // Verificar por ID (2 = UEFA Champions League)
    if (leagueId === 2) {
      return true;
    }
    
    // Verificar por nombre de competición
    const competitionName = leagueInfo?.name || data?.liga || data?.league?.name || "";
    const normalized = competitionName.trim().toLowerCase();
    
    // Detectar variaciones del nombre
    if (normalized.includes("champions") && normalized.includes("league")) {
      return true;
    }
    
    // Verificar en datos de respuesta
    if (data?.response?.[0]?.league?.name) {
      const apiName = data.response[0].league.name.trim().toLowerCase();
      if (apiName.includes("champions") && apiName.includes("league")) {
        return true;
      }
    }
    
    return false;
  };
  
  const isUEFACL = isChampionsLeague();
  
  // ✅ GENERAR BRACKET PARA CHAMPIONS LEAGUE
  const bracket = useMemo(() => {
    if (!isUEFACL || !data) return null;

    try {
      if (data.bracket) {
        return data.bracket;
      }

      // Obtener tabla de 36 equipos
      let leagueTable = [];
      
      // Aplanar grupos si existen
      if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 1) {
        leagueTable = data.grupos.flatMap(g => g.tabla || []);
      } else if (data.tabla && Array.isArray(data.tabla)) {
        leagueTable = data.tabla;
      } else {
        console.warn("⚠️ [StandingsTable] No se pudo obtener la tabla para generar el bracket");
        return null;
      }

      // Construir clasificación Champions League
      const championsClassification = buildChampionsClassification(leagueTable);
      
      if (championsClassification.length < 24) {
        console.warn("⚠️ [StandingsTable] Tabla incompleta para generar bracket. Equipos:", championsClassification.length);
        return null;
      }

      // Generar playoffs
      const playoffMatches = generatePlayoffMatches(championsClassification);
      
      // Obtener Top 8
      const top8 = getTop8Teams(championsClassification);
      
      // Crear bracket base
      const bracketData = createEmptyBracket();
      bracketData.playoff = playoffMatches;
      
      console.log("✅ [StandingsTable] Bracket generado:", {
        playoffMatches: playoffMatches.length,
        top8: top8.length,
        totalTeams: championsClassification.length
      });

      return bracketData;
    } catch (error) {
      console.error("❌ [StandingsTable] Error generando bracket:", error);
      return null;
    }
  }, [isUEFACL, data]);
  
  if (loading) return <div className="standings-loading">Cargando tabla de posiciones...</div>;
  if (error) return <div className="standings-error">{error}</div>;
  if (!data) return null;
  
  // ✅ LOG DE DETECCIÓN
  if (isUEFACL) {
    console.log("🏆 [StandingsTable] CHAMPIONS LEAGUE DETECTADA - Usando módulo exclusivo");
    console.log("🏆 leagueId:", leagueId);
    console.log("🏆 leagueInfo:", leagueInfo);
    console.log("🏆 competitionName:", leagueInfo?.name || data?.liga || data?.league?.name);
  }

  // ✅ LOGS DETALLADOS ANTES DEL RENDER
  console.log("🔍 ===== ANÁLISIS DE DATA ANTES DEL RENDER =====");
  console.log("🔍 data completo:", data);
  console.log("🔍 data.grupos existe?:", data.grupos !== undefined);
  console.log("🔍 data.grupos es array?:", Array.isArray(data.grupos));
  console.log("🔍 data.grupos.length:", Array.isArray(data.grupos) ? data.grupos.length : 'N/A');
  console.log("🔍 data.hasMultipleGroups:", data.hasMultipleGroups);
  console.log("🔍 data.tabla existe?:", data.tabla !== undefined);
  console.log("🔍 data.tabla es array?:", Array.isArray(data.tabla));
  console.log("🔍 data.tabla.length:", Array.isArray(data.tabla) ? data.tabla.length : 'N/A');
  
  if (Array.isArray(data.grupos) && data.grupos.length > 0) {
    console.log("🔍 Estructura de cada grupo:");
    data.grupos.forEach((grupo, idx) => {
      console.log(`🔍   Grupo ${idx}:`, {
        groupName: grupo.groupName,
        groupIndex: grupo.groupIndex,
        tablaEsArray: Array.isArray(grupo.tabla),
        tablaLength: Array.isArray(grupo.tabla) ? grupo.tabla.length : 'N/A'
      });
    });
  }
  console.log("🔍 ===== FIN DE ANÁLISIS =====");

  // Intentar diferentes estructuras de respuesta de la API
  let tabla = [];
  
  if (data.tabla && Array.isArray(data.tabla)) {
    // Estructura esperada: { tabla: [...] }
    tabla = data.tabla;
    console.log("✅ Tabla encontrada en data.tabla:", tabla.length, "equipos");
  } else if (data.response && Array.isArray(data.response)) {
    // Estructura alternativa: { response: [...] }
    tabla = data.response;
    console.log("✅ Tabla encontrada en data.response:", tabla.length, "equipos");
  } else if (data.standings && Array.isArray(data.standings)) {
    // Estructura alternativa: { standings: [...] }
    tabla = data.standings;
    console.log("✅ Tabla encontrada en data.standings:", tabla.length, "equipos");
  } else if (data.data && Array.isArray(data.data)) {
    // Estructura alternativa: { data: [...] }
    tabla = data.data;
    console.log("✅ Tabla encontrada en data.data:", tabla.length, "equipos");
  } else if (Array.isArray(data)) {
    // Si data es directamente un array
    tabla = data;
    console.log("✅ Tabla encontrada como array directo:", tabla.length, "equipos");
  } else if (data.response && data.response[0] && data.response[0].league && data.response[0].league.standings) {
    // Estructura de API-Football: { response: [{ league: { standings: [[...]] } }] }
    const allStandings = data.response[0].league.standings;
    const hasMultipleGroups = Array.isArray(allStandings) && allStandings.length > 0 && Array.isArray(allStandings[0]);
    
    console.log("🔍 Estructura API-Football detectada:");
    console.log("🔍 allStandings es array?:", Array.isArray(allStandings));
    console.log("🔍 allStandings.length:", Array.isArray(allStandings) ? allStandings.length : 'N/A');
    console.log("🔍 hasMultipleGroups:", hasMultipleGroups);
    
    if (hasMultipleGroups) {
      // Si hay múltiples grupos, el backend ya los procesó en data.grupos
      if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 0) {
        console.log("✅ Múltiples grupos detectados en data.grupos:", data.grupos.length);
      } else {
        // Fallback: procesar aquí (solo primer grupo para compatibilidad)
        tabla = allStandings[0] || [];
        console.log("⚠️ Múltiples grupos detectados pero data.grupos no existe, usando solo primer grupo");
        console.log("✅ Tabla encontrada en data.response[0].league.standings[0] (fallback):", tabla.length, "equipos");
      }
    } else {
      // Liga normal sin grupos
      tabla = allStandings[0] || allStandings || [];
      console.log("✅ Tabla encontrada en data.response[0].league.standings (liga normal):", tabla.length, "equipos");
    }
  } else {
    console.warn("⚠️ No se encontró la tabla en ninguna estructura conocida");
    console.warn("⚠️ Estructura completa de data:", JSON.stringify(data, null, 2));
  }

  if (tabla.length === 0) {
    console.warn("⚠️ La tabla está vacía después de intentar todas las estructuras");
  } else {
    console.log("📊 Tabla cargada con", tabla.length, "equipos");
    if (tabla.length > 0) {
      console.log("🔍 Primer equipo de ejemplo:", tabla[0]);
      console.log("🔍 Tiene equipoId?:", tabla[0].equipoId !== undefined);
      console.log("🔍 equipoId del primer equipo:", tabla[0].equipoId);
      console.log("🔍 Tipo de equipoId:", typeof tabla[0].equipoId);
      console.log("🔍 Todos los equipos con sus IDs:", tabla.map(e => ({ nombre: e.equipo, id: e.equipoId })));
    }
  }

  // Función para obtener el color de clasificación según posición (para copas)
  const getClassificationColor = (position, totalTeams, isCupCompetition) => {
    if (isCupCompetition) {
      // Colores para COPAS (mantener lógica simple para copas)
      if (position === 1 || position === 2) {
        return '#00d47e'; // Clasificado (verde premium)
      } else if (position === 3) {
        return '#f5c542'; // Repechaje (amarillo suave)
      } else if (position === 4) {
        return null; // Eliminado (opacity: 0.5)
      }
      return null;
    }
    // Para ligas, usamos el nuevo sistema modular
    return null;
  };

  // ✅ RENDERIZAR MÚLTIPLES GRUPOS SI EXISTEN
  // CORREGIDO: Verificar si hay grupos (incluso si solo hay 1, pero con estructura de grupos)
  // Si hasMultipleGroups es true, significa que la competición tiene formato de grupos
  console.log("🔍 ===== VERIFICACIÓN FINAL ANTES DE RENDERIZAR =====");
  console.log("🔍 data.grupos existe?:", data.grupos !== undefined);
  console.log("🔍 data.grupos es array?:", Array.isArray(data.grupos));
  console.log("🔍 data.grupos.length:", Array.isArray(data.grupos) ? data.grupos.length : 'N/A');
  console.log("🔍 data.hasMultipleGroups:", data.hasMultipleGroups);
  console.log("🔍 Condición completa:", {
    tieneGrupos: data.grupos !== undefined,
    esArray: Array.isArray(data.grupos),
    lengthMayorCero: Array.isArray(data.grupos) && data.grupos.length > 0,
    hasMultipleGroupsTrue: data.hasMultipleGroups === true,
    condicionCompleta: data.grupos && Array.isArray(data.grupos) && data.grupos.length > 0 && data.hasMultipleGroups === true
  });
  
  if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 0 && data.hasMultipleGroups === true) {
    console.log("✅ ===== RENDERIZANDO MÚLTIPLES GRUPOS =====");
    console.log("✅ Total grupos a renderizar:", data.grupos.length);
    console.log("✅ Iniciando map sobre grupos...");
    
    // Hay múltiples grupos - renderizar cada uno
    const gruposRenderizados = data.grupos.map((grupo, groupIndex) => {
      console.log(`✅ ===== RENDERIZANDO GRUPO ${groupIndex + 1}/${data.grupos.length} =====`);
      console.log(`✅ Nombre del grupo: "${grupo.groupName}"`);
      console.log(`✅ Grupo ${groupIndex} tiene tabla?:`, Array.isArray(grupo.tabla));
      console.log(`✅ Grupo ${groupIndex} tabla.length:`, Array.isArray(grupo.tabla) ? grupo.tabla.length : 'N/A');
      console.log(`✅ Grupo ${groupIndex} tabla completa:`, grupo.tabla);
      
      if (!grupo.tabla || !Array.isArray(grupo.tabla) || grupo.tabla.length === 0) {
        console.warn(`⚠️ Grupo ${groupIndex} "${grupo.groupName}" NO tiene tabla válida, omitiendo...`);
        return null;
      }
      
      console.log(`✅ Grupo ${groupIndex} se renderizará con ${grupo.tabla.length} equipos`);
      
      return (
        <div 
          key={`grupo-${groupIndex}-${grupo.groupName || `grupo-${groupIndex}`}`} 
          className="standings-group-container" 
          style={{ 
            marginBottom: '2rem',
            width: '100%',
            display: 'block',
            visibility: 'visible',
            opacity: 1,
            position: 'relative',
            zIndex: 1,
            minHeight: '200px'
          }}
          data-grupo-index={groupIndex}
          data-grupo-name={grupo.groupName}
        >
            {(isCup || data.hasMultipleGroups) && grupo.groupName && (() => {
              // Normalizar nombre del grupo: buscar "Group" o "Grupo" seguido de una letra mayúscula
              const match = grupo.groupName.match(/(Group|Grupo)\s+([A-Z])/i);
              const cleanGroup = match?.[2]?.toUpperCase();
              const normalizedGroupName = cleanGroup ? `Grupo ${cleanGroup}` : grupo.groupName;
              
              return (
                <h3 style={{ 
                  marginBottom: '1rem', 
                  padding: '0.75rem', 
                  backgroundColor: '#1a1a1a', 
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '1.25rem',
                  fontWeight: 'bold'
                }}>
                  {normalizedGroupName}
                </h3>
              );
            })()}
            <div className="standings-table-wrapper">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th className="text-left">Equipo</th>
                    <th>PJ</th>
                    <th>G</th>
                    <th>E</th>
                    <th>P</th>
                    <th>GF</th>
                    <th>GC</th>
                    <th>DG</th>
                    <th>Pts</th>
                    <th>Rend%</th>
                    <th style={{ width: "100px" }}>Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // ✅ CHAMPIONS LEAGUE: Usar módulo exclusivo
                    if (isUEFACL) {
                      // ⚠️ IMPORTANTE: Para Champions League 2024+, necesitamos TODOS los equipos de TODOS los grupos
                      // Si hay múltiples grupos, aplanarlos en una sola tabla
                      let allTeams = [];
                      if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 1) {
                        // Aplanar todos los grupos en una sola tabla
                        console.log("🏆 [StandingsTable] Champions League: Aplanando múltiples grupos en tabla única");
                        allTeams = data.grupos.flatMap(g => g.tabla || []);
                        console.log(`🏆 [StandingsTable] Total equipos después de aplanar: ${allTeams.length}`);
                      } else {
                        // Si solo hay un grupo o tabla única, usar directamente
                        allTeams = grupo.tabla || [];
                      }
                      
                      const championsClassification = buildChampionsClassification(allTeams);
                      return championsClassification.map((team, index) => {
                        const visual = getChampionsRowVisualProps(team);
                        const rowStyle = {
                          borderLeft: visual.leftBarColor ? `4px solid ${visual.leftBarColor}` : undefined,
                          background: visual.backgroundGradient || visual.backgroundColor || undefined,
                          opacity: team.stage === "eliminated" ? 0.6 : 1
                        };
                        
                        return (
                          <tr
                            key={team.teamId || index}
                            className={["team-row", "champions-row", visual.className].filter(Boolean).join(" ")}
                            style={rowStyle}
                            title={visual.tooltip || undefined}
                          >
                            <td className="position-cell">{team.position}</td>
                            <td 
                              className="text-left"
                              style={{ cursor: team.teamId ? "pointer" : "default" }}
                              onClick={() => {
                                if (team.teamId && onTeamClick) {
                                  onTeamClick(team.teamId);
                                }
                              }}
                            >
                              <div className="team-cell">
                                {team.logo && (
                                  <img src={team.logo} alt={team.teamName} className="team-logo" style={{ width: "18px", height: "18px" }} />
                                )}
                                {visual.icon && <span style={{ marginRight: 6 }}>{visual.icon}</span>}
                                <span>{team.teamName}</span>
                              </div>
                            </td>
                            <td>{team.played || 0}</td>
                            <td>{team.won || 0}</td>
                            <td>{team.drawn || 0}</td>
                            <td>{team.lost || 0}</td>
                            <td>{team.goalsFor || 0}</td>
                            <td>{team.goalsAgainst || 0}</td>
                            <td className={`difference-cell ${team.goalsDiff > 0 ? "positive" : team.goalsDiff < 0 ? "negative" : ""}`}>
                              {team.goalsDiff > 0 ? "+" : ""}{team.goalsDiff || 0}
                            </td>
                            <td className="points-cell">{team.points || 0}</td>
                            <td>{team.originalData?.rendimiento || 0}%</td>
                            <td className="form-cell">
                              {team.form && team.form.split("").map((letra, idx) => {
                                let letraMostrar = letra;
                                if (letra === "W") letraMostrar = "G";
                                else if (letra === "D") letraMostrar = "E";
                                else if (letra === "L") letraMostrar = "P";
                                
                                return (
                                  <span key={idx} className={`form-badge ${getFormaClass(letra)}`}>
                                    {letraMostrar}
                                  </span>
                                );
                              })}
                            </td>
                          </tr>
                        );
                      });
                    }
                    
                    // Aplicar sistema modular de clasificación (solo para ligas, no copas)
                    let finalAllocations = [];
                    if (!isCup && leagueId) {
                      finalAllocations = applyCupAllocation(grupo.tabla, null, leagueId);
                      
                      // ✅ DIAGNÓSTICO: Log de clasificación final
                      console.table(finalAllocations.map(r => ({
                        team: r.teamName,
                        pos: r.position,
                        final: r.finalCompetition,
                        zone: r.zone
                      })));
                    } else {
                      // Para copas, mantener estructura original
                      finalAllocations = grupo.tabla.map((e, i) => ({
                        teamId: e.equipoId || e.teamId || e.id,
                        teamName: e.equipo || e.teamName || e.name,
                        position: e.posicion || i + 1,
                        points: e.puntos || e.points || 0,
                        goalsDiff: e.diferencia || e.goalsDiff || 0,
                        played: e.jugados || e.played || 0,
                        won: e.ganados || e.won || 0,
                        drawn: e.empatados || e.drawn || 0,
                        lost: e.perdidos || e.lost || 0,
                        goalsFor: e.golesFavor || e.goalsFor || 0,
                        goalsAgainst: e.golesContra || e.goalsAgainst || 0,
                        form: e.forma || e.form || "",
                        logo: e.logo || null,
                        finalCompetition: "none",
                        qualificationSource: null,
                        zone: "none",
                        // Datos originales para compatibilidad
                        originalData: e
                      }));
                    }

                    // Filtrar por zona activa si hay filtro
                    const filteredAllocations = activeFilter
                      ? finalAllocations.filter(a => {
                          if (isCup) {
                            if (activeFilter === 'clasificado') return a.position <= 2;
                            if (activeFilter === 'repechaje') return a.position === 3;
                            if (activeFilter === 'eliminado') return a.position === 4;
                            return true;
                          } else {
                            return a.finalCompetition === activeFilter || a.zone === activeFilter;
                          }
                        })
                      : finalAllocations;

                    return filteredAllocations.map((allocation, index) => {
                      const visual = isCup 
                        ? {
                            leftBarColor: getClassificationColor(allocation.position, grupo.tabla.length, true),
                            backgroundColor: null,
                            icon: null,
                            tooltip: null,
                            rowClassNames: []
                          }
                        : getVisualClassification(allocation);

                      const rowStyle = {
                        borderLeft: visual.leftBarColor ? `4px solid ${visual.leftBarColor}` : undefined,
                        backgroundColor: visual.backgroundColor || undefined,
                        opacity: isCup && allocation.position === 4 ? 0.5 : 1
                      };

                      const originalData = allocation.originalData || grupo.tabla.find(e => 
                        (e.equipoId || e.teamId || e.id) === allocation.teamId
                      ) || {};

                      return (
                        <tr
                          key={allocation.teamId || index}
                          className={["team-row", ...visual.rowClassNames].join(" ")}
                          style={rowStyle}
                          title={visual.tooltip || undefined}
                        >
                          <td className="position-cell">{allocation.position}</td>
                          <td 
                            className="text-left"
                            style={{ cursor: allocation.teamId ? "pointer" : "default" }}
                            onClick={() => {
                              if (allocation.teamId && onTeamClick) {
                                onTeamClick(allocation.teamId);
                              } else if (!allocation.teamId) {
                                console.error("❌ equipoId es undefined, null o no válido");
                                alert(`Error: No se pudo obtener el ID del equipo "${allocation.teamName}".`);
                              }
                            }}
                          >
                            <div className="team-cell">
                              {(allocation.logo || originalData.logo) && (
                                <img 
                                  src={allocation.logo || originalData.logo} 
                                  alt={allocation.teamName} 
                                  className="team-logo" 
                                  style={{ width: "18px", height: "18px" }} 
                                />
                              )}
                              {visual.icon && <span style={{ marginRight: 6 }}>{visual.icon}</span>}
                              <span>{allocation.teamName}</span>
                            </div>
                          </td>
                          <td>{allocation.played || originalData.jugados || 0}</td>
                          <td>{allocation.won || originalData.ganados || 0}</td>
                          <td>{allocation.drawn || originalData.empatados || 0}</td>
                          <td>{allocation.lost || originalData.perdidos || 0}</td>
                          <td>{allocation.goalsFor || originalData.golesFavor || 0}</td>
                          <td>{allocation.goalsAgainst || originalData.golesContra || 0}</td>
                          <td className={`difference-cell ${allocation.goalsDiff > 0 ? "positive" : allocation.goalsDiff < 0 ? "negative" : ""}`}>
                            {allocation.goalsDiff > 0 ? "+" : ""}{allocation.goalsDiff || originalData.diferencia || 0}
                          </td>
                          <td className="points-cell">{allocation.points || originalData.puntos || 0}</td>
                          <td>{originalData.rendimiento || 0}%</td>
                          <td className="form-cell">
                            {(allocation.form || originalData.forma) && (allocation.form || originalData.forma).split("").map((letra, idx) => {
                              let letraMostrar = letra;
                              if (letra === "W") letraMostrar = "G";
                              else if (letra === "D") letraMostrar = "E";
                              else if (letra === "L") letraMostrar = "P";
                              
                              return (
                                <span 
                                  key={idx} 
                                  className={`form-badge ${getFormaClass(letra)}`}
                                >
                                  {letraMostrar}
                                </span>
                              );
                            })}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            {/* ✅ NO mostrar leyenda de ligas nacionales en Champions League */}
            {!isUEFACL && (
              <Legend
                isCup={isCup}
                isChampionsLeague={false}
                leagueId={leagueId}
                onFilterChange={setActiveFilter}
              />
            )}
            {isUEFACL && <Legend isCup={false} isChampionsLeague={true} onFilterChange={setActiveFilter} />}
          </div>
        );
    });
    
    console.log("✅ Total elementos renderizados en map:", gruposRenderizados.length);
    console.log("✅ ===== FIN DE RENDERIZADO DE GRUPOS =====");
    
    console.log("✅ Retornando JSX con múltiples grupos. Total elementos en gruposRenderizados:", gruposRenderizados.length);
    console.log("✅ Estructura del JSX a retornar:", {
      className: "standings-multiple-groups",
      childrenCount: gruposRenderizados.length,
      firstChild: gruposRenderizados[0] ? "existe" : "no existe"
    });
    
    // ✅ VERIFICACIÓN FINAL: Confirmar que todos los grupos se están renderizando
    console.log("✅ ===== VERIFICACIÓN FINAL DEL JSX =====");
    console.log("✅ Total grupos en gruposRenderizados:", gruposRenderizados.length);
    console.log("✅ Grupos válidos (no null):", gruposRenderizados.filter(g => g !== null && g !== undefined).length);
    console.log("✅ Primer grupo:", gruposRenderizados[0] ? "existe" : "no existe");
    console.log("✅ Último grupo:", gruposRenderizados[gruposRenderizados.length - 1] ? "existe" : "no existe");
    
    // Filtrar grupos nulos (por si algún grupo no tiene datos)
    const gruposValidos = gruposRenderizados.filter(g => g !== null && g !== undefined);
    console.log("✅ Total grupos válidos a renderizar:", gruposValidos.length);
    
    if (gruposValidos.length === 0) {
      console.error("❌ ERROR: No hay grupos válidos para renderizar!");
      return <div>Error: No se pudieron cargar los grupos</div>;
    }
    
    return (
      <div 
        className="standings-multiple-groups" 
        style={{ 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
          minHeight: 'auto',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
        data-testid="standings-multiple-groups"
        data-total-grupos={gruposValidos.length}
      >
        {gruposValidos.map((grupoJSX, idx) => {
          console.log(`🔍 Renderizando grupo JSX ${idx + 1}/${gruposValidos.length} en el DOM`);
          return (
            <div 
              key={`grupo-wrapper-${idx}`} 
              data-grupo-index={idx} 
              style={{ 
                width: '100%', 
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                position: 'relative'
              }}
            >
              {grupoJSX}
            </div>
          );
        })}
        
        {/* ✅ MOSTRAR BRACKET PARA CHAMPIONS LEAGUE */}
        {isUEFACL && bracket && (
          <ChampionsBracket key="champions-bracket" bracket={bracket} />
        )}
      </div>
    );
  }
  
  console.log("⚠️ ===== NO SE CUMPLIÓ LA CONDICIÓN PARA RENDERIZAR MÚLTIPLES GRUPOS =====");
  console.log("⚠️ data.grupos:", data.grupos);
  console.log("⚠️ data.hasMultipleGroups:", data.hasMultipleGroups);
  console.log("⚠️ data.hasMultipleGroups === true?:", data.hasMultipleGroups === true);
  console.log("⚠️ Renderizando tabla única (fallback)");

  // ✅ RENDERIZAR TABLA ÚNICA (liga normal o primer grupo)
  console.log("✅ RENDERIZANDO TABLA ÚNICA. Equipos:", tabla.length);
  return (
    <div className="standings-table-wrapper">
      <table className="standings-table">
        <thead>
          <tr>
            <th style={{ width: "40px" }}>#</th>
            <th className="text-left">Equipo</th>
            <th>PJ</th>
            <th>G</th>
            <th>E</th>
            <th>P</th>
            <th>GF</th>
            <th>GC</th>
            <th>DG</th>
            <th>Pts</th>
            <th>Rend%</th>
            <th style={{ width: "100px" }}>Forma</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            // ✅ CHAMPIONS LEAGUE: Usar módulo exclusivo
            if (isUEFACL) {
              // ⚠️ IMPORTANTE: Para Champions League 2024+, necesitamos TODOS los equipos
              // Si hay múltiples grupos en data.grupos, aplanarlos
              let allTeams = [];
              if (data.grupos && Array.isArray(data.grupos) && data.grupos.length > 1) {
                // Aplanar todos los grupos en una sola tabla
                console.log("🏆 [StandingsTable] Champions League: Aplanando múltiples grupos en tabla única");
                allTeams = data.grupos.flatMap(g => g.tabla || []);
                console.log(`🏆 [StandingsTable] Total equipos después de aplanar: ${allTeams.length}`);
              } else {
                // Si solo hay una tabla, usar directamente
                allTeams = tabla || [];
              }
              
              const championsClassification = buildChampionsClassification(allTeams);
              return championsClassification.map((team, index) => {
                const visual = getChampionsRowVisualProps(team);
                const rowStyle = {
                  borderLeft: visual.leftBarColor ? `4px solid ${visual.leftBarColor}` : undefined,
                  background: visual.backgroundGradient || visual.backgroundColor || undefined,
                  opacity: team.stage === "eliminated" ? 0.6 : 1
                };
                
                return (
                  <tr
                    key={team.teamId || index}
                    className={["team-row", "champions-row", visual.className].filter(Boolean).join(" ")}
                    style={rowStyle}
                    title={visual.tooltip || undefined}
                  >
                    <td className="position-cell">{team.position}</td>
                    <td 
                      className="text-left"
                      style={{ cursor: team.teamId ? "pointer" : "default" }}
                      onClick={() => {
                        if (team.teamId && onTeamClick) {
                          onTeamClick(team.teamId);
                        }
                      }}
                    >
                      <div className="team-cell">
                        {team.logo && (
                          <img src={team.logo} alt={team.teamName} className="team-logo" style={{ width: "18px", height: "18px" }} />
                        )}
                        {visual.icon && <span style={{ marginRight: 6 }}>{visual.icon}</span>}
                        <span>{team.teamName}</span>
                      </div>
                    </td>
                    <td>{team.played || 0}</td>
                    <td>{team.won || 0}</td>
                    <td>{team.drawn || 0}</td>
                    <td>{team.lost || 0}</td>
                    <td>{team.goalsFor || 0}</td>
                    <td>{team.goalsAgainst || 0}</td>
                    <td className={`difference-cell ${team.goalsDiff > 0 ? "positive" : team.goalsDiff < 0 ? "negative" : ""}`}>
                      {team.goalsDiff > 0 ? "+" : ""}{team.goalsDiff || 0}
                    </td>
                    <td className="points-cell">{team.points || 0}</td>
                    <td>{team.originalData?.rendimiento || 0}%</td>
                    <td className="form-cell">
                      {team.form && team.form.split("").map((letra, idx) => {
                        let letraMostrar = letra;
                        if (letra === "W") letraMostrar = "G";
                        else if (letra === "D") letraMostrar = "E";
                        else if (letra === "L") letraMostrar = "P";
                        
                        return (
                          <span key={idx} className={`form-badge ${getFormaClass(letra)}`}>
                            {letraMostrar}
                          </span>
                        );
                      })}
                    </td>
                  </tr>
                );
              });
            }
            
            // Aplicar sistema modular de clasificación (solo para ligas, no copas)
            let finalAllocations = [];
            if (!isCup && leagueId) {
              finalAllocations = applyCupAllocation(tabla, null, leagueId);
              
              // ✅ DIAGNÓSTICO: Log de clasificación final
              console.table(finalAllocations.map(r => ({
                team: r.teamName,
                pos: r.position,
                final: r.finalCompetition,
                zone: r.zone
              })));
            } else {
              // Para copas, mantener estructura original
              finalAllocations = tabla.map((e, i) => ({
                teamId: e.equipoId || e.teamId || e.id,
                teamName: e.equipo || e.teamName || e.name,
                position: e.posicion || i + 1,
                points: e.puntos || e.points || 0,
                goalsDiff: e.diferencia || e.goalsDiff || 0,
                played: e.jugados || e.played || 0,
                won: e.ganados || e.won || 0,
                drawn: e.empatados || e.drawn || 0,
                lost: e.perdidos || e.lost || 0,
                goalsFor: e.golesFavor || e.goalsFor || 0,
                goalsAgainst: e.golesContra || e.goalsAgainst || 0,
                form: e.forma || e.form || "",
                logo: e.logo || null,
                finalCompetition: "none",
                qualificationSource: null,
                zone: "none",
                originalData: e
              }));
            }

            // Filtrar por zona activa si hay filtro
            const filteredAllocations = activeFilter
              ? finalAllocations.filter(a => {
                  // ✅ Filtrado para Champions League
                  if (isUEFACL) {
                    if (activeFilter === 'direct_round_of_16') return a.stage === 'direct_round_of_16';
                    if (activeFilter === 'playoff') return a.stage === 'playoff';
                    if (activeFilter === 'eliminated') return a.stage === 'eliminated';
                    return true;
                  }
                  // Filtrado para copas
                  if (isCup) {
                    if (activeFilter === 'clasificado') return a.position <= 2;
                    if (activeFilter === 'repechaje') return a.position === 3;
                    if (activeFilter === 'eliminado') return a.position === 4;
                    return true;
                  }
                  // Filtrado para ligas nacionales
                  return a.finalCompetition === activeFilter || a.zone === activeFilter;
                })
              : finalAllocations;

            return filteredAllocations.map((allocation, index) => {
              const visual = isCup 
                ? {
                    leftBarColor: getClassificationColor(allocation.position, tabla.length, true),
                    backgroundColor: null,
                    icon: null,
                    tooltip: null,
                    rowClassNames: []
                  }
                : getVisualClassification(allocation);

              const rowStyle = {
                borderLeft: visual.leftBarColor ? `4px solid ${visual.leftBarColor}` : undefined,
                backgroundColor: visual.backgroundColor || undefined,
                opacity: isCup && allocation.position === 4 ? 0.5 : 1
              };

              const originalData = allocation.originalData || tabla.find(e => 
                (e.equipoId || e.teamId || e.id) === allocation.teamId
              ) || {};

              return (
                <tr
                  key={allocation.teamId || index}
                  className={["team-row", ...visual.rowClassNames].join(" ")}
                  style={rowStyle}
                  title={visual.tooltip || undefined}
                >
                  <td className="position-cell">{allocation.position}</td>
                  <td 
                    className="text-left"
                    style={{ cursor: allocation.teamId ? "pointer" : "default" }}
                    onClick={() => {
                      if (allocation.teamId && onTeamClick) {
                        onTeamClick(allocation.teamId);
                      } else if (!allocation.teamId) {
                        console.error("❌ equipoId es undefined, null o no válido");
                        alert(`Error: No se pudo obtener el ID del equipo "${allocation.teamName}".`);
                      }
                    }}
                  >
                    <div className="team-cell">
                      {(allocation.logo || originalData.logo) && (
                        <img 
                          src={allocation.logo || originalData.logo} 
                          alt={allocation.teamName} 
                          className="team-logo" 
                          style={{ width: "18px", height: "18px" }} 
                        />
                      )}
                      {visual.icon && <span style={{ marginRight: 6 }}>{visual.icon}</span>}
                      <span>{allocation.teamName}</span>
                    </div>
                  </td>
                  <td>{allocation.played || originalData.jugados || 0}</td>
                  <td>{allocation.won || originalData.ganados || 0}</td>
                  <td>{allocation.drawn || originalData.empatados || 0}</td>
                  <td>{allocation.lost || originalData.perdidos || 0}</td>
                  <td>{allocation.goalsFor || originalData.golesFavor || 0}</td>
                  <td>{allocation.goalsAgainst || originalData.golesContra || 0}</td>
                  <td className={`difference-cell ${allocation.goalsDiff > 0 ? "positive" : allocation.goalsDiff < 0 ? "negative" : ""}`}>
                    {allocation.goalsDiff > 0 ? "+" : ""}{allocation.goalsDiff || originalData.diferencia || 0}
                  </td>
                  <td className="points-cell">{allocation.points || originalData.puntos || 0}</td>
                  <td>{originalData.rendimiento || 0}%</td>
                  <td className="form-cell">
                    {(allocation.form || originalData.forma) && (allocation.form || originalData.forma).split("").map((letra, idx) => {
                      let letraMostrar = letra;
                      if (letra === "W") letraMostrar = "G";
                      else if (letra === "D") letraMostrar = "E";
                      else if (letra === "L") letraMostrar = "P";
                      
                      return (
                        <span 
                          key={idx} 
                          className={`form-badge ${getFormaClass(letra)}`}
                        >
                          {letraMostrar}
                        </span>
                      );
                    })}
                  </td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
      {/* ✅ NO mostrar leyenda de ligas nacionales en Champions League */}
      {!isUEFACL && (
        <Legend
          isCup={isCup}
          isChampionsLeague={false}
          leagueId={leagueId}
          onFilterChange={setActiveFilter}
        />
      )}
      {isUEFACL && <Legend isCup={false} isChampionsLeague={true} onFilterChange={setActiveFilter} />}
      
      {/* ✅ MOSTRAR BRACKET PARA CHAMPIONS LEAGUE */}
      {isUEFACL && bracket && (
        <ChampionsBracket bracket={bracket} />
      )}
    </div>
  );
}
