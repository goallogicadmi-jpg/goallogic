/**
 * Script de prueba para diagnosticar el problema de grupos en copas internacionales
 * Prueba: Copa Libertadores (ID 13) y Copa Sudamericana (ID 15)
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

if (!API_KEY) {
  console.error('❌ ERROR: API_KEY no está definida en .env');
  process.exit(1);
}

const apiHeaders = {
  'x-apisports-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io'
};

async function testCupCompetition(competitionId, competitionName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PROBANDO: ${competitionName} (ID: ${competitionId})`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Obtener información de la competición (temporadas disponibles)
    console.log(`1️⃣ Obteniendo información de la competición...`);
    const leagueInfoResponse = await axios.get(
      `${API_BASE}/leagues?id=${competitionId}`,
      { headers: apiHeaders }
    );

    if (!leagueInfoResponse.data.response || leagueInfoResponse.data.response.length === 0) {
      console.error(`❌ No se encontró información para la competición ${competitionId}`);
      return;
    }

    const leagueInfo = leagueInfoResponse.data.response[0];
    const seasons = leagueInfo.seasons || [];
    const currentSeason = seasons.find(s => s.current) || seasons[seasons.length - 1];

    if (!currentSeason) {
      console.error(`❌ No se encontró temporada para la competición ${competitionId}`);
      return;
    }

    // Probar con múltiples temporadas para encontrar datos
    const seasonsToTest = [];
    if (currentSeason) {
      seasonsToTest.push(currentSeason.year);
    }
    // Agregar temporadas recientes
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 2; year--) {
      if (!seasonsToTest.includes(year)) {
        seasonsToTest.push(year);
      }
    }

    console.log(`✅ Temporadas a probar: ${seasonsToTest.join(', ')}`);
    
    let standingsData = null;
    let seasonUsed = null;

    for (const testSeason of seasonsToTest) {
      console.log(`\n   Probando temporada ${testSeason}...`);
      try {
        const testResponse = await axios.get(
          `${API_BASE}/standings?league=${competitionId}&season=${testSeason}`,
          { headers: apiHeaders }
        );

        if (testResponse.data.response && testResponse.data.response.length > 0) {
          const testStandings = testResponse.data.response[0].league?.standings;
          if (testStandings && Array.isArray(testStandings) && testStandings.length > 0) {
            standingsData = testResponse.data;
            seasonUsed = testSeason;
            console.log(`   ✅ Datos encontrados para temporada ${testSeason}`);
            break;
          }
        }
      } catch (error) {
        // Continuar con la siguiente temporada
      }
    }

    if (!standingsData) {
      console.error(`❌ No se encontraron standings para ${competitionName} en ninguna temporada probada`);
      return;
    }

    const season = seasonUsed;
    console.log(`\n✅ Usando temporada: ${season}`);

    // 2. Obtener standings de la competición
    console.log(`\n2️⃣ Obteniendo standings de la competición...`);
    const standingsResponse = await axios.get(
      `${API_BASE}/standings?league=${competitionId}&season=${season}`,
      { headers: apiHeaders }
    );

    if (!standingsResponse.data.response || standingsResponse.data.response.length === 0) {
      console.error(`❌ No se encontraron standings para ${competitionName} temporada ${season}`);
      return;
    }

    console.log(`✅ Respuesta recibida:`);
    console.log(`   - Total elementos en response: ${standingsResponse.data.response.length}`);

    // Analizar cada elemento de response
    standingsResponse.data.response.forEach((item, idx) => {
      console.log(`\n   📊 Elemento ${idx + 1} de ${standingsResponse.data.response.length}:`);
      console.log(`      - League ID: ${item.league?.id}`);
      console.log(`      - League Name: ${item.league?.name}`);
      console.log(`      - Country: ${item.country?.name || 'N/A'}`);
      console.log(`      - Has Standings: ${!!item.league?.standings}`);
      
      if (item.league?.standings) {
        const standings = item.league.standings;
        console.log(`      - Standings Type: ${Array.isArray(standings) ? 'array' : typeof standings}`);
        console.log(`      - Standings Length: ${Array.isArray(standings) ? standings.length : 'N/A'}`);
        
        if (Array.isArray(standings) && standings.length > 0) {
          console.log(`      - First Element Type: ${Array.isArray(standings[0]) ? 'array' : typeof standings[0]}`);
          
          if (Array.isArray(standings[0])) {
            console.log(`      - ✅ ESTRUCTURA: Array de arrays (cada sub-array es un grupo)`);
            console.log(`      - Total grupos detectados: ${standings.length}`);
            
            standings.forEach((group, groupIdx) => {
              if (Array.isArray(group) && group.length > 0) {
                const groupName = group[0].group || `Grupo ${String.fromCharCode(65 + groupIdx)}`;
                console.log(`         - Grupo ${groupIdx + 1}: "${groupName}" con ${group.length} equipos`);
              }
            });
          } else {
            console.log(`      - ⚠️ ESTRUCTURA: Array simple (no es array de arrays)`);
            console.log(`      - Total elementos: ${standings.length}`);
            
            // Verificar si tiene propiedad 'group'
            const hasGroupProperty = standings.some(item => item && item.group);
            if (hasGroupProperty) {
              console.log(`      - ✅ Tiene propiedad 'group' en los elementos`);
              const uniqueGroups = [...new Set(standings.map(item => item.group).filter(Boolean))];
              console.log(`      - Grupos únicos encontrados: ${uniqueGroups.length} (${uniqueGroups.join(', ')})`);
            } else {
              console.log(`      - ⚠️ NO tiene propiedad 'group' en los elementos`);
            }
          }
        }
      }
    });

    // 3. Análisis detallado de la estructura
    console.log(`\n3️⃣ Análisis detallado de la estructura...`);
    const leagueData = standingsResponse.data.response[0];
    const standings = leagueData.league.standings;

    if (Array.isArray(standings)) {
      if (standings.length > 0 && Array.isArray(standings[0])) {
        console.log(`✅ ESTRUCTURA CONFIRMADA: Array de arrays (${standings.length} grupos)`);
        console.log(`\n   Detalles de cada grupo:`);
        standings.forEach((group, idx) => {
          if (Array.isArray(group) && group.length > 0) {
            const groupName = group[0].group || `Grupo ${String.fromCharCode(65 + idx)}`;
            console.log(`   - ${groupName}: ${group.length} equipos`);
            console.log(`     Equipos: ${group.slice(0, 3).map(t => t.team?.name || t.name).join(', ')}${group.length > 3 ? '...' : ''}`);
          }
        });
      } else {
        console.log(`⚠️ ESTRUCTURA: Array simple con ${standings.length} elementos`);
        console.log(`   - No es array de arrays, cada elemento es: ${typeof standings[0]}`);
      }
    } else {
      console.log(`❌ ESTRUCTURA INESPERADA: standings no es un array`);
      console.log(`   - Tipo: ${typeof standings}`);
    }

    // 4. Resumen final
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 RESUMEN PARA ${competitionName}:`);
    console.log(`${'='.repeat(80)}`);
    console.log(`   - Competition ID: ${competitionId}`);
    console.log(`   - Season: ${season}`);
    console.log(`   - Response elements: ${standingsResponse.data.response.length}`);
    
    if (Array.isArray(standings) && standings.length > 0 && Array.isArray(standings[0])) {
      console.log(`   - ✅ Grupos detectados: ${standings.length}`);
      console.log(`   - Estructura: Array de arrays`);
    } else if (Array.isArray(standings)) {
      const uniqueGroups = [...new Set(standings.map(item => item.group).filter(Boolean))];
      console.log(`   - ⚠️ Grupos detectados: ${uniqueGroups.length} (por propiedad 'group')`);
      console.log(`   - Estructura: Array simple con propiedad 'group'`);
    } else {
      console.log(`   - ❌ No se detectaron grupos`);
    }

  } catch (error) {
    console.error(`❌ Error probando ${competitionName}:`, error.response?.data || error.message);
  }
}

async function runTests() {
  console.log('🚀 INICIANDO PRUEBAS DE GRUPOS EN COPAS INTERNACIONALES\n');

  // Probar Copa Libertadores (ID 13)
  await testCupCompetition(13, 'Copa Libertadores');

  // Probar Copa Sudamericana (ID 15)
  await testCupCompetition(15, 'Copa Sudamericana');

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ PRUEBAS COMPLETADAS`);
  console.log(`${'='.repeat(80)}\n`);
}

// Ejecutar pruebas
runTests().catch(error => {
  console.error('❌ Error ejecutando pruebas:', error);
  process.exit(1);
});
