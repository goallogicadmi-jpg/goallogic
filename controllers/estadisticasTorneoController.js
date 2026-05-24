const axios = require("axios");
const {
  buildChampionsLeaguePayload,
  isChampionsLeague,
} = require("../utils/championsLeagueFormatter");
const {
  applyLigaBetPlayStandingsResponse,
  isLigaBetPlay,
  usesDirectKnockoutFormat,
} = require("../utils/ligaBetPlayFormat");
const { buildKnockoutBracketFromFixtures } = require("../utils/cupCompetitionUtils");

const apiHeaders = {
  "x-apisports-key": process.env.API_KEY,
  "x-rapidapi-host": "v3.football.api-sports.io"
};

const getEstadisticasTorneo = async (req, res) => {
  try {
    const { leagueId, season } = req.query;

    console.log("📥 Parámetros recibidos:", { leagueId, season });

    if (!leagueId || !season) {
      return res.status(400).json({ message: "Faltan parámetros: leagueId, season" });
    }

    // Lógica de fallback para temporadas
    const requestedSeason = parseInt(season, 10);
    let seasonToUse = requestedSeason;
    let standingsResponse = null;
    let dataFound = false;
    const skipSeasonFallback = isLigaBetPlay(leagueId);
    const maxAttempts = skipSeasonFallback ? 1 : 3;

    for (let attempt = 0; attempt < maxAttempts && !dataFound; attempt++) {
      const currentSeason = seasonToUse - attempt;
      const urlCompleta = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${currentSeason}`;
      
      console.log(`🔄 Intento ${attempt + 1}: URL enviada a la API externa:`, urlCompleta);
      console.log(`📊 Parámetros: leagueId=${leagueId}, season=${currentSeason}`);

      try {
        standingsResponse = await axios.get(urlCompleta, { headers: apiHeaders });
        
        console.log("📦 Respuesta completa de la API externa:", JSON.stringify(standingsResponse.data, null, 2));
        console.log("📦 Tiene 'response'?:", standingsResponse.data.response !== undefined);
        console.log("📦 Longitud de response:", standingsResponse.data.response?.length || 0);

        if (standingsResponse.data.response && standingsResponse.data.response.length > 0) {
          dataFound = true;
          seasonToUse = currentSeason;
          console.log(`✅ Datos encontrados para temporada ${currentSeason}`);
        } else {
          console.warn(`⚠️ No hay datos para temporada ${currentSeason}, intentando siguiente...`);
        }
      } catch (err) {
        console.error(`❌ Error en intento ${attempt + 1} (temporada ${currentSeason}):`, err.response?.data || err.message);
        if (attempt === maxAttempts - 1) {
          throw err;
        }
      }
    }

    if (
      !dataFound &&
      Number(leagueId) === 1 &&
      requestedSeason >= 2026
    ) {
      const fallbackSeason = 2022;
      const fallbackUrl = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${fallbackSeason}`;
      console.log(`🔄 Mundial ${requestedSeason} sin datos; probando edición ${fallbackSeason}:`, fallbackUrl);
      try {
        standingsResponse = await axios.get(fallbackUrl, { headers: apiHeaders });
        if (standingsResponse.data.response?.length > 0) {
          dataFound = true;
          seasonToUse = fallbackSeason;
        }
      } catch (fallbackErr) {
        console.error(`❌ Fallback Mundial ${fallbackSeason}:`, fallbackErr.message);
      }
    }

    if (!dataFound || !standingsResponse || !standingsResponse.data.response || standingsResponse.data.response.length === 0) {
      console.error("❌ No se encontraron datos del torneo después de todos los intentos");
      return res.status(404).json({ 
        message: `No se encontraron datos del torneo para la liga ${leagueId} en las temporadas ${seasonToUse}, ${seasonToUse - 1}, ${seasonToUse - 2}` 
      });
    }

    const leagueData = standingsResponse.data.response[0];
    const allStandings = leagueData.league.standings;
    const isUefaChampionsLeague = isChampionsLeague(leagueId, leagueData?.league?.name);
    
    // ✅ DETECTAR SI HAY MÚLTIPLES GRUPOS
    // Si standings es un array de arrays, hay múltiples grupos
    // Si standings es un array simple, es una liga normal sin grupos
    const hasMultipleGroups = Array.isArray(allStandings) &&
                             allStandings.length > 1 &&
                             Array.isArray(allStandings[0]);
    
    console.log(`📊 [getEstadisticasTorneo] Estructura de standings:`, {
      isArray: Array.isArray(allStandings),
      length: Array.isArray(allStandings) ? allStandings.length : 'N/A',
      firstElementIsArray: Array.isArray(allStandings) && allStandings.length > 0 ? Array.isArray(allStandings[0]) : 'N/A',
      hasMultipleGroups: hasMultipleGroups
    });

    // Función auxiliar para procesar un equipo
    async function processTeam(team, leagueId, season) {
        // Log para ver la estructura real del objeto team
        console.log("🔍 Estructura del objeto team de la API:");
        console.log("🔍 team completo:", JSON.stringify(team, null, 2));
        console.log("🔍 team.team:", team.team);
        console.log("🔍 team.team?.id:", team.team?.id);
        console.log("🔍 team.id:", team.id);
        console.log("🔍 Todas las keys de team:", Object.keys(team || {}));
        console.log("🔍 Todas las keys de team.team:", Object.keys(team.team || {}));
        
        // Obtener últimos 6 partidos del equipo
        let tendencias = [];
        const teamIdForFixtures = team.team?.id;
        if (!teamIdForFixtures) {
          console.error(`❌ No se puede obtener fixtures: team.team.id no existe para ${team.team?.name || 'equipo desconocido'}`);
        }
        
        try {
          const fixturesResponse = await axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${teamIdForFixtures}&league=${leagueId}&season=${season}&last=6`,
            { headers: apiHeaders }
          );

          const fixtures = fixturesResponse.data.response || [];

          tendencias = fixtures.map((fix) => {
            const esLocal = fix.teams.home.id === team.team.id;
            const golesFavor = esLocal ? fix.goals.home : fix.goals.away;
            const golesContra = esLocal ? fix.goals.away : fix.goals.home;
            const rival = esLocal ? fix.teams.away.name : fix.teams.home.name;

            let resultado = "Empate";
            if (golesFavor > golesContra) resultado = "Victoria";
            else if (golesFavor < golesContra) resultado = "Derrota";

            return {
              rival,
              resultado,
              marcador: `${golesFavor}-${golesContra}`,
              fecha: fix.fixture.date.split("T")[0]
            };
          });
        } catch (err) {
          console.error(`Error obteniendo fixtures de ${team.team.name}:`, err.message);
        }

        const jugados = team.all.played;
        const puntos = team.points;
        const rendimiento = jugados > 0 ? Number(((puntos / (jugados * 3)) * 100).toFixed(2)) : 0;

        // Asegurar que tenemos el ID del equipo - la API de football devuelve team.team.id
        const teamId = team.team?.id;
        
        if (!teamId) {
          console.error(`❌ No se pudo obtener el ID del equipo`);
          console.error(`❌ team.team:`, team.team);
          console.error(`❌ team.team?.id:`, team.team?.id);
          console.error(`❌ Estructura completa de team:`, JSON.stringify(team, null, 2));
        } else {
          console.log(`✅ ID del equipo ${team.team?.name} obtenido correctamente: ${teamId}`);
        }
        
        const equipoData = {
          posicion: team.rank,
          equipo: team.team?.name || team.name || "Equipo desconocido",
          equipoId: teamId,
          logo: team.team?.logo || team.logo || null,
          puntos: team.points,
          jugados: team.all?.played || 0,
          ganados: team.all?.win || 0,
          empatados: team.all?.draw || 0,
          perdidos: team.all?.lose || 0,
          golesFavor: team.all?.goals?.for || 0,
          golesContra: team.all?.goals?.against || 0,
          diferencia: team.goalsDiff || 0,
          rendimiento,
          forma: team.form || "",
          tendencias
        };
        
        // Log para verificar que equipoId se está agregando correctamente
        if (!equipoData.equipoId) {
          console.warn(`⚠️ Equipo ${equipoData.equipo} NO tiene equipoId. Estructura completa:`, JSON.stringify(team, null, 2));
        } else {
          console.log(`✅ Equipo ${equipoData.equipo} tiene equipoId: ${equipoData.equipoId}`);
        }
        
        return equipoData;
    }

    // ✅ PROCESAR TODOS LOS GRUPOS SI HAY MÚLTIPLES
    let grupos = [];
    
    if (hasMultipleGroups) {
      console.log(`✅ [getEstadisticasTorneo] Detectados ${allStandings.length} grupos`);
      
      // Procesar cada grupo
      for (let groupIndex = 0; groupIndex < allStandings.length; groupIndex++) {
        const groupStandings = allStandings[groupIndex];
        const groupName = groupStandings[0]?.group || `Grupo ${String.fromCharCode(65 + groupIndex)}`;
        
        console.log(`📊 [getEstadisticasTorneo] Procesando grupo ${groupIndex + 1}/${allStandings.length}: "${groupName}"`);
        
        const tablaGrupo = await Promise.all(
          groupStandings.map(async (team) => {
            return await processTeam(team, leagueId, season);
          })
        );
        
        grupos.push({
          groupName: groupName,
          groupIndex: groupIndex,
          tabla: tablaGrupo
        });
      }
    } else {
      // ✅ LIGA NORMAL (SIN GRUPOS) - COMPATIBILIDAD CON CÓDIGO EXISTENTE
      console.log(`✅ [getEstadisticasTorneo] Liga normal sin grupos, procesando única tabla`);
      const standings = allStandings[0] || allStandings; // Fallback para compatibilidad
      
      const tabla = await Promise.all(
        standings.map(async (team) => {
          return await processTeam(team, leagueId, season);
        })
      );
      
      grupos.push({
        groupName: null, // null indica que no hay grupos
        groupIndex: 0,
        tabla: tabla
      });
    }

    // ✅ RESPUESTA CON ESTRUCTURA QUE SOPORTA MÚLTIPLES GRUPOS
    let respuesta = {
      liga: leagueData.league.name,
      logo: leagueData.league.logo,
      temporada: seasonToUse.toString(),
      hasMultipleGroups: hasMultipleGroups,
      grupos: grupos,
      // ✅ COMPATIBILIDAD: Mantener 'tabla' para código existente (primer grupo o única tabla)
      tabla: grupos.length > 0 ? grupos[0].tabla : []
    };

    respuesta = applyLigaBetPlayStandingsResponse(respuesta, leagueId, requestedSeason);

    if (isLigaBetPlay(leagueId) && usesDirectKnockoutFormat(seasonToUse)) {
      try {
        const fixturesResponse = await axios.get(
          `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${seasonToUse}`,
          { headers: apiHeaders }
        );
        const bracket = buildKnockoutBracketFromFixtures(fixturesResponse.data.response || []);
        if (bracket) {
          respuesta.bracket = bracket;
          respuesta.hasKnockoutBracket = true;
        }
      } catch (fixturesError) {
        console.error(
          "⚠️ No se pudieron obtener fixtures de playoffs Liga BetPlay:",
          fixturesError.response?.data || fixturesError.message
        );
      }
    }

    if (isUefaChampionsLeague) {
      try {
        const fixturesResponse = await axios.get(
          `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${seasonToUse}`,
          { headers: apiHeaders }
        );

        const championsPayload = buildChampionsLeaguePayload({
          season: seasonToUse,
          leagueName: leagueData.league.name,
          standingsTable: respuesta.tabla,
          fixtures: fixturesResponse.data.response || [],
        });

        Object.assign(respuesta, championsPayload);
      } catch (fixturesError) {
        console.error("⚠️ No se pudieron obtener los fixtures oficiales de Champions League:", fixturesError.response?.data || fixturesError.message);
      }
    }
    
    console.log(`✅ [getEstadisticasTorneo] ===== RESPUESTA FINAL =====`);
    console.log(`✅ [getEstadisticasTorneo] hasMultipleGroups: ${respuesta.hasMultipleGroups}`);
    console.log(`✅ [getEstadisticasTorneo] grupos.length: ${respuesta.grupos.length}`);
    console.log(`✅ [getEstadisticasTorneo] tabla.length: ${respuesta.tabla.length}`);
    if (respuesta.grupos.length > 0) {
      console.log(`✅ [getEstadisticasTorneo] Nombres de grupos:`, respuesta.grupos.map(g => g.groupName || 'Sin nombre'));
    }
    
    res.json(respuesta);

  } catch (error) {
    console.error("Error al obtener estadísticas del torneo:", error.response?.data || error);
    res.status(500).json({ message: "Error al obtener estadísticas del torneo" });
  }
};

module.exports = { getEstadisticasTorneo };
