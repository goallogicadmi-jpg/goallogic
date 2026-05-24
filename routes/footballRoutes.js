const express = require('express');
const {
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
} = require('../controllers/footballController');

const router = express.Router();

router.get('/fixtures/live', getLiveFixtures);
router.get('/fixtures/league', getFixturesByLeague);
router.get('/h2h', getHeadToHead);
router.get('/squad', getTeamSquad);
router.get('/team-info', getTeamInfo);
router.get('/team-squad', getTeamSquadInfo);
router.get('/team-stats', getTeamStats);
router.get('/team-last-matches', getTeamLastMatches);
router.get('/player/stats', getPlayerStats);
router.get('/league/seasons', getLeagueSeasons);
router.get('/fixtures/:fixtureId', getFixtureDetails);
router.get('/search', searchFootballData);

// Rutas para competiciones tipo copa
router.get('/competition/:competitionId/cup', getCupCompetition);
router.get('/competition/:competitionId/group/:groupName', getCupGroup);

module.exports = router;
