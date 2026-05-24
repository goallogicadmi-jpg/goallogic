/**
 * Funciones auxiliares para predicciones
 * Reutilizables en múltiples endpoints
 */

const axios = require('axios');
const { predictionEngine } = require('./predictionEngine');
const { getProfileWeights } = require('./predictionProfiles');

const apiHeaders = {
    "x-apisports-key": process.env.API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
};

/**
 * Calcular forma reciente de un equipo
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
        
        if (homeGoals === null || awayGoals === null || homeGoals === undefined || awayGoals === undefined) {
            forma += "?";
            continue;
        }

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
 * Calcular rendimiento (porcentaje de puntos obtenidos)
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
 * Obtener predicciones completas para un fixture
 * @param {number} fixtureId - ID del fixture
 * @param {string} profile - Perfil de predicción
 * @returns {Promise<Object>} - Objeto con predicciones y métricas
 */
async function obtenerPrediccionesCompletas(fixtureId, profile = 'balanceado') {
    // Obtener datos del fixture
    const fixtureResponse = await axios.get(
        `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
        { headers: apiHeaders }
    );

    if (!fixtureResponse.data.response || fixtureResponse.data.response.length === 0) {
        throw new Error("Fixture no encontrado");
    }

    const fixture = fixtureResponse.data.response[0];
    const homeTeamId = fixture.teams?.home?.id;
    const awayTeamId = fixture.teams?.away?.id;
    const leagueId = fixture.league?.id;
    const season = fixture.league?.season;

    if (!homeTeamId || !awayTeamId || !leagueId || !season) {
        throw new Error("Datos incompletos del fixture");
    }

    // Obtener estadísticas y últimos partidos
    const [homeStatsRes, awayStatsRes, homeFixturesRes, awayFixturesRes] = await Promise.all([
        axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${homeTeamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        ).catch(() => ({ data: { response: null } })),
        axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${awayTeamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        ).catch(() => ({ data: { response: null } })),
        axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${homeTeamId}&last=5&league=${leagueId}`,
            { headers: apiHeaders }
        ).catch(() => ({ data: { response: [] } })),
        axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${awayTeamId}&last=5&league=${leagueId}`,
            { headers: apiHeaders }
        ).catch(() => ({ data: { response: [] } }))
    ]);

    const homeStats = homeStatsRes.data.response;
    const awayStats = awayStatsRes.data.response;
    const homeFixtures = homeFixturesRes.data.response || [];
    const awayFixtures = awayFixturesRes.data.response || [];

    // Calcular métricas avanzadas
    const homeGoalsFor = homeStats?.goals?.for?.average?.total || 0;
    const homeGoalsAgainst = homeStats?.goals?.against?.average?.total || 0;
    const awayGoalsFor = awayStats?.goals?.for?.average?.total || 0;
    const awayGoalsAgainst = awayStats?.goals?.against?.average?.total || 0;

    const xG_local = parseFloat(homeStats?.goals?.for?.expected?.total || homeGoalsFor).toFixed(2);
    const xGA_local = parseFloat(homeStats?.goals?.against?.expected?.total || homeGoalsAgainst).toFixed(2);
    const xG_visita = parseFloat(awayStats?.goals?.for?.expected?.total || awayGoalsFor).toFixed(2);
    const xGA_visita = parseFloat(awayStats?.goals?.against?.expected?.total || awayGoalsAgainst).toFixed(2);

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
        promedio_goles_local: {
            a_favor: parseFloat(homeGoalsFor.toFixed(2)),
            en_contra: parseFloat(homeGoalsAgainst.toFixed(2))
        },
        promedio_goles_visita: {
            a_favor: parseFloat(awayGoalsFor.toFixed(2)),
            en_contra: parseFloat(awayGoalsAgainst.toFixed(2))
        }
    };

    // Obtener pesos del perfil
    const weights = getProfileWeights(profile);

    // Usar motor de predicción
    const predictionResult = predictionEngine({
        homeStats,
        awayStats,
        metricas,
        weights
    });

    // Determinar resultado real si el partido ya finalizó
    let resultadoReal = null;
    if (fixture.fixture?.status?.short === 'FT') {
        const homeGoals = fixture.goals?.home;
        const awayGoals = fixture.goals?.away;
        if (homeGoals !== null && awayGoals !== null) {
            let resultado = null;
            if (homeGoals > awayGoals) {
                resultado = 'W';
            } else if (homeGoals === awayGoals) {
                resultado = 'D';
            } else {
                resultado = 'L';
            }
            resultadoReal = {
                resultado: resultado,
                goles_local: homeGoals,
                goles_visita: awayGoals,
            };
        }
    }

    return {
        fixture: {
            id: parseInt(fixtureId),
            homeTeam: fixture.teams?.home,
            awayTeam: fixture.teams?.away,
            league: fixture.league,
            date: fixture.fixture?.date,
            status: fixture.fixture?.status,
        },
        predicciones: {
            prob_local: predictionResult.prob_local,
            prob_empate: predictionResult.prob_empate,
            prob_visita: predictionResult.prob_visita,
            goles_local: predictionResult.goles_local,
            goles_visita: predictionResult.goles_visita,
            recomendacion: predictionResult.recomendacion,
        },
        metricas_avanzadas: metricas,
        profile: profile,
        resultadoReal: resultadoReal,
        homeTeamId: homeTeamId,
        awayTeamId: awayTeamId,
    };
}

module.exports = {
    obtenerPrediccionesCompletas,
    calcularForma,
    calcularRendimiento,
};
