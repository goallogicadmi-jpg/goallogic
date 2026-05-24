const axios = require('axios');
require('dotenv').config();
const { buildCupCompetitionPayload } = require('../utils/cupCompetitionUtils');
const { getCompetitionByIdAndDomain } = require('../utils/competitionCatalog');

const apiHeaders = {
    "x-apisports-key": process.env.API_KEY,
    "x-rapidapi-host": "v3.football.api-sports.io"
};

const getLiveFixtures = async (req, res) => {
    try {
        const response = await axios.get(
            'https://v3.football.api-sports.io/fixtures?live=all',
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo fixtures en vivo:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener fixtures en vivo" });
    }
};

const getFixturesByLeague = async (req, res) => {
    try {
        const { leagueId, season, next = 10, last = 10 } = req.query;
        if (!leagueId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: leagueId, season" });
        }
        const promises = [];
        if (next > 0) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&next=${next}`,
                    { headers: apiHeaders }
                )
            );
        }
        if (last > 0) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&last=${last}`,
                    { headers: apiHeaders }
                )
            );
        }
        const results = await Promise.all(promises);
        res.json({
            proximos: next > 0 ? results[0].data.response : [],
            pasados: last > 0 ? (next > 0 ? results[1].data.response : results[0].data.response) : []
        });
    } catch (error) {
        console.error("❌ Error obteniendo fixtures:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener fixtures" });
    }
};

const getHeadToHead = async (req, res) => {
    try {
        const { team1, team2 } = req.query;
        if (!team1 || !team2) {
            return res.status(400).json({ error: "Faltan parámetros: team1, team2" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${team1}-${team2}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo H2H:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener enfrentamientos históricos" });
    }
};

const getTeamSquad = async (req, res) => {
    try {
        const { teamId, season } = req.query;
        if (!teamId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: teamId, season" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo squad:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener jugadores del equipo" });
    }
};

const getPlayerStats = async (req, res) => {
    try {
        const { playerId, season, leagueId } = req.query;
        if (!playerId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: playerId, season" });
        }
        let url = `https://v3.football.api-sports.io/players?id=${playerId}&season=${season}`;
        if (leagueId) {
            url += `&league=${leagueId}`;
        }
        const response = await axios.get(url, { headers: apiHeaders });
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo estadísticas de jugador:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener estadísticas del jugador" });
    }
};

const getLeagueSeasons = async (req, res) => {
    try {
        const { leagueId } = req.query;
        if (!leagueId) {
            return res.status(400).json({ error: "Falta parámetro: leagueId" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/leagues?id=${leagueId}`,
            { headers: apiHeaders }
        );
        if (!response.data.response || response.data.response.length === 0) {
            return res.status(404).json({ error: "Liga no encontrada" });
        }
        const seasons = response.data.response[0].seasons || [];
        const leagueData = response.data.response[0].league;
        
        // Detectar tipo de competición
        // IDs conocidos de competiciones tipo copa
        const cupCompetitions = {
          2: true,    // Champions League
          5: true,    // Champions League (alternativo)
          848: true,  // Champions League (alternativo)
          13: true,   // Copa Libertadores
          14: true,   // Copa Sudamericana
          1: true,    // Mundial
          3: true,    // Euro
        };
        
        const isCup = cupCompetitions[parseInt(leagueId)] || false;
        const type = isCup ? 'cup' : 'league';
        
        res.json({
            leagueId,
            leagueName: leagueData.name,
            type: type,
            seasons: seasons.map(s => ({
                year: s.year,
                start: s.start,
                end: s.end,
                current: s.current
            }))
        });
    } catch (error) {
        console.error("❌ Error obteniendo temporadas:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener temporadas" });
    }
};

const getFixtureDetails = async (req, res) => {
    try {
        const { fixtureId } = req.params;
        const { include } = req.query;
        const promises = [
            axios.get(
                `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
                { headers: apiHeaders }
            )
        ];
        if (include && include.includes('events')) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`,
                    { headers: apiHeaders }
                )
            );
        }
        if (include && include.includes('lineups')) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
                    { headers: apiHeaders }
                )
            );
        }
        if (include && include.includes('statistics')) {
            promises.push(
                axios.get(
                    `https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`,
                    { headers: apiHeaders }
                )
            );
        }
        const results = await Promise.all(promises);
        const response = {
            fixture: results[0].data.response[0] || null,
            events: include && include.includes('events') ? results[1]?.data.response || [] : null,
            lineups: include && include.includes('lineups') ? results[include.includes('events') ? 2 : 1]?.data.response || [] : null,
            statistics: include && include.includes('statistics') ? results[results.length - 1]?.data.response || [] : null
        };
        res.json(response);
    } catch (error) {
        console.error("❌ Error obteniendo fixture detallado:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener fixture detallado" });
    }
};

const searchFootballData = async (req, res) => {
    try {
        const { q, type = 'teams' } = req.query;
        if (!q || q.length < 2) {
            return res.json({ response: [] });
        }
        let url;
        if (type === 'teams') {
            url = `https://v3.football.api-sports.io/teams?search=${encodeURIComponent(q)}`;
        } else if (type === 'players') {
            url = `https://v3.football.api-sports.io/players?search=${encodeURIComponent(q)}`;
        } else if (type === 'coaches') {
            url = `https://v3.football.api-sports.io/coaches?search=${encodeURIComponent(q)}`;
        } else {
            return res.status(400).json({ error: "Tipo de búsqueda inválido" });
        }
        const response = await axios.get(url, { headers: apiHeaders });
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error en búsqueda:", error.response?.data || error);
        res.status(500).json({ error: "Error en búsqueda" });
    }
};

const getTeamInfo = async (req, res) => {
    try {
        const { teamId } = req.query;
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/teams?id=${teamId}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo info del equipo:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener información del equipo" });
    }
};

const getTeamSquadInfo = async (req, res) => {
    try {
        const { teamId, season } = req.query;
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/players/squads?team=${teamId}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo squad:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener jugadores del equipo" });
    }
};

const getTeamStats = async (req, res) => {
    try {
        const { teamId, leagueId, season } = req.query;
        if (!teamId || !leagueId || !season) {
            return res.status(400).json({ error: "Faltan parámetros: teamId, leagueId, season" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo estadísticas del equipo:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener estadísticas del equipo" });
    }
};

const getTeamLastMatches = async (req, res) => {
    try {
        const { teamId, limit = 10 } = req.query;
        if (!teamId) {
            return res.status(400).json({ error: "Falta parámetro: teamId" });
        }
        const response = await axios.get(
            `https://v3.football.api-sports.io/fixtures?team=${teamId}&last=${limit}`,
            { headers: apiHeaders }
        );
        res.json(response.data);
    } catch (error) {
        console.error("❌ Error obteniendo últimos partidos:", error.response?.data || error);
        res.status(500).json({ error: "Error al obtener últimos partidos del equipo" });
    }
};

/**
 * Obtener datos de competición tipo copa (con grupos)
 */
const getCupCompetition = async (req, res) => {
    try {
        const { competitionId } = req.params;
        const { season, domain } = req.query;
        
        if (!competitionId || !season) {
            return res.status(400).json({ 
                success: false,
                error: "Faltan parámetros: competitionId, season" 
            });
        }

        if (domain) {
            const catalogEntry = getCompetitionByIdAndDomain(competitionId, domain);
            if (!catalogEntry) {
                return res.status(404).json({
                    success: false,
                    error: 'La competición no pertenece al dominio solicitado',
                });
            }
        }

        console.log(`🔍 [getCupCompetition] SOLICITANDO DATOS: competitionId=${competitionId}, season=${season}, domain=${domain || 'any'}`);

        const seasonsToTry = [parseInt(season, 10)];
        if (Number(competitionId) === 1 && seasonsToTry[0] >= 2026) {
            seasonsToTry.push(2022);
        }

        let standingsPayload = [];
        let fixtures = [];
        let seasonUsed = seasonsToTry[0];

        for (const trySeason of seasonsToTry) {
            const [standingsResponse, fixturesResponse] = await Promise.all([
                axios
                    .get(`https://v3.football.api-sports.io/standings?league=${competitionId}&season=${trySeason}`, {
                        headers: apiHeaders,
                    })
                    .catch((error) => {
                        if (error.response?.status === 404) {
                            return { data: { response: [] } };
                        }
                        throw error;
                    }),
                axios
                    .get(`https://v3.football.api-sports.io/fixtures?league=${competitionId}&season=${trySeason}`, {
                        headers: apiHeaders,
                    })
                    .catch((error) => {
                        if (error.response?.status === 404) {
                            return { data: { response: [] } };
                        }
                        throw error;
                    }),
            ]);

            standingsPayload = standingsResponse.data.response || [];
            fixtures = fixturesResponse.data.response || [];
            seasonUsed = trySeason;

            if (standingsPayload.length > 0 || fixtures.length > 0) {
                break;
            }
        }

        if (standingsPayload.length === 0 && fixtures.length === 0) {
            return res.status(404).json({
                success: false,
                error: "No se encontraron datos para esta competición",
            });
        }

        const competitionName =
            standingsPayload[0]?.league?.name ||
            fixtures[0]?.league?.name ||
            "Competition";

        const allStandings =
            standingsPayload.length > 1
                ? standingsPayload.flatMap((item) => {
                    if (!Array.isArray(item.league?.standings)) {
                        return [];
                    }

                    return Array.isArray(item.league.standings[0])
                        ? item.league.standings
                        : [item.league.standings];
                })
                : standingsPayload[0]?.league?.standings || [];

        const cupPayload = buildCupCompetitionPayload({
            competitionId: Number(competitionId),
            standings: allStandings,
            fixtures,
        });

        res.json({
            success: true,
            data: {
                competitionId: parseInt(competitionId),
                name: competitionName,
                type: 'cup',
                hasGroups: cupPayload.hasGroups,
                phase: cupPayload.phase,
                groups: cupPayload.groups,
                bracket: cupPayload.bracket,
                season: seasonUsed,
                groupContractVersion: 1,
            },
        });

    } catch (error) {
        console.error("❌ Error obteniendo competición tipo copa:", error.response?.data || error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener datos de la competición tipo copa" 
        });
    }
};

/**
 * Obtener datos de un grupo específico
 */
const getCupGroup = async (req, res) => {
    try {
        const { competitionId, groupName } = req.params;
        const { season, domain } = req.query;
        
        if (!competitionId || !groupName || !season) {
            return res.status(400).json({ 
                success: false,
                error: "Faltan parámetros: competitionId, groupName, season" 
            });
        }

        if (domain) {
            const catalogEntry = getCompetitionByIdAndDomain(competitionId, domain);
            if (!catalogEntry) {
                return res.status(404).json({
                    success: false,
                    error: 'La competición no pertenece al dominio solicitado',
                });
            }
        }

        const [standingsResponse, fixturesResponse] = await Promise.all([
            axios
                .get(`https://v3.football.api-sports.io/standings?league=${competitionId}&season=${season}`, {
                    headers: apiHeaders,
                })
                .catch((error) => {
                    if (error.response?.status === 404) {
                        return { data: { response: [] } };
                    }
                    throw error;
                }),
            axios
                .get(`https://v3.football.api-sports.io/fixtures?league=${competitionId}&season=${season}`, {
                    headers: apiHeaders,
                })
                .catch((error) => {
                    if (error.response?.status === 404) {
                        return { data: { response: [] } };
                    }
                    throw error;
                }),
        ]);

        const standingsPayload = standingsResponse.data.response || [];
        const fixtures = fixturesResponse.data.response || [];
        const allStandings =
            standingsPayload.length > 1
                ? standingsPayload.flatMap((item) => {
                    if (!Array.isArray(item.league?.standings)) {
                        return [];
                    }

                    return Array.isArray(item.league.standings[0])
                        ? item.league.standings
                        : [item.league.standings];
                })
                : standingsPayload[0]?.league?.standings || [];

        const cupPayload = buildCupCompetitionPayload({
            competitionId: Number(competitionId),
            standings: allStandings,
            fixtures,
        });

        const normalizedRequest = String(groupName).trim().toUpperCase();
        const selectedGroup = (cupPayload.groups || []).find((group) => {
            return (
                String(group.groupKey || "").toUpperCase() === normalizedRequest ||
                String(group.groupLabel || "").toUpperCase() === normalizedRequest ||
                String(group.groupName || "").toUpperCase() === normalizedRequest
            );
        });

        if (!selectedGroup) {
            return res.status(404).json({
                success: false,
                error: `No se encontró el grupo ${groupName}`,
            });
        }

        res.json({
            success: true,
            data: selectedGroup,
        });

    } catch (error) {
        console.error("❌ Error obteniendo grupo:", error.response?.data || error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener datos del grupo" 
        });
    }
};

module.exports = {
    getLiveFixtures,
    getFixturesByLeague,
    getHeadToHead,
    getTeamSquad,
    getPlayerStats,
    getLeagueSeasons,
    getFixtureDetails,
    searchFootballData,
    getTeamInfo,
    getTeamSquadInfo,
    getTeamStats,
    getTeamLastMatches,
    getCupCompetition,
    getCupGroup
};
