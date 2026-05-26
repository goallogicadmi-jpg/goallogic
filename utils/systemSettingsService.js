const os = require('os');
const mongoose = require('mongoose');
const SystemSetting = require('../models/SystemSetting');
const SystemSettingRevision = require('../models/SystemSettingRevision');
const {
  SETTINGS_DEFINITIONS,
  DEFINITIONS_BY_KEY,
  CATEGORIES,
} = require('./systemSettingsDefaults');
const logger = require('./logger');

let cache = new Map();
let cacheLoaded = false;

function logSettingsAction(action, req, payload = {}) {
  logger.info('admin_settings_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    ...payload,
  });
}

function validateValue(def, rawValue) {
  const type = def.type;
  if (type === 'boolean') {
    if (typeof rawValue === 'boolean') return rawValue;
    if (rawValue === 'true' || rawValue === true || rawValue === 1 || rawValue === '1') return true;
    if (rawValue === 'false' || rawValue === false || rawValue === 0 || rawValue === '0') return false;
    throw new Error(`Valor booleano inválido para ${def.key}`);
  }
  if (type === 'number') {
    const n = Number(rawValue);
    if (!Number.isFinite(n)) throw new Error(`Número inválido para ${def.key}`);
    if (def.min != null && n < def.min) throw new Error(`${def.label}: mínimo ${def.min}`);
    if (def.max != null && n > def.max) throw new Error(`${def.label}: máximo ${def.max}`);
    return n;
  }
  if (type === 'enum') {
    const s = String(rawValue);
    if (!def.options?.includes(s)) {
      throw new Error(`Valor enum inválido para ${def.key}`);
    }
    return s;
  }
  return String(rawValue ?? '').trim();
}

async function seedDefaultsIfEmpty() {
  const count = await SystemSetting.countDocuments();
  if (count > 0) return 0;

  const docs = SETTINGS_DEFINITIONS.map((d) => ({
    key: d.key,
    value: d.value,
    type: d.type,
    category: d.category,
    label: d.label,
    description: d.description || '',
    options: d.options || [],
  }));

  await SystemSetting.insertMany(docs);
  return docs.length;
}

async function reloadCache() {
  await seedDefaultsIfEmpty();
  const rows = await SystemSetting.find().lean();
  cache = new Map(rows.map((r) => [r.key, r.value]));
  cacheLoaded = true;
  return cache;
}

async function initSystemSettingsCache() {
  try {
    if (!mongoose.connection || mongoose.connection.readyState !== 1) {
      cache = new Map(SETTINGS_DEFINITIONS.map((d) => [d.key, d.value]));
      cacheLoaded = true;
      return cache;
    }
    return await reloadCache();
  } catch (_) {
    cache = new Map(SETTINGS_DEFINITIONS.map((d) => [d.key, d.value]));
    cacheLoaded = true;
    return cache;
  }
}

function getSetting(key, fallback = undefined) {
  if (cache.has(key)) return cache.get(key);
  const def = DEFINITIONS_BY_KEY[key];
  if (def) return def.value;
  return fallback;
}

function getSettingBoolean(key, fallback = false) {
  const v = getSetting(key, fallback);
  return v === true || v === 'true';
}

function getSettingNumber(key, fallback = 0) {
  const v = getSetting(key, fallback);
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getSettingString(key, fallback = '') {
  const v = getSetting(key, fallback);
  return v == null ? fallback : String(v);
}

function isMaintenanceMode() {
  return getSettingBoolean('general.maintenance_mode', false);
}

function getPublicSettings() {
  return {
    maintenanceMode: isMaintenanceMode(),
    maintenanceMessage: getSettingString('general.maintenance_message'),
    operationalBannerEnabled: getSettingBoolean('general.operational_banner_enabled'),
    operationalBannerMessage: getSettingString('general.operational_banner_message'),
    simulatorEnabled: getSettingBoolean('simulator.enabled', true),
    communityReportsEnabled: getSettingBoolean('community.reports_enabled', true),
  };
}

function buildGroupedSettings() {
  const grouped = {};
  CATEGORIES.forEach((c) => {
    grouped[c.id] = { ...c, items: [] };
  });

  SETTINGS_DEFINITIONS.forEach((def) => {
    const stored = cache.has(def.key) ? cache.get(def.key) : def.value;
    grouped[def.category]?.items.push({
      key: def.key,
      value: stored,
      type: def.type,
      label: def.label,
      description: def.description || '',
      options: def.options || [],
      min: def.min,
      max: def.max,
    });
  });

  return Object.values(grouped);
}

function getServerStatus() {
  const pkg = require('../package.json');
  return {
    status: 'ok',
    hostname: os.hostname(),
    nodeVersion: process.version,
    platform: process.platform,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    appVersion: pkg.version || '1.0.0',
    appName: pkg.name || 'futbol-analytics',
    mongoConnected: mongoose.connection?.readyState === 1,
    deployRef: process.env.RENDER_GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || null,
    timestamp: new Date().toISOString(),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  };
}

function computePreviewDiff(updates) {
  const changes = [];
  for (const { key, value } of updates) {
    const def = DEFINITIONS_BY_KEY[key];
    if (!def) {
      changes.push({ key, error: 'Clave desconocida', valid: false });
      continue;
    }
    try {
      const parsed = validateValue(def, value);
      const current = cache.has(key) ? cache.get(key) : def.value;
      const changed = JSON.stringify(current) !== JSON.stringify(parsed);
      changes.push({
        key,
        label: def.label,
        category: def.category,
        current,
        next: parsed,
        changed,
        valid: true,
      });
    } catch (err) {
      changes.push({ key, label: def.label, error: err.message, valid: false });
    }
  }
  return {
    changes,
    hasChanges: changes.some((c) => c.valid && c.changed),
    hasErrors: changes.some((c) => !c.valid),
  };
}

async function applySettingsUpdates(updates, actor, note = '') {
  const batchId = `batch_${Date.now()}`;
  const applied = [];

  for (const { key, value } of updates) {
    const def = DEFINITIONS_BY_KEY[key];
    if (!def) throw new Error(`Clave desconocida: ${key}`);

    const parsed = validateValue(def, value);
    const existing = await SystemSetting.findOne({ key });
    const previousValue = existing ? existing.value : def.value;

    if (JSON.stringify(previousValue) === JSON.stringify(parsed)) continue;

    await SystemSetting.findOneAndUpdate(
      { key },
      {
        key,
        value: parsed,
        type: def.type,
        category: def.category,
        label: def.label,
        description: def.description || '',
        options: def.options || [],
        updatedBy: actor?.id || null,
      },
      { upsert: true, new: true }
    );

    await SystemSettingRevision.create({
      key,
      previousValue,
      newValue: parsed,
      actorId: actor?.id || null,
      actorEmail: actor?.email || null,
      note: note || '',
      batchId,
    });

    applied.push({ key, previousValue, newValue: parsed });
  }

  await reloadCache();
  return { applied, batchId };
}

async function getRevisionHistory({ key, limit = 30 } = {}) {
  const filter = key ? { key } : {};
  const rows = await SystemSettingRevision.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(100, limit))
    .lean();
  return rows;
}

module.exports = {
  logSettingsAction,
  initSystemSettingsCache,
  reloadCache,
  getSetting,
  getSettingBoolean,
  getSettingNumber,
  getSettingString,
  isMaintenanceMode,
  getPublicSettings,
  buildGroupedSettings,
  getServerStatus,
  computePreviewDiff,
  applySettingsUpdates,
  getRevisionHistory,
  CATEGORIES,
};
