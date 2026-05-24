/**
 * Tests de Carga (Stress Tests) para el Motor de Predicciones
 * 
 * Prueba el sistema bajo carga: 50, 100, 200 predicciones simultáneas
 * 
 * Ejecutar con: node tests/predictionLoad.test.js
 */

const axios = require('axios');
const predictionCache = require('../engine/cache');

// Configuración
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.API_KEY;

// Mock de console para tests
const originalConsole = console;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

/**
 * Generar predicción individual
 */
async function generatePrediction(fixtureId, profile = 'balanceado') {
  try {
    const response = await axios.get(`${BASE_URL}/api/predictions`, {
      params: { fixtureId, profile },
      timeout: 30000 // 30 segundos timeout
    });
    return {
      success: true,
      time: response.headers['x-response-time'] || 0,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * Test de carga con N predicciones simultáneas
 */
async function loadTest(concurrentRequests, fixtureId = '1035092') {
  console.log = originalConsole.log;
  console.log(`\n📊 Test de Carga: ${concurrentRequests} predicciones simultáneas`);
  console.log('-'.repeat(60));
  
  // Limpiar cache antes del test
  predictionCache.clear();
  
  const startTime = Date.now();
  const promises = [];
  
  // Crear N promesas simultáneas
  for (let i = 0; i < concurrentRequests; i++) {
    promises.push(generatePrediction(fixtureId, 'balanceado'));
  }
  
  // Ejecutar todas simultáneamente
  const results = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  // Analizar resultados
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const successRate = (successful / concurrentRequests) * 100;
  const avgTime = totalTime / concurrentRequests;
  
  // Calcular estadísticas de tiempo
  const times = results.filter(r => r.success).map(r => r.time || 0);
  const minTime = times.length > 0 ? Math.min(...times) : 0;
  const maxTime = times.length > 0 ? Math.max(...times) : 0;
  const avgResponseTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
  
  // Mostrar resultados
  console.log(`✅ Exitosas: ${successful}/${concurrentRequests} (${successRate.toFixed(1)}%)`);
  console.log(`❌ Fallidas: ${failed}/${concurrentRequests}`);
  console.log(`⏱️  Tiempo total: ${totalTime}ms`);
  console.log(`⏱️  Tiempo promedio: ${avgTime.toFixed(2)}ms por predicción`);
  if (avgResponseTime > 0) {
    console.log(`⏱️  Tiempo de respuesta promedio: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`⏱️  Tiempo mínimo: ${minTime}ms`);
    console.log(`⏱️  Tiempo máximo: ${maxTime}ms`);
  }
  
  // Verificar criterios de aceptación
  const criteria = {
    successRate: successRate >= 95, // Al menos 95% de éxito
    avgTime: avgTime < 5000, // Menos de 5 segundos promedio
    stability: failed === 0 || successRate >= 90 // Estabilidad razonable
  };
  
  console.log('\n📋 Criterios de Aceptación:');
  console.log(`   Tasa de éxito >= 95%: ${criteria.successRate ? '✅' : '❌'} (${successRate.toFixed(1)}%)`);
  console.log(`   Tiempo promedio < 5s: ${criteria.avgTime ? '✅' : '❌'} (${avgTime.toFixed(2)}ms)`);
  console.log(`   Estabilidad: ${criteria.stability ? '✅' : '❌'}`);
  
  return {
    concurrentRequests,
    successful,
    failed,
    successRate,
    totalTime,
    avgTime,
    avgResponseTime,
    minTime,
    maxTime,
    criteria,
    passed: Object.values(criteria).every(c => c)
  };
}

/**
 * Ejecutar suite completa de tests de carga
 */
async function runLoadTests() {
  console.log = originalConsole.log;
  console.log('='.repeat(60));
  console.log('🚀 TESTS DE CARGA DEL MOTOR DE PREDICCIONES');
  console.log('='.repeat(60));
  
  if (!API_KEY) {
    console.log('\n⚠️ API_KEY no configurada, saltando tests de carga');
    console.log('   Configura API_KEY en .env para ejecutar estos tests\n');
    return;
  }
  
  const results = [];
  
  // Test con 50 predicciones
  try {
    const result50 = await loadTest(50);
    results.push(result50);
  } catch (error) {
    console.log(`\n❌ Error en test de 50: ${error.message}`);
  }
  
  // Pequeña pausa entre tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test con 100 predicciones
  try {
    const result100 = await loadTest(100);
    results.push(result100);
  } catch (error) {
    console.log(`\n❌ Error en test de 100: ${error.message}`);
  }
  
  // Pequeña pausa entre tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test con 200 predicciones
  try {
    const result200 = await loadTest(200);
    results.push(result200);
  } catch (error) {
    console.log(`\n❌ Error en test de 200: ${error.message}`);
  }
  
  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE TESTS DE CARGA');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    console.log(`\n${result.concurrentRequests} predicciones simultáneas:`);
    console.log(`  Tasa de éxito: ${result.successRate.toFixed(1)}%`);
    console.log(`  Tiempo promedio: ${result.avgTime.toFixed(2)}ms`);
    console.log(`  Estado: ${result.passed ? '✅ PASÓ' : '❌ FALLÓ'}`);
  });
  
  const allPassed = results.every(r => r.passed);
  console.log('\n' + '='.repeat(60));
  console.log(`Estado General: ${allPassed ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  console.log('='.repeat(60) + '\n');
  
  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runLoadTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('❌ Error en tests de carga:', error);
      process.exit(1);
    });
}

module.exports = {
  loadTest,
  runLoadTests
};
