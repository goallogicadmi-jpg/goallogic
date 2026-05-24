/**
 * Script de diagnóstico detallado para identificar problemas en el endpoint /api/equipos/:id/detalle
 * 
 * Este script hace pruebas detalladas y muestra toda la información de debugging
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const DELAY_MS = 2000; // Delay más largo para evitar rate limiting

// Equipos de prueba con sus leagueIds
const EQUIPOS_PRUEBA = [
  { id: 33, nombre: 'Manchester United', leagueId: 39 }, // Premier League
  { id: 541, nombre: 'Real Madrid', leagueId: 140 }, // LaLiga
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function probarEquipoDetallado(equipo) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🔍 DIAGNÓSTICO DETALLADO: ${equipo.nombre} (ID: ${equipo.id}, LeagueId: ${equipo.leagueId})`);
  console.log(`${'='.repeat(100)}\n`);
  
  const url = `${BASE_URL}/api/equipos/${equipo.id}/detalle?leagueId=${equipo.leagueId}`;
  console.log(`📡 URL completa: ${url}\n`);
  
  try {
    console.log(`⏳ Enviando petición...`);
    const inicio = Date.now();
    const response = await axios.get(url, {
      timeout: 30000, // 30 segundos de timeout
      validateStatus: function (status) {
        return status < 500; // Aceptar cualquier status < 500 para ver errores
      }
    });
    const duracion = Date.now() - inicio;
    
    console.log(`\n✅ RESPUESTA RECIBIDA (${duracion}ms)`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Headers:`, JSON.stringify(response.headers, null, 2));
    
    if (response.data) {
      console.log(`\n📦 DATOS RECIBIDOS:`);
      console.log(`   Success: ${response.data.success}`);
      
      if (response.data.equipo) {
        const eq = response.data.equipo;
        console.log(`\n   📊 CAMPOS DEL EQUIPO:`);
        console.log(`      - id: ${eq.id}`);
        console.log(`      - nombre: ${eq.nombre}`);
        console.log(`      - liga: ${eq.liga}`);
        console.log(`      - posicion: ${eq.posicion ?? 'NULL'}`);
        console.log(`      - puntos: ${eq.puntos ?? 'NULL'}`);
        console.log(`      - golesFavor: ${eq.golesFavor}`);
        console.log(`      - golesContra: ${eq.golesContra}`);
        console.log(`      - promedioGolesFavor: ${eq.promedioGolesFavor}`);
        console.log(`      - promedioGolesContra: ${eq.promedioGolesContra}`);
        console.log(`      - ultimosPartidos: ${eq.ultimosPartidos?.length ?? 0} partidos`);
        
        console.log(`\n   🎯 ESTADÍSTICAS OFENSIVAS:`);
        console.log(`      - tirosAlArco: ${eq.estadisticasOfensivas?.tirosAlArco ?? 'NULL'}`);
        console.log(`      - tirosAlArcoPromedio: ${eq.estadisticasOfensivas?.tirosAlArcoPromedio ?? 'NULL'}`);
        console.log(`      - xG: ${eq.estadisticasOfensivas?.xG ?? 'NULL'}`);
        
        console.log(`\n   🛡️ ESTADÍSTICAS DEFENSIVAS:`);
        console.log(`      - tirosEnContra: ${eq.estadisticasDefensivas?.tirosEnContra ?? 'NULL'}`);
        console.log(`      - tirosEnContraPromedio: ${eq.estadisticasDefensivas?.tirosEnContraPromedio ?? 'NULL'}`);
        console.log(`      - xGA: ${eq.estadisticasDefensivas?.xGA ?? 'NULL'}`);
        
        // Análisis de qué falta
        console.log(`\n   ⚠️ ANÁLISIS:`);
        const problemas = [];
        if (eq.posicion === null) problemas.push('❌ Posición es NULL');
        if (eq.puntos === null) problemas.push('❌ Puntos es NULL');
        if (eq.promedioGolesFavor === 0) problemas.push('⚠️ Promedio goles favor es 0.00');
        if (eq.promedioGolesContra === 0) problemas.push('⚠️ Promedio goles contra es 0.00');
        if (eq.estadisticasOfensivas?.tirosAlArco === null) problemas.push('❌ Estadísticas ofensivas son NULL');
        if (eq.estadisticasDefensivas?.tirosEnContra === null) problemas.push('❌ Estadísticas defensivas son NULL');
        
        if (problemas.length === 0) {
          console.log(`      ✅ Todos los campos están presentes`);
        } else {
          problemas.forEach(p => console.log(`      ${p}`));
        }
      } else {
        console.log(`   ⚠️ No hay objeto 'equipo' en la respuesta`);
      }
      
      if (response.data.error) {
        console.log(`\n   ❌ ERROR EN RESPUESTA: ${response.data.error}`);
      }
    } else {
      console.log(`   ⚠️ No hay datos en la respuesta`);
    }
    
    // Mostrar respuesta completa si hay problemas
    if (response.data && response.data.equipo) {
      const eq = response.data.equipo;
      if (eq.posicion === null || eq.puntos === null || eq.estadisticasOfensivas?.tirosAlArco === null) {
        console.log(`\n   📄 RESPUESTA COMPLETA (JSON):`);
        console.log(JSON.stringify(response.data, null, 2));
      }
    }
    
    return {
      equipo: equipo.nombre,
      success: response.data?.success,
      tienePosicion: response.data?.equipo?.posicion !== null,
      tienePuntos: response.data?.equipo?.puntos !== null,
      tieneEstadisticas: response.data?.equipo?.estadisticasOfensivas?.tirosAlArco !== null,
      status: response.status
    };
    
  } catch (error) {
    console.log(`\n❌ ERROR AL PROBAR ${equipo.nombre}:`);
    console.log(`   Tipo: ${error.name}`);
    console.log(`   Mensaje: ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Status Text: ${error.response.statusText}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
      console.log(`   Headers:`, JSON.stringify(error.response.headers, null, 2));
    } else if (error.request) {
      console.log(`   ⚠️ No se recibió respuesta del servidor`);
      console.log(`   Request:`, error.request);
    } else {
      console.log(`   Error completo:`, error);
    }
    
    if (error.code) {
      console.log(`   Code: ${error.code}`);
    }
    
    if (error.stack) {
      console.log(`   Stack:`, error.stack);
    }
    
    return {
      equipo: equipo.nombre,
      success: false,
      error: error.message,
      status: error.response?.status || 'N/A'
    };
  }
}

async function main() {
  console.log('🚀 INICIANDO DIAGNÓSTICO DETALLADO DEL ENDPOINT /api/equipos/:id/detalle\n');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`📋 Equipos a probar: ${EQUIPOS_PRUEBA.length}\n`);
  console.log(`⚠️ IMPORTANTE: Asegúrate de que el servidor esté corriendo para ver los logs del backend\n`);
  
  const resultados = [];
  
  for (const equipo of EQUIPOS_PRUEBA) {
    const resultado = await probarEquipoDetallado(equipo);
    resultados.push(resultado);
    
    // Delay entre peticiones
    if (EQUIPOS_PRUEBA.indexOf(equipo) < EQUIPOS_PRUEBA.length - 1) {
      console.log(`\n⏳ Esperando ${DELAY_MS}ms antes de la siguiente petición...`);
      await delay(DELAY_MS);
    }
  }
  
  // Resumen final
  console.log(`\n\n${'='.repeat(100)}`);
  console.log(`📊 RESUMEN DEL DIAGNÓSTICO`);
  console.log(`${'='.repeat(100)}\n`);
  
  resultados.forEach(r => {
    console.log(`${r.equipo}:`);
    console.log(`   - Success: ${r.success}`);
    console.log(`   - Status: ${r.status}`);
    if (r.tienePosicion !== undefined) {
      console.log(`   - Tiene posición: ${r.tienePosicion ? '✅' : '❌'}`);
      console.log(`   - Tiene puntos: ${r.tienePuntos ? '✅' : '❌'}`);
      console.log(`   - Tiene estadísticas: ${r.tieneEstadisticas ? '✅' : '❌'}`);
    }
    if (r.error) {
      console.log(`   - Error: ${r.error}`);
    }
    console.log(``);
  });
  
  console.log(`\n✅ Diagnóstico completado`);
  console.log(`\n📝 PRÓXIMOS PASOS:`);
  console.log(`   1. Revisa los logs del servidor (consola donde corre el servidor)`);
  console.log(`   2. Busca los mensajes que empiezan con "📌 [EQUIPOS/DETALLE]"`);
  console.log(`   3. Verifica si leagueId y season se están calculando correctamente`);
  console.log(`   4. Revisa si hay errores en las llamadas a API-Football`);
  console.log(`\n`);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
