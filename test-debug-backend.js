/**
 * Script para hacer debugging detallado del backend
 * Captura toda la información posible sobre qué está pasando
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function debugBackend() {
  console.log('🔍 DEBUGGING DETALLADO DEL BACKEND\n');
  
  const teamId = 33;
  const leagueId = 39;
  const season = 2025;
  
  console.log(`📋 Parámetros de prueba:`);
  console.log(`   - TeamId: ${teamId}`);
  console.log(`   - LeagueId: ${leagueId}`);
  console.log(`   - Season: ${season}\n`);
  
  const url = `${BASE_URL}/api/equipos/${teamId}/detalle?leagueId=${leagueId}&season=${season}`;
  console.log(`📡 URL: ${url}\n`);
  
  console.log(`⚠️ IMPORTANTE: Revisa la consola del servidor para ver los logs del backend`);
  console.log(`   Busca mensajes que empiezan con:`);
  console.log(`   - 📌 [EQUIPOS/DETALLE]`);
  console.log(`   - 📡 [EQUIPOS/DETALLE]`);
  console.log(`   - ✅ [EQUIPOS/DETALLE]`);
  console.log(`   - ⚠️ [EQUIPOS/DETALLE]\n`);
  
  try {
    console.log(`⏳ Enviando petición...\n`);
    const response = await axios.get(url, { timeout: 30000 });
    
    console.log(`✅ RESPUESTA RECIBIDA`);
    console.log(`   Status: ${response.status}\n`);
    
    // Mostrar información de debugging si está disponible
    if (response.data?.debug) {
      console.log(`\n🔍 INFORMACIÓN DE DEBUGGING (del backend):`);
      const debug = response.data.debug;
      console.log(`   - LeagueId recibido (query): ${debug.leagueIdRecibido ?? 'NULL'}`);
      console.log(`   - LeagueId final: ${debug.leagueIdFinal ?? 'NULL'}`);
      console.log(`   - Season recibida (query): ${debug.seasonRecibida ?? 'NULL'}`);
      console.log(`   - Season final: ${debug.seasonFinal ?? 'NULL'}`);
      console.log(`   - Tiene estadísticas: ${debug.tieneEstadisticas ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   - Tiene posición: ${debug.tienePosicion ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   - Tiene puntos: ${debug.tienePuntos ? '✅ SÍ' : '❌ NO'}`);
      if (debug.estructuraEstadisticas) {
        console.log(`   - Estructura estadísticas:`);
        console.log(`      - Tiene goals: ${debug.estructuraEstadisticas.tieneGoals ? '✅' : '❌'}`);
        console.log(`      - Tiene fixtures: ${debug.estructuraEstadisticas.tieneFixtures ? '✅' : '❌'}`);
        console.log(`      - Keys: ${debug.estructuraEstadisticas.keys?.join(', ') ?? 'N/A'}`);
      }
      console.log(``);
    }
    
    if (response.data?.equipo) {
      const eq = response.data.equipo;
      
      console.log(`📊 DATOS RECIBIDOS:`);
      console.log(`   - Posición: ${eq.posicion ?? 'NULL'}`);
      console.log(`   - Puntos: ${eq.puntos ?? 'NULL'}`);
      console.log(`   - Goles favor: ${eq.golesFavor}`);
      console.log(`   - Goles contra: ${eq.golesContra}`);
      console.log(`   - Promedio goles favor: ${eq.promedioGolesFavor}`);
      console.log(`   - Promedio goles contra: ${eq.promedioGolesContra}`);
      
      console.log(`\n   🎯 ESTADÍSTICAS OFENSIVAS:`);
      console.log(`      - Tiros al arco: ${eq.estadisticasOfensivas?.tirosAlArco ?? 'NULL'}`);
      console.log(`      - xG: ${eq.estadisticasOfensivas?.xG ?? 'NULL'}`);
      
      console.log(`\n   🛡️ ESTADÍSTICAS DEFENSIVAS:`);
      console.log(`      - Tiros en contra: ${eq.estadisticasDefensivas?.tirosEnContra ?? 'NULL'}`);
      console.log(`      - xGA: ${eq.estadisticasDefensivas?.xGA ?? 'NULL'}`);
      
      // Análisis
      console.log(`\n   📈 ANÁLISIS:`);
      if (eq.posicion === null && eq.puntos === null && eq.golesFavor === 0) {
        console.log(`   ⚠️ PROBLEMA: Los datos no están llegando del backend`);
        console.log(`   \n   🔍 POSIBLES CAUSAS:`);
        console.log(`      1. Las llamadas a API-Football no se están ejecutando`);
        console.log(`      2. Las llamadas están fallando silenciosamente`);
        console.log(`      3. La estructura de la respuesta no es la esperada`);
        console.log(`      4. Hay un error en el procesamiento de los datos`);
        console.log(`   \n   📝 ACCIÓN REQUERIDA:`);
        console.log(`      Revisa los logs del servidor (consola donde corre el servidor)`);
        console.log(`      y busca los mensajes de logging que agregamos.`);
        console.log(`      \n      Específicamente busca:`);
        console.log(`      - "📡 [EQUIPOS/DETALLE] Solicitando estadísticas..."`);
        console.log(`      - "✅ [EQUIPOS/DETALLE] Estadísticas obtenidas: Sí/No"`);
        console.log(`      - "📡 [EQUIPOS/DETALLE] Solicitando standings..."`);
        console.log(`      - "✅ [EQUIPOS/DETALLE] Posición obtenida: X, Puntos: Y"`);
        console.log(`      - Cualquier mensaje de error o warning`);
      }
    }
    
    // Mostrar respuesta completa si hay problemas
    if (response.data?.equipo?.posicion === null) {
      console.log(`\n   📄 RESPUESTA COMPLETA (para debugging):`);
      console.log(JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`✅ Debugging completado`);
  console.log(`${'='.repeat(80)}\n`);
}

debugBackend().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
