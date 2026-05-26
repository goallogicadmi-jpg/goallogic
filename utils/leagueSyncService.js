const logger = require('./logger');
const LeagueCatalog = require('../models/LeagueCatalog');
const {
  resolveSeason,
  fetchStandings,
  fetchTeams,
  fetchFixturesSample,
  fetchLeagueInfo,
} = require('./apiFootballClient');
const { reloadMemoryCatalog, getLeagueDoc } = require('./leagueCatalogStore');

const MAX_HISTORY = 25;

async function forceSyncLeague(leagueId) {
  const started = Date.now();
  const doc = await getLeagueDoc(leagueId);
  if (!doc) {
    const err = new Error('Liga no encontrada en catálogo');
    err.statusCode = 404;
    throw err;
  }

  doc.lastSyncStatus = 'running';
  doc.lastSyncError = null;
  await doc.save();

  const steps = { seasons: false, standings: false, teams: false, fixtures: false };
  const counts = { teams: 0, standingsGroups: 0, fixtures: 0 };
  let seasonUsed = null;
  let errorMessage = null;

  try {
    await fetchLeagueInfo(leagueId);
    steps.seasons = true;

    seasonUsed = await resolveSeason(leagueId, doc.seasonOverride);
    if (!doc.seasonOverride) {
      doc.seasonOverride = seasonUsed;
    }

    const standings = await fetchStandings(leagueId, seasonUsed);
    counts.standingsGroups = standings.length;
    steps.standings = standings.length > 0;

    const teams = await fetchTeams(leagueId, seasonUsed);
    counts.teams = teams.length;
    steps.teams = teams.length > 0;

    const fixtures = await fetchFixturesSample(leagueId, seasonUsed);
    counts.fixtures = fixtures.length;
    steps.fixtures = fixtures.length > 0;

    const apiInfo = await fetchLeagueInfo(leagueId);
    if (apiInfo.league?.name && !doc.nameOverride) {
      doc.name = apiInfo.league.name;
    }
    if (apiInfo.country?.name) {
      doc.country = apiInfo.country.name;
    }
    if (apiInfo.league?.logo && !doc.logoOverride) {
      doc.logo = apiInfo.league.logo;
    }

    doc.lastSyncStatus = 'success';
    doc.lastSyncError = null;
    doc.health = {
      standingsOk: steps.standings,
      teamsCount: counts.teams,
      fixturesCount: counts.fixtures,
      seasonUsed,
      checkedAt: new Date(),
    };
  } catch (err) {
    errorMessage = err.message || 'Error de sincronización';
    doc.lastSyncStatus = 'error';
    doc.lastSyncError = errorMessage.slice(0, 500);
    logger.error('league_sync_failed', { leagueId, message: errorMessage });
  }

  const durationMs = Date.now() - started;
  doc.lastSyncAt = new Date();
  doc.lastSyncDurationMs = durationMs;

  const historyEntry = {
    at: new Date(),
    status: doc.lastSyncStatus === 'success' ? 'success' : 'error',
    durationMs,
    error: errorMessage,
    seasonUsed,
    steps,
    counts,
  };

  doc.syncHistory = [...(doc.syncHistory || []), historyEntry].slice(-MAX_HISTORY);
  await doc.save();
  await reloadMemoryCatalog();

  if (doc.lastSyncStatus === 'error') {
    const err = new Error(errorMessage || 'Sync fallido');
    err.statusCode = 502;
    err.data = { historyEntry, doc: doc.toObject() };
    throw err;
  }

  return {
    leagueId: doc.leagueId,
    durationMs,
    seasonUsed,
    steps,
    counts,
    health: doc.health,
  };
}

module.exports = {
  forceSyncLeague,
};
