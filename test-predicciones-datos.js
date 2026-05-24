/**
 * Script de prueba para validar qué datos están llegando del endpoint /api/equipos/:id/detalle
 * 
 * Uso: node test-predicciones-datos.js
 * 
 * Este script prueba el endpoint con varios equipos de diferentes ligas para identificar
 * qué datos están llegando y cuáles no.
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3000'; // Ajustar si el servidor está en otro puerto
const DELAY_MS = 1000; // Delay entre peticiones para evitar rate limiting

// Equipos de prueba (IDs de equipos conocidos con sus leagueIds)
const EQUIPOS_PRUEBA = [
  // Premier League (leagueId: 39)
  { id: 33, nombre: 'Manchester United', liga: 'Premier League', leagueId: 39 },
  { id: 50, nombre: 'Manchester City', liga: 'Premier League', leagueId: 39 },
  { id: 42, nombre: 'Arsenal', liga: 'Premier League', leagueId: 39 },
  
  // LaLiga (leagueId: 140)
  { id: 541, nombre: 'Real Madrid', liga: 'LaLiga', leagueId: 140 },
  { id: 529, nombre: 'Barcelona', liga: 'LaLiga', leagueId: 140 },
  { id: 548, nombre: 'Atletico Madrid', liga: 'LaLiga', leagueId: 140 },
  
  // Serie A (leagueId: 135)
  { id: 489, nombre: 'AC Milan', liga: 'Serie A', leagueId: 135 },
  { id: 85, nombre: 'Inter Milan', liga: 'Serie A', leagueId: 135 },
  { id: 109, nombre: 'Juventus', liga: 'Serie A', leagueId: 135 },
  
  // Bundesliga (leagueId: 78)
  { id: 157, nombre: 'Bayern Munich', liga: 'Bundesliga', leagueId: 78 },
  { id: 165, nombre: 'Borussia Dortmund', liga: 'Bundesliga', leagueId: 78 },
  
  // Ligue 1 (leagueId: 61)
  { id: 85, nombre: 'Paris Saint-Germain', liga: 'Ligue 1', leagueId: 61 }, // Nota: ID 85 es Inter Milan, PSG debería ser otro ID
];

// Función para hacer delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para validar campos
function validarCampos(equipo, datos) {
  const campos = {
    // Información básica
    'id': typeof datos.id === 'number',
    'nombre': typeof datos.nombre === 'string' && datos.nombre.length > 0,
    'liga': typeof datos.liga === 'string' && datos.liga.length > 0,
    'pais': typeof datos.pais === 'string' && datos.pais.length > 0,
    'logo': datos.logo !== null && datos.logo !== undefined,
    
    // Estadísticas de liga
    'posicion': datos.posicion !== null && datos.posicion !== undefined,
    'puntos': datos.puntos !== null && datos.puntos !== undefined,
    'golesFavor': typeof datos.golesFavor === 'number',
    'golesContra': typeof datos.golesContra === 'number',
    'promedioGolesFavor': typeof datos.promedioGolesFavor === 'number',
    'promedioGolesContra': typeof datos.promedioGolesContra === 'number',
    
    // Últimos partidos
    'ultimosPartidos': Array.isArray(datos.ultimosPartidos),
    'ultimosPartidos.length': Array.isArray(datos.ultimosPartidos) && datos.ultimosPartidos.length > 0,
    
    // Estadísticas ofensivas
    'estadisticasOfensivas.tirosAlArco': datos.estadisticasOfensivas?.tirosAlArco !== null && datos.estadisticasOfensivas?.tirosAlArco !== undefined,
    'estadisticasOfensivas.tirosAlArcoPromedio': datos.estadisticasOfensivas?.tirosAlArcoPromedio !== null && datos.estadisticasOfensivas?.tirosAlArcoPromedio !== undefined,
    'estadisticasOfensivas.xG': datos.estadisticasOfensivas?.xG !== null && datos.estadisticasOfensivas?.xG !== undefined,
    
    // Estadísticas defensivas
    'estadisticasDefensivas.tirosEnContra': datos.estadisticasDefensivas?.tirosEnContra !== null && datos.estadisticasDefensivas?.tirosEnContra !== undefined,
    'estadisticasDefensivas.tirosEnContraPromedio': datos.estadisticasDefensivas?.tirosEnContraPromedio !== null && datos.estadisticasDefensivas?.tirosEnContraPromedio !== undefined,
    'estadisticasDefensivas.xGA': datos.estadisticasDefensivas?.xGA !== null && datos.estadisticasDefensivas?.xGA !== undefined,
  };
  
  return campos;
}

// Función para probar un equipo
async function probarEquipo(equipo) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Probando: ${equipo.nombre} (ID: ${equipo.id}) - ${equipo.liga}`);
    console.log(`${'='.repeat(80)}`);
    
    const url = `${BASE_URL}/api/equipos/${equipo.id}/detalle${equipo.leagueId ? `?leagueId=${equipo.leagueId}` : ''}`;
    console.log(`📡 URL: ${url}`);
    
    const response = await axios.get(url);
    
    if (!response.data.success) {
      console.log(`❌ Error: ${response.data.error || 'Error desconocido'}`);
      return null;
    }
    
    const datos = response.data.equipo;
    const validacion = validarCampos(equipo, datos);
    
    // Mostrar resultados
    console.log(`\n✅ Campos presentes:`);
    Object.entries(validacion).forEach(([campo, presente]) => {
      if (presente) {
        console.log(`   ✅ ${campo}`);
      }
    });
    
    console.log(`\n❌ Campos faltantes:`);
    const faltantes = Object.entries(validacion).filter(([_, presente]) => !presente);
    if (faltantes.length === 0) {
      console.log(`   (Ninguno - todos los campos están presentes)`);
    } else {
      faltantes.forEach(([campo, _]) => {
        console.log(`   ❌ ${campo}`);
      });
    }
    
    // Mostrar valores específicos
    console.log(`\n📊 Valores clave:`);
    console.log(`   - Posición: ${datos.posicion ?? 'NULL'}`);
    console.log(`   - Puntos: ${datos.puntos ?? 'NULL'}`);
    console.log(`   - Últimos partidos: ${datos.ultimosPartidos?.length ?? 0} partidos`);
    console.log(`   - Promedio goles a favor: ${datos.promedioGolesFavor?.toFixed(2) ?? 'NULL'}`);
    console.log(`   - Promedio goles en contra: ${datos.promedioGolesContra?.toFixed(2) ?? 'NULL'}`);
    console.log(`   - xG: ${datos.estadisticasOfensivas?.xG ?? 'NULL'}`);
    console.log(`   - xGA: ${datos.estadisticasDefensivas?.xGA ?? 'NULL'}`);
    
    // Mostrar estructura de últimos partidos
    if (datos.ultimosPartidos && datos.ultimosPartidos.length > 0) {
      console.log(`\n📅 Últimos partidos (estructura):`);
      datos.ultimosPartidos.slice(0, 3).forEach((partido, index) => {
        console.log(`   ${index + 1}. ${partido.resultado} - ${partido.golesFavor}-${partido.golesContra}`);
      });
    }
    
    return {
      equipo: equipo.nombre,
      id: equipo.id,
      liga: equipo.liga,
      validacion,
      datos
    };
    
  } catch (error) {
    console.log(`\n❌ ERROR al probar ${equipo.nombre}:`);
    console.log(`   Mensaje: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return null;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de datos del módulo Predicciones\n');
  console.log(`📡 Base URL: ${BASE_URL}`);
  console.log(`📋 Equipos a probar: ${EQUIPOS_PRUEBA.length}\n`);
  
  const resultados = [];
  
  for (const equipo of EQUIPOS_PRUEBA) {
    const resultado = await probarEquipo(equipo);
    if (resultado) {
      resultados.push(resultado);
    }
    
    // Delay entre peticiones
    if (EQUIPOS_PRUEBA.indexOf(equipo) < EQUIPOS_PRUEBA.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // Resumen final
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`📊 RESUMEN FINAL`);
  console.log(`${'='.repeat(80)}\n`);
  
  console.log(`✅ Equipos probados exitosamente: ${resultados.length}/${EQUIPOS_PRUEBA.length}`);
  
  // Análisis de campos faltantes
  const camposFaltantes = {};
  resultados.forEach(resultado => {
    Object.entries(resultado.validacion).forEach(([campo, presente]) => {
      if (!presente) {
        if (!camposFaltantes[campo]) {
          camposFaltantes[campo] = [];
        }
        camposFaltantes[campo].push(resultado.equipo);
      }
    });
  });
  
  if (Object.keys(camposFaltantes).length > 0) {
    console.log(`\n❌ Campos que faltan en algunos equipos:`);
    Object.entries(camposFaltantes).forEach(([campo, equipos]) => {
      console.log(`   - ${campo}: ${equipos.length} equipos (${equipos.join(', ')})`);
    });
  } else {
    console.log(`\n✅ Todos los campos están presentes en todos los equipos probados`);
  }
  
  // Estadísticas de últimos partidos
  const equiposConPartidos = resultados.filter(r => r.datos.ultimosPartidos?.length > 0);
  const equiposSinPartidos = resultados.filter(r => !r.datos.ultimosPartidos || r.datos.ultimosPartidos.length === 0);
  
  console.log(`\n📅 Últimos partidos:`);
  console.log(`   - Equipos con partidos: ${equiposConPartidos.length}`);
  console.log(`   - Equipos sin partidos: ${equiposSinPartidos.length}`);
  
  if (equiposSinPartidos.length > 0) {
    console.log(`   - Equipos sin partidos: ${equiposSinPartidos.map(e => e.equipo).join(', ')}`);
  }
  
  // Estadísticas de posición
  const equiposConPosicion = resultados.filter(r => r.datos.posicion !== null);
  const equiposSinPosicion = resultados.filter(r => r.datos.posicion === null);
  
  console.log(`\n🏆 Posición en tabla:`);
  console.log(`   - Equipos con posición: ${equiposConPosicion.length}`);
  console.log(`   - Equipos sin posición: ${equiposSinPosicion.length}`);
  
  if (equiposSinPosicion.length > 0) {
    console.log(`   - Equipos sin posición: ${equiposSinPosicion.map(e => e.equipo).join(', ')}`);
  }
  
  console.log(`\n✅ Pruebas completadas\n`);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
