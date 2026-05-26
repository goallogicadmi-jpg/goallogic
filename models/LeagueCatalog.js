const mongoose = require('mongoose');

const syncHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    status: { type: String, enum: ['success', 'error'], required: true },
    durationMs: { type: Number, default: 0 },
    error: { type: String, default: null },
    seasonUsed: { type: Number, default: null },
    steps: {
      seasons: { type: Boolean, default: false },
      standings: { type: Boolean, default: false },
      teams: { type: Boolean, default: false },
      fixtures: { type: Boolean, default: false },
    },
    counts: {
      teams: { type: Number, default: 0 },
      standingsGroups: { type: Number, default: 0 },
      fixtures: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const healthSchema = new mongoose.Schema(
  {
    standingsOk: { type: Boolean, default: false },
    teamsCount: { type: Number, default: 0 },
    fixturesCount: { type: Number, default: 0 },
    seasonUsed: { type: Number, default: null },
    checkedAt: { type: Date, default: null },
  },
  { _id: false }
);

const leagueCatalogSchema = new mongoose.Schema(
  {
    leagueId: { type: Number, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    country: { type: String, default: '' },
    logo: { type: String, default: '' },
    domain: { type: String, enum: ['club', 'selection'], default: 'club', index: true },
    type: { type: String, default: 'League' },
    format: { type: String, default: 'league' },
    participantType: { type: String, default: 'club' },
    priority: { type: Number, default: 999 },
    seasonMode: { type: String, default: 'european_split' },
    features: { type: mongoose.Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true, index: true },
    seasonOverride: { type: Number, default: null },
    nameOverride: { type: String, default: null, trim: true },
    logoOverride: { type: String, default: null, trim: true },
    lastSyncAt: { type: Date, default: null },
    lastSyncStatus: {
      type: String,
      enum: ['success', 'error', 'running', null],
      default: null,
    },
    lastSyncDurationMs: { type: Number, default: null },
    lastSyncError: { type: String, default: null },
    health: { type: healthSchema, default: () => ({}) },
    syncHistory: { type: [syncHistorySchema], default: [] },
  },
  { timestamps: true, collection: 'league_catalog' }
);

module.exports = mongoose.model('LeagueCatalog', leagueCatalogSchema);
