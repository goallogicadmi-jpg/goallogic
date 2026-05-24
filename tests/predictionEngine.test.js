/**
 * Tests Unitarios para el Motor de Predicciones
 * 
 * Ejecutar con: npm test o node tests/predictionEngine.test.js
 */

const { 
  calculateExpectedGoalsPoisson,
  calculateGoalDistribution,
  poissonProbability,
  normalizeXGByLeague,
  calculateScoreMatrix
} = require('../engine/predictionEngine');

// Mock de console para tests
const originalConsole = console;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

/**
 * Test: poissonProbability
 */
function testPoissonProbability() {
  console.log = originalConsole.log;
  console.log('🧪 Test: poissonProbability');
  
  // Test 1: Probabilidad básica
  const prob1 = poissonProbability(1.5, 0);
  const expected1 = Math.exp(-1.5); // P(0; 1.5) = e^(-1.5)
  const diff1 = Math.abs(prob1 - expected1);
  
  if (diff1 < 0.0001) {
    console.log('  ✅ Test 1 pasado: P(0; 1.5)');
  } else {
    console.log(`  ❌ Test 1 falló: esperado ${expected1}, obtenido ${prob1}`);
  }
  
  // Test 2: Probabilidad de 1 gol
  const prob2 = poissonProbability(2.0, 1);
  const expected2 = 2.0 * Math.exp(-2.0); // P(1; 2.0) = 2.0 * e^(-2.0)
  const diff2 = Math.abs(prob2 - expected2);
  
  if (diff2 < 0.0001) {
    console.log('  ✅ Test 2 pasado: P(1; 2.0)');
  } else {
    console.log(`  ❌ Test 2 falló: esperado ${expected2}, obtenido ${prob2}`);
  }
  
  // Test 3: Lambda = 0
  const prob3 = poissonProbability(0, 0);
  if (prob3 === 1) {
    console.log('  ✅ Test 3 pasado: P(0; 0) = 1');
  } else {
    console.log(`  ❌ Test 3 falló: esperado 1, obtenido ${prob3}`);
  }
  
  console.log('');
}

/**
 * Test: calculateGoalDistribution
 */
function testCalculateGoalDistribution() {
  console.log = originalConsole.log;
  console.log('🧪 Test: calculateGoalDistribution');
  
  const lambda = 1.5;
  const distribution = calculateGoalDistribution(lambda, 5);
  
  // Verificar que las probabilidades suman aproximadamente 1
  const sum = distribution.prob0 + distribution.prob1 + distribution.prob2 + 
              distribution.prob3 + distribution.prob4 + distribution.prob5Plus;
  const diff = Math.abs(sum - 1.0);
  
  if (diff < 0.01) {
    console.log('  ✅ Test 1 pasado: Probabilidades suman ~1.0');
  } else {
    console.log(`  ❌ Test 1 falló: suma = ${sum}, esperado ~1.0`);
  }
  
  // Verificar que todas las probabilidades son >= 0
  const allPositive = Object.values(distribution).every(p => p >= 0);
  if (allPositive) {
    console.log('  ✅ Test 2 pasado: Todas las probabilidades >= 0');
  } else {
    console.log('  ❌ Test 2 falló: Algunas probabilidades son negativas');
  }
  
  console.log('');
}

/**
 * Test: normalizeXGByLeague
 */
function testNormalizeXGByLeague() {
  console.log = originalConsole.log;
  console.log('🧪 Test: normalizeXGByLeague');
  
  // Test 1: Normalización con promedio de liga
  const xG = 1.8;
  const leagueAvg = 1.5;
  const normalized = normalizeXGByLeague(xG, leagueAvg);
  
  // xG > promedio, debería ser > 0.5
  if (normalized > 0.5 && normalized <= 1.0) {
    console.log('  ✅ Test 1 pasado: Normalización con promedio de liga');
  } else {
    console.log(`  ❌ Test 1 falló: valor normalizado = ${normalized}`);
  }
  
  // Test 2: xG igual al promedio
  const normalized2 = normalizeXGByLeague(leagueAvg, leagueAvg);
  // Debería estar cerca de 0.5
  if (normalized2 > 0.4 && normalized2 < 0.6) {
    console.log('  ✅ Test 2 pasado: xG igual al promedio');
  } else {
    console.log(`  ❌ Test 2 falló: valor normalizado = ${normalized2}`);
  }
  
  // Test 3: Sin promedio de liga (fallback)
  const normalized3 = normalizeXGByLeague(xG, null);
  if (normalized3 >= 0 && normalized3 <= 1) {
    console.log('  ✅ Test 3 pasado: Fallback sin promedio de liga');
  } else {
    console.log(`  ❌ Test 3 falló: valor normalizado = ${normalized3}`);
  }
  
  console.log('');
}

/**
 * Test: calculateExpectedGoalsPoisson
 */
function testCalculateExpectedGoalsPoisson() {
  console.log = originalConsole.log;
  console.log('🧪 Test: calculateExpectedGoalsPoisson');
  
  const teamGoalsFor = 1.8;
  const opponentGoalsAgainst = 1.2;
  const result = calculateExpectedGoalsPoisson(teamGoalsFor, opponentGoalsAgainst);
  
  // Verificar estructura
  if (result.expected && result.lambda && result.distribution) {
    console.log('  ✅ Test 1 pasado: Estructura correcta');
  } else {
    console.log('  ❌ Test 1 falló: Estructura incorrecta');
  }
  
  // Verificar que lambda está en rango razonable
  if (result.lambda >= 0.1 && result.lambda <= 5.0) {
    console.log('  ✅ Test 2 pasado: Lambda en rango razonable');
  } else {
    console.log(`  ❌ Test 2 falló: lambda = ${result.lambda}`);
  }
  
  // Verificar que expected es aproximadamente lambda
  const diff = Math.abs(result.expected - result.lambda);
  if (diff < 0.01) {
    console.log('  ✅ Test 3 pasado: Expected ≈ Lambda');
  } else {
    console.log(`  ❌ Test 3 falló: expected = ${result.expected}, lambda = ${result.lambda}`);
  }
  
  console.log('');
}

/**
 * Test: calculateScoreMatrix
 */
function testCalculateScoreMatrix() {
  console.log = originalConsole.log;
  console.log('🧪 Test: calculateScoreMatrix');
  
  const lambdaHome = 1.5;
  const lambdaAway = 1.2;
  const result = calculateScoreMatrix(lambdaHome, lambdaAway);
  
  // Verificar estructura
  if (result.matrix && result.probHomeWin !== undefined && 
      result.probDraw !== undefined && result.probAwayWin !== undefined) {
    console.log('  ✅ Test 1 pasado: Estructura correcta');
  } else {
    console.log('  ❌ Test 1 falló: Estructura incorrecta');
  }
  
  // Verificar que probabilidades suman ~1.0
  const sum = result.probHomeWin + result.probDraw + result.probAwayWin;
  const diff = Math.abs(sum - 1.0);
  if (diff < 0.01) {
    console.log('  ✅ Test 2 pasado: Probabilidades suman ~1.0');
  } else {
    console.log(`  ❌ Test 2 falló: suma = ${sum}`);
  }
  
  // Verificar que todas las probabilidades son >= 0
  const allPositive = result.probHomeWin >= 0 && result.probDraw >= 0 && result.probAwayWin >= 0;
  if (allPositive) {
    console.log('  ✅ Test 3 pasado: Todas las probabilidades >= 0');
  } else {
    console.log('  ❌ Test 3 falló: Algunas probabilidades son negativas');
  }
  
  console.log('');
}

/**
 * Ejecutar todos los tests
 */
function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 EJECUTANDO TESTS UNITARIOS DEL MOTOR DE PREDICCIONES');
  console.log('='.repeat(60));
  console.log('');
  
  testPoissonProbability();
  testCalculateGoalDistribution();
  testNormalizeXGByLeague();
  testCalculateExpectedGoalsPoisson();
  testCalculateScoreMatrix();
  
  console.log('='.repeat(60));
  console.log('✅ Tests completados');
  console.log('='.repeat(60));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testPoissonProbability,
  testCalculateGoalDistribution,
  testNormalizeXGByLeague,
  testCalculateExpectedGoalsPoisson,
  testCalculateScoreMatrix,
  runAllTests
};
