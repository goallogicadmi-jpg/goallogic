/**
 * Script de prueba completa para diagnosticar el problema de grupos en copas
 * Simula exactamente el flujo del frontend
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';
const BACKEND_BASE = 'http://localhost:3000'; // Ajustar si es necesario

if (!API_KEY) {
  console.error('❌ ERROR: API_KEY no está definida en .env');
  process.exit(1);
}

const apiHeaders = {
  'x-apisports-key': API_KEY,
  'x-rapidapi-host': 'v3.football.api-sports.io'
};

async function testBackendEndpoint(competitionId, competitionName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PROBANDO BACKEND: ${competitionName} (ID: ${competitionId})`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Obtener temporada actual
    console.log(`1️⃣ Obteniendo temporada actual desde backend...`);
    let season = null;
    try {
      const seasonsResponse = await axios.get(`${BACKEND_BASE}/api/league/seasons?leagueId=${competitionId}`);
      const seasons = seasonsResponse.data.seasons || [];
      const currentSeason = seasons.find(s => s.current) || seasons[seasons.length - 1];
      season = currentSeason ? currentSeason.year : seasons[seasons.length - 1]?.year;
      
      console.log(`✅ Temporada desde backend: ${season}`);
      console.log(`   Temporadas disponibles:`, seasons.map(s => s.year).join(', '));
    } catch (error) {
      console.warn(`⚠️ No se pudo obtener temporada desde backend, probando con 2025...`);
      season = 2025;
    }
    
    // Si no hay temporada, probar con 2025 (tiene datos según pruebas anteriores)
    if (!season) {
      season = 2025;
      console.log(`✅ Usando temporada por defecto: ${season}`);
    }

    // 2. Llamar al endpoint del backend que usa el frontend
    console.log(`\n2️⃣ Llamando al endpoint del backend: /api/competition/${competitionId}/cup?season=${season}`);
    const backendResponse = await axios.get(`${BACKEND_BASE}/api/competition/${competitionId}/cup?season=${season}`);
    
    if (!backendResponse.data.success) {
      console.error(`❌ Backend devolvió error:`, backendResponse.data.error || backendResponse.data.message);
      return null;
    }

    const data = backendResponse.data.data;
    
    console.log(`✅ Respuesta del backend recibida:`);
    console.log(`   - success: ${backendResponse.data.success}`);
    console.log(`   - competitionId: ${data.competitionId}`);
    console.log(`   - name: ${data.name}`);
    console.log(`   - season: ${data.season}`);
    console.log(`   - hasGroups: ${data.hasGroups}`);
    console.log(`   - phase: ${data.phase}`);
    console.log(`   - groups.length: ${data.groups ? data.groups.length : 0}`);

    // 3. Analizar estructura de grupos
    if (data.groups && Array.isArray(data.groups)) {
      console.log(`\n3️⃣ Analizando estructura de grupos:`);
      console.log(`   - Total grupos: ${data.groups.length}`);
      
      data.groups.forEach((group, index) => {
        console.log(`\n   📊 Grupo ${index + 1}:`);
        console.log(`      - Tipo: ${typeof group}`);
        console.log(`      - groupName: ${group.groupName || group.name || group.group || 'N/A'}`);
        console.log(`      - Tiene standings: ${!!group.standings}`);
        console.log(`      - standings es array: ${Array.isArray(group.standings)}`);
        console.log(`      - standings.length: ${Array.isArray(group.standings) ? group.standings.length : 'N/A'}`);
        console.log(`      - Tiene teams: ${!!group.teams}`);
        console.log(`      - teams.length: ${Array.isArray(group.teams) ? group.teams.length : 'N/A'}`);
        console.log(`      - Tiene matches: ${!!group.matches}`);
        console.log(`      - matches.length: ${Array.isArray(group.matches) ? group.matches.length : 'N/A'}`);
        
        if (group.standings && Array.isArray(group.standings) && group.standings.length > 0) {
          console.log(`      - Primer equipo en standings:`, group.standings[0].team?.name || group.standings[0].name || 'N/A');
        }
      });
    } else {
      console.error(`❌ data.groups no es un array válido`);
      console.error(`   - Tipo: ${typeof data.groups}`);
      console.error(`   - Valor:`, data.groups);
    }

    // 4. Simular lo que hace el frontend
    console.log(`\n4️⃣ Simulando procesamiento del frontend:`);
    
    if (data.phase === 'groups' && data.groups && Array.isArray(data.groups) && data.groups.length > 0) {
      // Simular setGroups(data.groups)
      const groups = data.groups;
      console.log(`   ✅ Frontend recibiría ${groups.length} grupos`);
      
      // Simular groups.map() para renderizar
      const gruposRenderizables = groups.filter((group, index) => {
        const groupName = typeof group === 'string' 
          ? group 
          : (group.groupName || group.name || group.group || `Grupo ${String.fromCharCode(65 + index)}`);
        
        const hasData = (typeof group === 'object' && group.standings && Array.isArray(group.standings) && group.standings.length > 0);
        
        if (!hasData) {
          console.log(`   ⚠️ Grupo "${groupName}" NO se renderizaría (no tiene standings válidos)`);
        } else {
          console.log(`   ✅ Grupo "${groupName}" SÍ se renderizaría (${group.standings.length} equipos)`);
        }
        
        return hasData;
      });
      
      console.log(`\n   📊 RESUMEN:`);
      console.log(`      - Grupos recibidos: ${groups.length}`);
      console.log(`      - Grupos renderizables: ${gruposRenderizables.length}`);
      console.log(`      - Grupos que NO se renderizarían: ${groups.length - gruposRenderizables.length}`);
      
      if (gruposRenderizables.length === 1 && groups.length > 1) {
        console.log(`\n   ❌ PROBLEMA DETECTADO: Solo 1 grupo es renderizable de ${groups.length} recibidos`);
        console.log(`   ❌ Esto explicaría por qué solo se ve 1 grupo en la UI`);
      } else if (gruposRenderizables.length === groups.length) {
        console.log(`\n   ✅ Todos los grupos son renderizables`);
        console.log(`   ⚠️ Si solo se ve 1 en la UI, el problema está en el renderizado o CSS`);
      }
    }

    return data;
  } catch (error) {
    console.error(`❌ Error probando backend:`, error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`   ⚠️ El servidor backend no está corriendo en ${BACKEND_BASE}`);
      console.error(`   ⚠️ Ejecuta: npm start o node server.js`);
    }
    return null;
  }
}

async function testDirectAPI(competitionId, competitionName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PROBANDO API DIRECTA: ${competitionName} (ID: ${competitionId})`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Obtener temporada
    const leagueInfoResponse = await axios.get(
      `${API_BASE}/leagues?id=${competitionId}`,
      { headers: apiHeaders }
    );

    const leagueInfo = leagueInfoResponse.data.response[0];
    const seasons = leagueInfo.seasons || [];
    const currentSeason = seasons.find(s => s.current) || seasons[seasons.length - 1];
    const season = currentSeason ? currentSeason.year : new Date().getFullYear();

    console.log(`✅ Temporada: ${season}`);

    // Obtener standings
    const standingsResponse = await axios.get(
      `${API_BASE}/standings?league=${competitionId}&season=${season}`,
      { headers: apiHeaders }
    );

    if (!standingsResponse.data.response || standingsResponse.data.response.length === 0) {
      console.error(`❌ API no devolvió datos`);
      return null;
    }

    const leagueData = standingsResponse.data.response[0];
    const standings = leagueData.league.standings;

    console.log(`\n✅ Estructura de standings desde API:`);
    console.log(`   - response.length: ${standingsResponse.data.response.length}`);
    console.log(`   - standings es array: ${Array.isArray(standings)}`);
    console.log(`   - standings.length: ${Array.isArray(standings) ? standings.length : 'N/A'}`);
    
    if (Array.isArray(standings) && standings.length > 0) {
      console.log(`   - standings[0] es array: ${Array.isArray(standings[0])}`);
      if (Array.isArray(standings[0])) {
        console.log(`   - ✅ ESTRUCTURA: Array de arrays (${standings.length} grupos)`);
        standings.forEach((group, idx) => {
          if (Array.isArray(group) && group.length > 0) {
            const groupName = group[0].group || `Grupo ${String.fromCharCode(65 + idx)}`;
            console.log(`      - ${groupName}: ${group.length} equipos`);
          }
        });
      } else {
        console.log(`   - ⚠️ ESTRUCTURA: Array simple (no es array de arrays)`);
      }
    }

    return { standings, season };
  } catch (error) {
    console.error(`❌ Error probando API directa:`, error.response?.data || error.message);
    return null;
  }
}

async function runCompleteDiagnosis() {
  console.log('🚀 INICIANDO DIAGNÓSTICO COMPLETO DE GRUPOS EN COPAS\n');

  const competitions = [
    { id: 13, name: 'Copa Libertadores' },
    { id: 11, name: 'Copa Sudamericana' }
  ];

  for (const comp of competitions) {
    // Probar API directa
    await testDirectAPI(comp.id, comp.name);
    
    // Probar endpoint del backend
    await testBackendEndpoint(comp.id, comp.name);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ DIAGNÓSTICO COMPLETADO`);
  console.log(`${'='.repeat(80)}\n`);
}

// Ejecutar diagnóstico
runCompleteDiagnosis().catch(error => {
  console.error('❌ Error ejecutando diagnóstico:', error);
  process.exit(1);
});
