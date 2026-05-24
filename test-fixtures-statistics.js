/**
 * Script para probar si el endpoint de fixtures/statistics tiene shots y expected goals
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

async function probarFixturesStatistics() {
  console.log('🔍 PROBANDO ENDPOINT: /fixtures/statistics\n');
  
  const teamId = 33; // Manchester United
  const leagueId = 39; // Premier League
  const season = 2025;
  
  console.log(`📋 Parámetros:`);
  console.log(`   - TeamId: ${teamId}`);
  console.log(`   - LeagueId: ${leagueId}`);
  console.log(`   - Season: ${season}\n`);
  
  // 1. Obtener un fixture reciente del equipo
  console.log(`${'='.repeat(80)}`);
  console.log(`1️⃣ Obtener un fixture reciente del equipo`);
  console.log(`${'='.repeat(80)}`);
  
  try {
    const fixturesResponse = await axios.get(
      `${API_BASE}/fixtures?team=${teamId}&league=${leagueId}&season=${season}&last=1`,
      { headers: apiHeaders }
    );
    
    if (!fixturesResponse.data?.response || fixturesResponse.data.response.length === 0) {
      console.log(`⚠️ No se encontraron fixtures recientes`);
      return;
    }
    
    const fixture = fixturesResponse.data.response[0];
    const fixtureId = fixture.fixture?.id;
    
    console.log(`✅ Fixture encontrado:`);
    console.log(`   - ID: ${fixtureId}`);
    console.log(`   - ${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name}`);
    console.log(`   - Fecha: ${fixture.fixture?.date}\n`);
    
    if (!fixtureId) {
      console.log(`⚠️ No se pudo obtener fixtureId`);
      return;
    }
    
    // 2. Obtener estadísticas del fixture
    console.log(`${'='.repeat(80)}`);
    console.log(`2️⃣ Obtener estadísticas del fixture (fixtureId: ${fixtureId})`);
    console.log(`${'='.repeat(80)}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const statsResponse = await axios.get(
      `${API_BASE}/fixtures/statistics?fixture=${fixtureId}`,
      { headers: apiHeaders }
    );
    
    console.log(`✅ Status: ${statsResponse.status}`);
    
    if (statsResponse.data?.response && statsResponse.data.response.length > 0) {
      const stats = statsResponse.data.response;
      
      // Buscar estadísticas del equipo (puede ser home o away)
      const teamStats = stats.find(s => s.team?.id === teamId);
      
      if (teamStats && teamStats.statistics) {
        console.log(`\n✅ Estadísticas encontradas para el equipo`);
        console.log(`\n📊 CAMPOS DISPONIBLES:`);
        
        teamStats.statistics.forEach(stat => {
          console.log(`   - ${stat.type}: ${stat.value}`);
        });
        
        // Buscar específicamente shots y expected goals
        const shotsOn = teamStats.statistics.find(s => s.type === 'Shots on Goal' || s.type === 'Shots on Target');
        const shotsTotal = teamStats.statistics.find(s => s.type === 'Total Shots' || s.type === 'Shots Total');
        const xG = teamStats.statistics.find(s => s.type === 'Expected Goals' || s.type === 'xG');
        
        console.log(`\n🎯 CAMPOS ESPECÍFICOS BUSCADOS:`);
        console.log(`   - Shots on Goal: ${shotsOn ? shotsOn.value : 'NO DISPONIBLE'}`);
        console.log(`   - Total Shots: ${shotsTotal ? shotsTotal.value : 'NO DISPONIBLE'}`);
        console.log(`   - Expected Goals (xG): ${xG ? xG.value : 'NO DISPONIBLE'}`);
        
        if (shotsOn || shotsTotal || xG) {
          console.log(`\n✅ ¡ENCONTRADO! Estos datos SÍ están disponibles en fixtures/statistics`);
          console.log(`   Pero solo para partidos individuales, no para estadísticas de temporada completa.`);
        } else {
          console.log(`\n❌ Estos campos NO están disponibles ni siquiera en fixtures/statistics`);
        }
      } else {
        console.log(`⚠️ No se encontraron estadísticas del equipo en la respuesta`);
        console.log(`   Respuesta completa:`, JSON.stringify(statsResponse.data, null, 2));
      }
    } else {
      console.log(`⚠️ No se encontraron estadísticas en la respuesta`);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ PRUEBA COMPLETADA`);
  console.log(`${'='.repeat(80)}\n`);
}

probarFixturesStatistics().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
