/**
 * Prueba completa en entorno real
 * Simula exactamente lo que hace el frontend y analiza los datos reales
 */

const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.API_KEY;
const BACKEND_BASE = 'http://localhost:3000';

if (!API_KEY) {
  console.error('❌ ERROR: API_KEY no está definida en .env');
  process.exit(1);
}

async function testCompetition(competitionId, competitionName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 PRUEBA COMPLETA: ${competitionName} (ID: ${competitionId})`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // 1. Obtener temporada
    console.log(`1️⃣ Obteniendo temporada desde backend...`);
    let season = null;
    try {
      const seasonsResponse = await axios.get(`${BACKEND_BASE}/api/league/seasons?leagueId=${competitionId}`);
      const seasons = seasonsResponse.data.seasons || [];
      // Priorizar temporada 2025 (tiene datos según pruebas anteriores)
      const season2025 = seasons.find(s => s.year === 2025);
      const currentSeason = seasons.find(s => s.current);
      season = season2025 ? 2025 : (currentSeason ? currentSeason.year : seasons[seasons.length - 1]?.year);
      console.log(`   ✅ Temporada seleccionada: ${season}`);
      console.log(`   Temporadas disponibles:`, seasons.map(s => s.year).join(', '));
    } catch (error) {
      console.warn(`   ⚠️ No se pudo obtener temporada desde backend, usando 2025...`);
      season = 2025;
    }

    if (!season) {
      season = 2025;
      console.log(`   ✅ Usando temporada por defecto: ${season}`);
    }

    // 2. Llamar al endpoint del backend
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

    // 3. Análisis detallado de cada grupo
    if (data.groups && Array.isArray(data.groups)) {
      console.log(`\n3️⃣ ANÁLISIS DETALLADO DE GRUPOS:`);
      console.log(`   - Total grupos recibidos: ${data.groups.length}\n`);
      
      const gruposAnalisis = [];
      
      data.groups.forEach((group, index) => {
        const groupName = group.groupName || group.name || group.group || `Grupo ${String.fromCharCode(65 + index)}`;
        
        const analisis = {
          index: index + 1,
          groupName: groupName,
          tipo: typeof group,
          esObjeto: typeof group === 'object',
          tieneStandings: !!group.standings,
          standingsTipo: typeof group.standings,
          standingsEsArray: Array.isArray(group.standings),
          standingsLength: Array.isArray(group.standings) ? group.standings.length : (group.standings ? 'N/A (no array)' : 'null/undefined'),
          tieneTeams: !!group.teams,
          teamsLength: Array.isArray(group.teams) ? group.teams.length : 'N/A',
          propiedades: Object.keys(group || {}),
          pasariaValidacionFrontend: false
        };
        
        // Simular validación del frontend
        if (typeof group === 'object' && group.standings && Array.isArray(group.standings) && group.standings.length > 0) {
          analisis.pasariaValidacionFrontend = true;
        }
        
        gruposAnalisis.push(analisis);
        
        console.log(`   📊 Grupo ${index + 1}: "${groupName}"`);
        console.log(`      - Tipo: ${analisis.tipo}`);
        console.log(`      - Es objeto: ${analisis.esObjeto}`);
        console.log(`      - Tiene standings: ${analisis.tieneStandings}`);
        console.log(`      - Standings tipo: ${analisis.standingsTipo}`);
        console.log(`      - Standings es array: ${analisis.standingsEsArray}`);
        console.log(`      - Standings length: ${analisis.standingsLength}`);
        console.log(`      - Tiene teams: ${analisis.tieneTeams}`);
        console.log(`      - Teams length: ${analisis.teamsLength}`);
        console.log(`      - Propiedades: ${analisis.propiedades.join(', ')}`);
        console.log(`      - ✅ Pasaría validación frontend: ${analisis.pasariaValidacionFrontend ? 'SÍ' : 'NO'}`);
        
        if (!analisis.pasariaValidacionFrontend) {
          console.log(`      ❌ RAZÓN DE FALLO:`);
          if (!analisis.esObjeto) {
            console.log(`         - No es un objeto (es ${analisis.tipo})`);
          }
          if (!analisis.tieneStandings) {
            console.log(`         - No tiene propiedad 'standings'`);
          } else if (!analisis.standingsEsArray) {
            console.log(`         - 'standings' no es un array (es ${analisis.standingsTipo})`);
          } else if (analisis.standingsLength === 0) {
            console.log(`         - 'standings' está vacío (length = 0)`);
          }
        }
        console.log(``);
      });

      // 4. Resumen
      const gruposValidos = gruposAnalisis.filter(g => g.pasariaValidacionFrontend);
      const gruposInvalidos = gruposAnalisis.filter(g => !g.pasariaValidacionFrontend);
      
      console.log(`\n4️⃣ RESUMEN FINAL:`);
      console.log(`   - Total grupos recibidos: ${data.groups.length}`);
      console.log(`   - Grupos con standings válidos: ${gruposValidos.length}`);
      console.log(`   - Grupos que NO pasarían validación: ${gruposInvalidos.length}`);
      console.log(`   - Grupos que se renderizarían en UI: ${gruposValidos.length}`);
      
      if (gruposInvalidos.length > 0) {
        console.log(`\n   ❌ GRUPOS QUE FALLAN:`);
        gruposInvalidos.forEach(g => {
          console.log(`      - "${g.groupName}" (índice ${g.index})`);
          if (!g.tieneStandings) {
            console.log(`        Razón: No tiene propiedad 'standings'`);
          } else if (!g.standingsEsArray) {
            console.log(`        Razón: 'standings' no es array (es ${g.standingsTipo})`);
          } else if (g.standingsLength === 0) {
            console.log(`        Razón: 'standings' está vacío`);
          }
        });
      }
      
      if (gruposValidos.length === 1 && data.groups.length > 1) {
        console.log(`\n   ❌ PROBLEMA CONFIRMADO: Solo 1 grupo es válido de ${data.groups.length} recibidos`);
        console.log(`   ❌ Esto explica por qué solo se ve 1 grupo en la UI`);
      } else if (gruposValidos.length === data.groups.length) {
        console.log(`\n   ✅ Todos los grupos son válidos`);
        console.log(`   ⚠️ Si solo se ve 1 en la UI, el problema está en el renderizado o CSS`);
      }
      
      // 5. Estructura completa del primer grupo (para referencia)
      if (data.groups.length > 0) {
        console.log(`\n5️⃣ ESTRUCTURA COMPLETA DEL PRIMER GRUPO (referencia):`);
        const primerGrupo = data.groups[0];
        console.log(JSON.stringify({
          groupName: primerGrupo.groupName,
          standings: primerGrupo.standings ? (Array.isArray(primerGrupo.standings) ? `Array[${primerGrupo.standings.length}]` : typeof primerGrupo.standings) : 'null/undefined',
          teams: primerGrupo.teams ? (Array.isArray(primerGrupo.teams) ? `Array[${primerGrupo.teams.length}]` : typeof primerGrupo.teams) : 'null/undefined',
          todasLasPropiedades: Object.keys(primerGrupo)
        }, null, 2));
      }

      return {
        competitionId,
        competitionName,
        season,
        totalGrupos: data.groups.length,
        gruposValidos: gruposValidos.length,
        gruposInvalidos: gruposInvalidos.length,
        analisis: gruposAnalisis
      };
    } else {
      console.error(`❌ data.groups no es un array válido`);
      console.error(`   - Tipo: ${typeof data.groups}`);
      console.error(`   - Valor:`, data.groups);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error probando ${competitionName}:`, error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error(`   ⚠️ El servidor backend no está corriendo en ${BACKEND_BASE}`);
      console.error(`   ⚠️ Ejecuta: npm start o node server.js`);
    }
    return null;
  }
}

async function runCompleteTest() {
  console.log('🚀 INICIANDO PRUEBA COMPLETA EN ENTORNO REAL\n');

  const competitions = [
    { id: 13, name: 'Copa Libertadores' },
    { id: 11, name: 'Copa Sudamericana' }
  ];

  const resultados = [];

  for (const comp of competitions) {
    const resultado = await testCompetition(comp.id, comp.name);
    if (resultado) {
      resultados.push(resultado);
    }
  }

  // Resumen final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 RESUMEN FINAL DE TODAS LAS PRUEBAS`);
  console.log(`${'='.repeat(80)}\n`);

  resultados.forEach(r => {
    console.log(`📋 ${r.competitionName} (ID: ${r.competitionId}):`);
    console.log(`   - Temporada: ${r.season}`);
    console.log(`   - Total grupos recibidos: ${r.totalGrupos}`);
    console.log(`   - Grupos válidos: ${r.gruposValidos}`);
    console.log(`   - Grupos inválidos: ${r.gruposInvalidos}`);
    console.log(`   - Grupos que se renderizarían: ${r.gruposValidos}`);
    console.log(``);
  });

  console.log(`${'='.repeat(80)}`);
  console.log(`✅ PRUEBA COMPLETA FINALIZADA`);
  console.log(`${'='.repeat(80)}\n`);
}

// Ejecutar prueba
runCompleteTest().catch(error => {
  console.error('❌ Error ejecutando prueba:', error);
  process.exit(1);
});
