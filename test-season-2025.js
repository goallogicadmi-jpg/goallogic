/**
 * Script para probar explícitamente con season=2025
 * Esto confirmará si el problema es la season incorrecta
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const DELAY_MS = 2000;

// Equipos de prueba con season=2025 explícito
const EQUIPOS_PRUEBA = [
  { id: 33, nombre: 'Manchester United', leagueId: 39, season: 2025 },
  { id: 541, nombre: 'Real Madrid', leagueId: 140, season: 2025 },
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function probarConSeason(equipo) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`🔍 PRUEBA CON SEASON=2025: ${equipo.nombre} (ID: ${equipo.id}, LeagueId: ${equipo.leagueId})`);
  console.log(`${'='.repeat(100)}\n`);
  
  const url = `${BASE_URL}/api/equipos/${equipo.id}/detalle?leagueId=${equipo.leagueId}&season=${equipo.season}`;
  console.log(`📡 URL: ${url}\n`);
  
  try {
    const inicio = Date.now();
    const response = await axios.get(url, { timeout: 30000 });
    const duracion = Date.now() - inicio;
    
    console.log(`✅ RESPUESTA RECIBIDA (${duracion}ms)`);
    console.log(`   Status: ${response.status}\n`);
    
    if (response.data?.equipo) {
      const eq = response.data.equipo;
      
      console.log(`📊 RESULTADOS:`);
      console.log(`   ✅ Posición: ${eq.posicion ?? 'NULL'}`);
      console.log(`   ✅ Puntos: ${eq.puntos ?? 'NULL'}`);
      console.log(`   ✅ Goles a favor: ${eq.golesFavor}`);
      console.log(`   ✅ Goles en contra: ${eq.golesContra}`);
      console.log(`   ✅ Promedio goles favor: ${eq.promedioGolesFavor.toFixed(2)}`);
      console.log(`   ✅ Promedio goles contra: ${eq.promedioGolesContra.toFixed(2)}`);
      console.log(`   ✅ Últimos partidos: ${eq.ultimosPartidos?.length ?? 0}`);
      
      console.log(`\n   🎯 ESTADÍSTICAS OFENSIVAS:`);
      console.log(`      - Tiros al arco: ${eq.estadisticasOfensivas?.tirosAlArco ?? 'NULL'}`);
      console.log(`      - Tiros al arco promedio: ${eq.estadisticasOfensivas?.tirosAlArcoPromedio ?? 'NULL'}`);
      console.log(`      - xG: ${eq.estadisticasOfensivas?.xG ?? 'NULL'}`);
      
      console.log(`\n   🛡️ ESTADÍSTICAS DEFENSIVAS:`);
      console.log(`      - Tiros en contra: ${eq.estadisticasDefensivas?.tirosEnContra ?? 'NULL'}`);
      console.log(`      - Tiros en contra promedio: ${eq.estadisticasDefensivas?.tirosEnContraPromedio ?? 'NULL'}`);
      console.log(`      - xGA: ${eq.estadisticasDefensivas?.xGA ?? 'NULL'}`);
      
      // Análisis
      console.log(`\n   📈 ANÁLISIS:`);
      const exitos = [];
      const fallos = [];
      
      if (eq.posicion !== null) exitos.push('✅ Posición');
      else fallos.push('❌ Posición');
      
      if (eq.puntos !== null) exitos.push('✅ Puntos');
      else fallos.push('❌ Puntos');
      
      if (eq.promedioGolesFavor > 0) exitos.push('✅ Promedio goles favor');
      else fallos.push('❌ Promedio goles favor');
      
      if (eq.promedioGolesContra > 0) exitos.push('✅ Promedio goles contra');
      else fallos.push('❌ Promedio goles contra');
      
      if (eq.estadisticasOfensivas?.tirosAlArco !== null) exitos.push('✅ Estadísticas ofensivas');
      else fallos.push('❌ Estadísticas ofensivas');
      
      if (eq.estadisticasDefensivas?.tirosEnContra !== null) exitos.push('✅ Estadísticas defensivas');
      else fallos.push('❌ Estadísticas defensivas');
      
      if (exitos.length > 0) {
        console.log(`   Éxitos (${exitos.length}):`);
        exitos.forEach(e => console.log(`      ${e}`));
      }
      
      if (fallos.length > 0) {
        console.log(`   Fallos (${fallos.length}):`);
        fallos.forEach(f => console.log(`      ${f}`));
      }
      
      return {
        equipo: equipo.nombre,
        success: true,
        tienePosicion: eq.posicion !== null,
        tienePuntos: eq.puntos !== null,
        tieneEstadisticas: eq.estadisticasOfensivas?.tirosAlArco !== null,
        promedioGolesFavor: eq.promedioGolesFavor,
        promedioGolesContra: eq.promedioGolesContra
      };
    }
    
    return { equipo: equipo.nombre, success: false };
    
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return { equipo: equipo.nombre, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 PRUEBA CON SEASON=2025 EXPLÍCITA\n');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`📋 Equipos a probar: ${EQUIPOS_PRUEBA.length}`);
  console.log(`⚠️ IMPORTANTE: Esta prueba usa season=2025 explícitamente\n`);
  
  const resultados = [];
  
  for (const equipo of EQUIPOS_PRUEBA) {
    const resultado = await probarConSeason(equipo);
    resultados.push(resultado);
    
    if (EQUIPOS_PRUEBA.indexOf(equipo) < EQUIPOS_PRUEBA.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // Resumen
  console.log(`\n\n${'='.repeat(100)}`);
  console.log(`📊 RESUMEN DE PRUEBA CON SEASON=2025`);
  console.log(`${'='.repeat(100)}\n`);
  
  resultados.forEach(r => {
    console.log(`${r.equipo}:`);
    console.log(`   - Success: ${r.success}`);
    if (r.tienePosicion !== undefined) {
      console.log(`   - Posición: ${r.tienePosicion ? '✅' : '❌'}`);
      console.log(`   - Puntos: ${r.tienePuntos ? '✅' : '❌'}`);
      console.log(`   - Estadísticas: ${r.tieneEstadisticas ? '✅' : '❌'}`);
      console.log(`   - Promedio goles favor: ${r.promedioGolesFavor?.toFixed(2) ?? 'N/A'}`);
      console.log(`   - Promedio goles contra: ${r.promedioGolesContra?.toFixed(2) ?? 'N/A'}`);
    }
    console.log(``);
  });
  
  const exitos = resultados.filter(r => r.tienePosicion && r.tienePuntos && r.tieneEstadisticas);
  console.log(`✅ Equipos con todos los datos: ${exitos.length}/${resultados.length}`);
  
  if (exitos.length === resultados.length) {
    console.log(`\n🎉 ¡ÉXITO! Con season=2025, todos los datos llegan correctamente.`);
    console.log(`   El problema era la season incorrecta.`);
  } else {
    console.log(`\n⚠️ Aún hay problemas. Revisar logs del servidor para más detalles.`);
  }
  
  console.log(`\n`);
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
