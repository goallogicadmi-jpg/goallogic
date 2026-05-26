const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const LeagueCatalog = require('../models/LeagueCatalog');

const CATALOG_PATH = path.join(__dirname, '../frontend/src/config/competitionCatalog.json');

let memoryCatalog = null;

function readJsonCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  return JSON.parse(raw);
}

function docToEntry(doc) {
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    id: row.leagueId,
    leagueId: row.leagueId,
    name: row.nameOverride || row.name,
    country: row.country,
    logo: row.logoOverride || row.logo,
    domain: row.domain,
    type: row.type,
    format: row.format,
    participantType: row.participantType,
    priority: row.priority,
    seasonMode: row.seasonMode,
    features: row.features || {},
    active: row.active !== false,
    seasonOverride: row.seasonOverride,
    nameOverride: row.nameOverride,
    logoOverride: row.logoOverride,
    lastSyncAt: row.lastSyncAt,
    lastSyncStatus: row.lastSyncStatus,
    lastSyncDurationMs: row.lastSyncDurationMs,
    lastSyncError: row.lastSyncError,
    health: row.health || {},
    syncHistory: row.syncHistory || [],
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  };
}

function jsonToDocPayload(item) {
  return {
    leagueId: Number(item.id),
    name: item.name,
    country: item.country || '',
    logo: item.logo || '',
    domain: item.domain || 'club',
    type: item.type || 'League',
    format: item.format || 'league',
    participantType: item.participantType || 'club',
    priority: item.priority ?? 999,
    seasonMode: item.seasonMode || 'european_split',
    features: item.features || {},
    active: item.active !== false,
  };
}

async function seedFromJsonIfEmpty() {
  const count = await LeagueCatalog.countDocuments();
  if (count > 0) return 0;

  const items = readJsonCatalog();
  const docs = items.map((item) => jsonToDocPayload(item));
  await LeagueCatalog.insertMany(docs, { ordered: false });
  return docs.length;
}

async function reloadMemoryCatalog() {
  await seedFromJsonIfEmpty();
  const docs = await LeagueCatalog.find().sort({ priority: 1 }).lean();
  memoryCatalog = docs.map((d) => docToEntry(d));
  return memoryCatalog;
}

async function initLeagueCatalogCache() {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      memoryCatalog = readJsonCatalog().map((item) => ({
        ...item,
        leagueId: item.id,
        active: true,
      }));
      return memoryCatalog;
    }
    return await reloadMemoryCatalog();
  } catch (_) {
    memoryCatalog = readJsonCatalog().map((item) => ({
      ...item,
      leagueId: item.id,
      active: true,
    }));
    return memoryCatalog;
  }
}

function getMemoryCatalog() {
  if (memoryCatalog?.length) return memoryCatalog;
  return readJsonCatalog().map((item) => ({
    ...item,
    leagueId: item.id,
    active: true,
  }));
}

function getCompetitionCatalog({ activeOnly = false } = {}) {
  let list = [...getMemoryCatalog()].sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
  if (activeOnly) list = list.filter((c) => c.active !== false);
  return list;
}

function getCompetitionsByDomain(domain, options = {}) {
  return getCompetitionCatalog(options).filter((c) => c.domain === domain);
}

function getCompetitionById(competitionId) {
  const parsedId = Number(competitionId);
  return getMemoryCatalog().find((c) => Number(c.id) === parsedId) || null;
}

function getCompetitionByIdAndDomain(competitionId, domain) {
  const c = getCompetitionById(competitionId);
  if (!c || c.domain !== domain) return null;
  if (c.active === false) return null;
  return c;
}

function getCompetitionIdsByDomain(domain, options = {}) {
  return getCompetitionsByDomain(domain, options).map((c) => Number(c.id));
}

async function getLeagueDoc(leagueId) {
  return LeagueCatalog.findOne({ leagueId: Number(leagueId) });
}

function mapLeagueListItem(entry) {
  const effectiveStatus = entry.active === false ? 'inactive' : 'active';
  const health = entry.health || {};
  let healthLabel = 'unknown';
  if (entry.lastSyncStatus === 'success' && health.standingsOk && health.teamsCount > 0) {
    healthLabel = 'healthy';
  } else if (entry.lastSyncStatus === 'error') {
    healthLabel = 'error';
  } else if (entry.lastSyncAt) {
    healthLabel = 'partial';
  }

  return {
    id: String(entry.leagueId),
    leagueId: entry.leagueId,
    name: entry.name,
    country: entry.country,
    logo: entry.logo,
    domain: entry.domain,
    type: entry.type,
    active: entry.active !== false,
    effectiveStatus,
    seasonOverride: entry.seasonOverride,
    priority: entry.priority,
    lastSyncAt: entry.lastSyncAt,
    lastSyncStatus: entry.lastSyncStatus,
    lastSyncDurationMs: entry.lastSyncDurationMs,
    lastSyncError: entry.lastSyncError,
    health: { ...health, label: healthLabel },
    updatedAt: entry.updatedAt,
  };
}

module.exports = {
  readJsonCatalog,
  seedFromJsonIfEmpty,
  reloadMemoryCatalog,
  initLeagueCatalogCache,
  getMemoryCatalog,
  getCompetitionCatalog,
  getCompetitionsByDomain,
  getCompetitionById,
  getCompetitionByIdAndDomain,
  getCompetitionIdsByDomain,
  getLeagueDoc,
  docToEntry,
  mapLeagueListItem,
};
