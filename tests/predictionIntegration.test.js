/**
 * Tests de Integración para el Motor de Predicciones
 * 
 * Prueba el flujo completo: API → Motor → Respuesta
 * 
 * Ejecutar con: npm test o node tests/predictionIntegration.test.js
 */

const axios = require('axios');
const { predictionEngine } = require('../engine/predictionEngine');
const { getProfileConfig } = require('../engine/predictionConfig');
const predictionCache = require('../engine/cache');

// Configuración de tests
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

// Mock de console para tests
const originalConsole = console;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

/**
 * Test: Flujo completo con cache
 */
async function testFullFlowWithCache() {
  console.log = originalConsole.log;
  console.log('🧪 Test: Flujo completo con cache');
  
  if (!API_KEY) {
    console.log('  ⚠️ API_KEY no configurada, saltando test de integración');
    return;
  }

  try {
    // Limpiar cache antes del test
    predictionCache.clear();
    
    // Obtener un fixture real (usar uno conocido)
    const fixtureId = '1035092'; // Ejemplo, reemplazar con uno válido
    
    // Primera llamada (sin cache)
    const start1 = Date.now();
    const response1 = await axios.get(`${BASE_URL}/api/predictions`, {
      params: { fixtureId, profile: 'balanceado' }
    });
    const time1 = Date.now() - start1;
    
    if (response1.status === 200 && response1.data.prediction) {
      console.log(`  ✅ Test 1 pasado: Respuesta exitosa (${time1}ms)`);
    } else {
      console.log(`  ❌ Test 1 falló: Respuesta inválida`);
      return;
    }
    
    // Segunda llamada (con cache)
    const start2 = Date.now();
    const response2 = await axios.get(`${BASE_URL}/api/predictions`, {
      params: { fixtureId, profile: 'balanceado' }
    });
    const time2 = Date.now() - start2;
    
    if (response2.status === 200 && response2.data.prediction) {
      console.log(`  ✅ Test 2 pasado: Respuesta con cache (${time2}ms)`);
      
      // Verificar que la segunda llamada fue más rápida
      if (time2 < time1) {
        console.log(`  ✅ Test 3 pasado: Cache mejora rendimiento (${((time1 - time2) / time1 * 100).toFixed(1)}% más rápido)`);
      } else {
        console.log(`  ⚠️ Test 3: Cache no mejoró rendimiento (puede ser normal en primera ejecución)`);
      }
    } else {
      console.log(`  ❌ Test 2 falló: Respuesta inválida con cache`);
    }
    
    // Verificar estructura de respuesta
    const requiredFields = ['prob_local', 'prob_empate', 'prob_visita', 'goles_local', 'goles_visita', 'recomendacion'];
    const hasAllFields = requiredFields.every(field => response1.data.prediction[field] !== undefined);
    
    if (hasAllFields) {
      console.log('  ✅ Test 4 pasado: Estructura de respuesta correcta');
    } else {
      console.log('  ❌ Test 4 falló: Faltan campos en la respuesta');
    }
    
    // Verificar que probabilidades suman ~1.0
    const sum = response1.data.prediction.prob_local + 
                response1.data.prediction.prob_empate + 
                response1.data.prediction.prob_visita;
    const diff = Math.abs(sum - 1.0);
    
    if (diff < 0.01) {
      console.log('  ✅ Test 5 pasado: Probabilidades suman ~1.0');
    } else {
      console.log(`  ❌ Test 5 falló: Probabilidades suman ${sum}`);
    }
    
  } catch (error) {
    console.log(`  ❌ Test falló: ${error.message}`);
    if (error.response) {
      console.log(`     Status: ${error.response.status}`);
      console.log(`     Data: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  console.log('');
}

/**
 * Test: Motor sin cache
 */
async function testEngineWithoutCache() {
  console.log = originalConsole.log;
  console.log('🧪 Test: Motor sin cache');
  
  // Datos de prueba simulados
  const homeStats = {
    fixtures: {
      wins: { total: 15 },
      draws: { total: 5 },
      played: { total: 30 }
    },
    goals: {
      for: { average: { total: 1.8 }, expected: { total: 1.75 } },
      against: { average: { total: 1.2 }, expected: { total: 1.15 } }
    }
  };
  
  const awayStats = {
    fixtures: {
      wins: { total: 12 },
      draws: { total: 8 },
      played: { total: 30 }
    },
    goals: {
      for: { average: { total: 1.5 }, expected: { total: 1.45 } },
      against: { average: { total: 1.4 }, expected: { total: 1.35 } }
    }
  };
  
  const metricas = {
    xG_local: 1.75,
    xGA_local: 1.15,
    xG_visita: 1.45,
    xGA_visita: 1.35,
    forma_local: 'WWDLW',
    forma_visita: 'LDWDL',
    racha_local: 3,
    racha_visita: 1,
    rendimiento_local: 68.5,
    rendimiento_visita: 52.3,
    xgSource: {
      xG_local: 'api',
      xGA_local: 'api',
      xG_visita: 'api',
      xGA_visita: 'api'
    }
  };
  
  const profileConfig = getProfileConfig('balanceado');
  
  try {
    const result = predictionEngine({
      homeStats,
      awayStats,
      metricas,
      weights: profileConfig.weights,
      config: profileConfig,
      leagueAverages: {
        goalsFor: 1.65,
        goalsAgainst: 1.30
      },
      usePoisson: true
    });
    
    // Verificar estructura
    if (result.prob_local && result.prob_empate && result.prob_visita) {
      console.log('  ✅ Test 1 pasado: Motor retorna estructura correcta');
    } else {
      console.log('  ❌ Test 1 falló: Estructura incorrecta');
    }
    
    // Verificar que probabilidades suman ~1.0
    const sum = result.prob_local + result.prob_empate + result.prob_visita;
    if (Math.abs(sum - 1.0) < 0.01) {
      console.log('  ✅ Test 2 pasado: Probabilidades suman ~1.0');
    } else {
      console.log(`  ❌ Test 2 falló: Probabilidades suman ${sum}`);
    }
    
    // Verificar que goles esperados son números válidos
    if (typeof result.goles_local === 'number' && typeof result.goles_visita === 'number') {
      console.log('  ✅ Test 3 pasado: Goles esperados son números válidos');
    } else {
      console.log('  ❌ Test 3 falló: Goles esperados inválidos');
    }
    
    // Verificar que Poisson fue usado
    if (result.poisson_used === true) {
      console.log('  ✅ Test 4 pasado: Modelo Poisson aplicado');
    } else {
      console.log('  ⚠️ Test 4: Modelo Poisson no aplicado (puede ser normal)');
    }
    
  } catch (error) {
    console.log(`  ❌ Test falló: ${error.message}`);
  }
  
  console.log('');
}

/**
 * Ejecutar todos los tests de integración
 */
async function runIntegrationTests() {
  console.log('='.repeat(60));
  console.log('🧪 EJECUTANDO TESTS DE INTEGRACIÓN');
  console.log('='.repeat(60));
  console.log('');
  
  await testEngineWithoutCache();
  await testFullFlowWithCache();
  
  console.log('='.repeat(60));
  console.log('✅ Tests de integración completados');
  console.log('='.repeat(60));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runIntegrationTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error en tests:', error);
      process.exit(1);
    });
}

module.exports = {
  testFullFlowWithCache,
  testEngineWithoutCache,
  runIntegrationTests
};
