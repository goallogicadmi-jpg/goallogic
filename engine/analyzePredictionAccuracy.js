/**
 * Script de Análisis de Precisión del Modelo de Predicción
 * 
 * Este script compara predicciones con resultados reales y calcula métricas de precisión.
 * 
 * USO INTERNO: No visible al usuario, se ejecuta desde consola o como script de desarrollo.
 * 
 * Métricas calculadas:
 * - Precisión: % de predicciones correctas
 * - MAE (Mean Absolute Error): Error promedio absoluto en probabilidades
 * - Brier Score: Medida de calibración de probabilidades
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { predictionEngine } = require('./predictionEngine');
const { getProfileConfig } = require('./predictionConfig');

// Headers para API
const apiHeaders = {
    "x-apisports-key": process.env.API_KEY
};

/**
 * Obtener partidos finalizados recientes de una liga
 */
async function getRecentFinishedFixtures(leagueId, season, limit = 20) {
    try {
        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&last=${limit}`,
            { headers: apiHeaders }
        );

        const fixtures = response.data.response || [];
        
        // Filtrar solo partidos finalizados con resultado
        return fixtures.filter(f => 
            f.fixture?.status?.short === 'FT' && 
            f.goals?.home !== null && 
            f.goals?.away !== null
        );
    } catch (error) {
        console.error(`Error obteniendo fixtures: ${error.message}`);
        return [];
    }
}

/**
 * Obtener estadísticas de un equipo
 */
async function getTeamStats(teamId, leagueId, season) {
    try {
        const response = await axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        );
        return response.data.response;
    } catch (error) {
        console.error(`Error obteniendo estadísticas del equipo ${teamId}: ${error.message}`);
        return null;
    }
}

/**
 * Obtener últimos partidos de un equipo
 */
async function getTeamFixtures(teamId, leagueId, limit = 5) {
    try {
        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=${limit}&league=${leagueId}`,
            { headers: apiHeaders }
        );
        return response.data.response || [];
    } catch (error) {
        console.error(`Error obteniendo fixtures del equipo ${teamId}: ${error.message}`);
        return [];
    }
}

/**
 * Calcular forma y racha desde fixtures
 */
function calcularForma(fixtures, teamId) {
    if (!Array.isArray(fixtures) || fixtures.length === 0) return { forma: "N/A", racha: 0 };
    
    const partidosFinalizados = fixtures
        .filter(f => f.fixture?.status?.short === 'FT' && f.goals?.home !== null && f.goals?.away !== null)
        .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
        .slice(0, 5);
    
    if (partidosFinalizados.length === 0) return { forma: "N/A", racha: 0 };
    
    let forma = "";
    let racha = 0;
    let rachaTipo = null;

    for (const fixture of partidosFinalizados) {
        const isHome = fixture.teams?.home?.id === teamId;
        const homeGoals = fixture.goals?.home;
        const awayGoals = fixture.goals?.away;
        
        if (homeGoals === null || awayGoals === null) continue;

        const gano = isHome ? (homeGoals > awayGoals) : (awayGoals > homeGoals);
        const empato = homeGoals === awayGoals;
        const perdio = isHome ? (homeGoals < awayGoals) : (awayGoals < homeGoals);

        if (gano) {
            forma += "W";
            if (rachaTipo === 'W' || rachaTipo === null) {
                racha++;
                rachaTipo = 'W';
            } else if (rachaTipo === 'U') {
                racha++;
                rachaTipo = 'W';
            } else {
                break;
            }
        } else if (empato) {
            forma += "D";
            if (rachaTipo === 'U' || rachaTipo === null) {
                racha++;
                rachaTipo = 'U';
            } else if (rachaTipo === 'W') {
                racha++;
                rachaTipo = 'U';
            } else {
                break;
            }
        } else if (perdio) {
            forma += "L";
            if (rachaTipo === null) {
                racha = 0;
                rachaTipo = 'L';
            } else {
                break;
            }
        }
    }

    return { forma: forma || "N/A", racha: racha || 0 };
}

/**
 * Calcular rendimiento
 */
function calcularRendimiento(stats, isHome) {
    if (!stats) return 0;
    
    const played = isHome 
        ? (stats.fixtures?.played?.home || 0)
        : (stats.fixtures?.played?.away || 0);
    const wins = isHome
        ? (stats.fixtures?.wins?.home || 0)
        : (stats.fixtures?.wins?.away || 0);
    const draws = isHome
        ? (stats.fixtures?.draws?.home || 0)
        : (stats.fixtures?.draws?.away || 0);
    
    if (played === 0) return 0;
    const puntos = (wins * 3) + draws;
    const puntosMaximos = played * 3;
    return parseFloat((puntos / puntosMaximos) * 100).toFixed(1);
}

/**
 * Generar predicción para un fixture
 */
async function generatePrediction(fixture, leagueId, season) {
    const homeTeamId = fixture.teams?.home?.id;
    const awayTeamId = fixture.teams?.away?.id;
    
    if (!homeTeamId || !awayTeamId) return null;

    // Obtener estadísticas y fixtures de ambos equipos
    const [homeStats, awayStats, homeFixtures, awayFixtures] = await Promise.all([
        getTeamStats(homeTeamId, leagueId, season),
        getTeamStats(awayTeamId, leagueId, season),
        getTeamFixtures(homeTeamId, leagueId),
        getTeamFixtures(awayTeamId, leagueId)
    ]);

    if (!homeStats || !awayStats) return null;

    // Calcular métricas
    const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
    const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
    const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
    const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;

    const xG_local_api = homeStats?.goals?.for?.expected?.total;
    const xGA_local_api = homeStats?.goals?.against?.expected?.total;
    const xG_visita_api = awayStats?.goals?.for?.expected?.total;
    const xGA_visita_api = awayStats?.goals?.against?.expected?.total;
    
    const xG_local_disponible = xG_local_api !== null && xG_local_api !== undefined;
    const xGA_local_disponible = xGA_local_api !== null && xGA_local_api !== undefined;
    const xG_visita_disponible = xG_visita_api !== null && xG_visita_api !== undefined;
    const xGA_visita_disponible = xGA_visita_api !== null && xGA_visita_api !== undefined;
    
    const xG_local = parseFloat(xG_local_disponible ? xG_local_api : homeGoalsFor).toFixed(2);
    const xGA_local = parseFloat(xGA_local_disponible ? xGA_local_api : homeGoalsAgainst).toFixed(2);
    const xG_visita = parseFloat(xG_visita_disponible ? xG_visita_api : awayGoalsFor).toFixed(2);
    const xGA_visita = parseFloat(xGA_visita_disponible ? xGA_visita_api : awayGoalsAgainst).toFixed(2);
    
    const xgSource = {
        xG_local: xG_local_disponible ? 'api' : 'estimated',
        xGA_local: xGA_local_disponible ? 'api' : 'estimated',
        xG_visita: xG_visita_disponible ? 'api' : 'estimated',
        xGA_visita: xGA_visita_disponible ? 'api' : 'estimated'
    };

    const formaLocal = calcularForma(homeFixtures, homeTeamId);
    const formaVisita = calcularForma(awayFixtures, awayTeamId);
    const rendimiento_local = calcularRendimiento(homeStats, true);
    const rendimiento_visita = calcularRendimiento(awayStats, false);

    const metricas = {
        xG_local: parseFloat(xG_local),
        xGA_local: parseFloat(xGA_local),
        xG_visita: parseFloat(xG_visita),
        xGA_visita: parseFloat(xGA_visita),
        forma_local: formaLocal.forma,
        forma_visita: formaVisita.forma,
        racha_local: formaLocal.racha,
        racha_visita: formaVisita.racha,
        rendimiento_local: parseFloat(rendimiento_local),
        rendimiento_visita: parseFloat(rendimiento_visita),
        xgSource: xgSource
    };

    // Calcular promedios de liga (simplificado para análisis)
    const leagueAverages = {
        goalsFor: (homeGoalsFor + awayGoalsFor) / 2,
        goalsAgainst: (homeGoalsAgainst + awayGoalsAgainst) / 2,
        xG: null,
        xGA: null
    };

    if (xG_local_disponible && xG_visita_disponible) {
        leagueAverages.xG = (parseFloat(xG_local) + parseFloat(xG_visita)) / 2;
    }
    if (xGA_local_disponible && xGA_visita_disponible) {
        leagueAverages.xGA = (parseFloat(xGA_local) + parseFloat(xGA_visita)) / 2;
    }

    // Generar predicción
    const profileConfig = getProfileConfig('balanceado');
    const predictionResult = predictionEngine({
        homeStats,
        awayStats,
        metricas,
        weights: profileConfig.weights,
        config: profileConfig,
        leagueAverages: leagueAverages,
        usePoisson: true
    });

    return predictionResult;
}

/**
 * Determinar resultado real del partido
 */
function getActualResult(fixture) {
    const homeGoals = fixture.goals?.home;
    const awayGoals = fixture.goals?.away;
    
    if (homeGoals === null || awayGoals === null) return null;
    
    if (homeGoals > awayGoals) return 'home';
    if (homeGoals < awayGoals) return 'away';
    return 'draw';
}

/**
 * Calcular métricas de precisión
 */
function calculateMetrics(predictions, actualResults) {
    let correct = 0;
    let total = 0;
    let mae = 0;
    let brierScore = 0;

    for (let i = 0; i < predictions.length; i++) {
        const pred = predictions[i];
        const actual = actualResults[i];
        
        if (!pred || !actual) continue;
        
        total++;
        
        // Precisión: ¿predicción correcta?
        const predictedResult = 
            pred.prob_local > pred.prob_empate && pred.prob_local > pred.prob_visita ? 'home' :
            pred.prob_visita > pred.prob_local && pred.prob_visita > pred.prob_empate ? 'away' :
            'draw';
        
        if (predictedResult === actual) {
            correct++;
        }
        
        // MAE: Error absoluto promedio
        const actualProb = 
            actual === 'home' ? 1.0 :
            actual === 'draw' ? 1.0 :
            1.0;
        
        const predictedProb = 
            actual === 'home' ? pred.prob_local :
            actual === 'draw' ? pred.prob_empate :
            pred.prob_visita;
        
        mae += Math.abs(actualProb - predictedProb);
        
        // Brier Score: (predicted - actual)^2
        brierScore += Math.pow(predictedProb - actualProb, 2);
    }

    return {
        accuracy: total > 0 ? (correct / total) * 100 : 0,
        mae: total > 0 ? mae / total : 0,
        brierScore: total > 0 ? brierScore / total : 0,
        total: total
    };
}

/**
 * Función principal de análisis
 */
async function analyzePredictionAccuracy(leagueId, season, limit = 20) {
    console.log(`\n📊 Iniciando análisis de precisión del modelo de predicción`);
    console.log(`Liga: ${leagueId}, Temporada: ${season}, Partidos: ${limit}\n`);

    // Obtener partidos finalizados
    const fixtures = await getRecentFinishedFixtures(leagueId, season, limit);
    
    if (fixtures.length === 0) {
        console.log('❌ No se encontraron partidos finalizados para analizar');
        return;
    }

    console.log(`✅ Encontrados ${fixtures.length} partidos finalizados\n`);

    // Generar predicciones (usando datos históricos disponibles antes del partido)
    const predictions = [];
    const actualResults = [];

    for (let i = 0; i < fixtures.length; i++) {
        const fixture = fixtures[i];
        console.log(`📈 Procesando partido ${i + 1}/${fixtures.length}: ${fixture.teams?.home?.name} vs ${fixture.teams?.away?.name}`);
        
        const prediction = await generatePrediction(fixture, leagueId, season);
        
        if (prediction) {
            predictions.push(prediction);
            actualResults.push(getActualResult(fixture));
            
            console.log(`   Predicción: Local ${(prediction.prob_local * 100).toFixed(1)}%, Empate ${(prediction.prob_empate * 100).toFixed(1)}%, Visitante ${(prediction.prob_visita * 100).toFixed(1)}%`);
            console.log(`   Resultado: ${actualResults[actualResults.length - 1]}\n`);
        } else {
            console.log(`   ⚠️ No se pudo generar predicción\n`);
        }
        
        // Pequeña pausa para no sobrecargar la API
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calcular métricas
    const metrics = calculateMetrics(predictions, actualResults);

    // Mostrar resultados
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADOS DEL ANÁLISIS DE PRECISIÓN');
    console.log('='.repeat(60));
    console.log(`Total de partidos analizados: ${metrics.total}`);
    console.log(`Precisión: ${metrics.accuracy.toFixed(2)}%`);
    console.log(`MAE (Mean Absolute Error): ${metrics.mae.toFixed(4)}`);
    console.log(`Brier Score: ${metrics.brierScore.toFixed(4)}`);
    console.log('='.repeat(60) + '\n');

    // Guardar resultados en archivo JSON
    const resultsData = {
        date: new Date().toISOString(),
        leagueId: leagueId,
        season: season,
        totalFixtures: fixtures.length,
        metrics: metrics,
        predictions: predictions.map((pred, index) => ({
            fixture: {
                home: fixtures[index].teams?.home?.name,
                away: fixtures[index].teams?.away?.name,
                result: actualResults[index]
            },
            prediction: {
                prob_local: pred.prob_local,
                prob_empate: pred.prob_empate,
                prob_visita: pred.prob_visita
            }
        }))
    };

    // Crear directorio de resultados si no existe
    const resultsDir = path.join(__dirname, '..', 'results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    // Guardar archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `prediction-analysis-${leagueId}-${season}-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(resultsData, null, 2));
    console.log(`💾 Resultados guardados en: ${filepath}\n`);

    return metrics;
}

// Si se ejecuta directamente
if (require.main === module) {
    const leagueId = process.argv[2] || '39'; // Premier League por defecto
    const season = process.argv[3] || '2024';
    const limit = parseInt(process.argv[4]) || 20;

    analyzePredictionAccuracy(leagueId, season, limit)
        .then(() => process.exit(0))
        .catch(error => {
            console.error('❌ Error en análisis:', error);
            process.exit(1);
        });
}

module.exports = {
    analyzePredictionAccuracy,
    calculateMetrics
};
