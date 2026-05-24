/**
 * Script para probar directamente la API de API-Football
 * Esto nos ayudará a identificar si el problema está en nuestra lógica o en la API
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

async function probarAPIDirecta() {
  console.log('🚀 PROBANDO API DE API-FOOTBALL DIRECTAMENTE\n');
  
  const teamId = 33; // Manchester United
  const leagueId = 39; // Premier League
  const season = 2024; // Temporada actual (ajustar según necesidad)
  
  console.log(`📋 Parámetros:`);
  console.log(`   - TeamId: ${teamId}`);
  console.log(`   - LeagueId: ${leagueId}`);
  console.log(`   - Season: ${season}\n`);
  
  // 1. Probar obtener season de la liga
  console.log(`${'='.repeat(80)}`);
  console.log(`1️⃣ PROBANDO: Obtener información de la liga (para season)`);
  console.log(`${'='.repeat(80)}`);
  try {
    const leagueResponse = await axios.get(
      `${API_BASE}/leagues?id=${leagueId}`,
      { headers: apiHeaders }
    );
    
    console.log(`✅ Status: ${leagueResponse.status}`);
    if (leagueResponse.data?.response?.[0]?.seasons) {
      const currentSeason = leagueResponse.data.response[0].seasons.find(s => s.current === true);
      if (currentSeason) {
        console.log(`✅ Season actual encontrada: ${currentSeason.year}`);
        console.log(`   Current: ${currentSeason.current}`);
        console.log(`   Start: ${currentSeason.start}`);
        console.log(`   End: ${currentSeason.end}`);
      } else {
        console.log(`⚠️ No se encontró season actual`);
        console.log(`   Temporadas disponibles:`, leagueResponse.data.response[0].seasons.map(s => s.year));
      }
    } else {
      console.log(`⚠️ No se encontraron seasons en la respuesta`);
      console.log(`   Respuesta:`, JSON.stringify(leagueResponse.data, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 2. Probar obtener estadísticas del equipo
  console.log(`\n${'='.repeat(80)}`);
  console.log(`2️⃣ PROBANDO: Obtener estadísticas del equipo`);
  console.log(`${'='.repeat(80)}`);
  try {
    const statsResponse = await axios.get(
      `${API_BASE}/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
      { headers: apiHeaders }
    );
    
    console.log(`✅ Status: ${statsResponse.status}`);
    if (statsResponse.data?.response?.[0]) {
      const stats = statsResponse.data.response[0];
      console.log(`✅ Estadísticas obtenidas`);
      console.log(`   - Tiene statistics: ${!!stats.statistics}`);
      console.log(`   - Tiene fixtures: ${!!stats.fixtures}`);
      
      if (stats.statistics?.[0]) {
        const stat = stats.statistics[0];
        console.log(`\n   📊 Estadísticas clave:`);
        console.log(`      - Goles a favor: ${stat.goals?.for?.total?.total ?? 'N/A'}`);
        console.log(`      - Goles en contra: ${stat.goals?.against?.total?.total ?? 'N/A'}`);
        console.log(`      - Tiros al arco: ${stat.shots?.on?.total ?? 'N/A'}`);
        console.log(`      - xG: ${stat.goals?.for?.expected?.total ?? 'N/A'}`);
        console.log(`      - xGA: ${stat.goals?.against?.expected?.total ?? 'N/A'}`);
      } else {
        console.log(`   ⚠️ No hay statistics[0] en la respuesta`);
      }
      
      if (stats.fixtures) {
        console.log(`\n   📅 Fixtures:`);
        console.log(`      - Partidos jugados: ${stats.fixtures.played?.total ?? 'N/A'}`);
        console.log(`      - Ganados: ${stats.fixtures.wins?.total ?? 'N/A'}`);
        console.log(`      - Empatados: ${stats.fixtures.draws?.total ?? 'N/A'}`);
        console.log(`      - Perdidos: ${stats.fixtures.loses?.total ?? 'N/A'}`);
      }
    } else {
      console.log(`⚠️ No se encontraron estadísticas en la respuesta`);
      console.log(`   Respuesta:`, JSON.stringify(statsResponse.data, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 3. Probar obtener standings
  console.log(`\n${'='.repeat(80)}`);
  console.log(`3️⃣ PROBANDO: Obtener standings (tabla de posiciones)`);
  console.log(`${'='.repeat(80)}`);
  try {
    const standingsResponse = await axios.get(
      `${API_BASE}/standings?league=${leagueId}&season=${season}`,
      { headers: apiHeaders }
    );
    
    console.log(`✅ Status: ${standingsResponse.status}`);
    if (standingsResponse.data?.response?.[0]?.league?.standings?.[0]) {
      const standings = standingsResponse.data.response[0].league.standings[0];
      const teamStanding = standings.find(s => s.team?.id === teamId);
      
      if (teamStanding) {
        console.log(`✅ Equipo encontrado en standings`);
        console.log(`   - Posición: ${teamStanding.rank}`);
        console.log(`   - Puntos: ${teamStanding.points}`);
        console.log(`   - Partidos jugados: ${teamStanding.all?.played}`);
        console.log(`   - Ganados: ${teamStanding.all?.win}`);
        console.log(`   - Empatados: ${teamStanding.all?.draw}`);
        console.log(`   - Perdidos: ${teamStanding.all?.lose}`);
      } else {
        console.log(`⚠️ Equipo ${teamId} no encontrado en standings`);
        console.log(`   Total de equipos en standings: ${standings.length}`);
        console.log(`   Primeros 3 equipos:`, standings.slice(0, 3).map(s => `${s.team.name} (${s.team.id})`));
      }
    } else {
      console.log(`⚠️ No se encontraron standings en la respuesta`);
      console.log(`   Respuesta:`, JSON.stringify(standingsResponse.data, null, 2));
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ PRUEBAS COMPLETADAS`);
  console.log(`${'='.repeat(80)}\n`);
}

probarAPIDirecta().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
