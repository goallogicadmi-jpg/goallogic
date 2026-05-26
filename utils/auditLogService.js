const fs = require('fs');
const path = require('path');
const Transport = require('winston-transport');
const AuditLog = require('../models/AuditLog');

const logsDir = path.join(__dirname, '..', 'logs');

const EXCLUDE_MESSAGES = new Set([
  'http_access',
  'auth_me_db_read',
  'welcome_email_skipped',
  'welcome_email_sent',
]);

const MODULE_LABELS = {
  webhook: 'Webhook Stripe',
  auth: 'Autenticación',
  premium: 'Premium',
  moderation: 'Moderación',
  admin: 'Administración',
  error: 'Error',
  system: 'Sistema',
};

function categorize(message, level) {
  const msg = String(message || '');
  if (level === 'webhook' || msg.startsWith('stripe_webhook') || msg.startsWith('stripe_checkout')) {
    return 'webhook';
  }
  if (msg.startsWith('auth_')) return 'auth';
  if (
    msg.startsWith('admin_premium') ||
    msg.includes('premium_activated') ||
    msg.includes('premium_deactivated') ||
    msg.startsWith('stripe_webhook_premium')
  ) {
    return 'premium';
  }
  if (msg.startsWith('admin_moderation') || (msg.startsWith('community_') && msg.includes('reported'))) {
    return 'moderation';
  }
  if (msg.startsWith('admin_')) return 'admin';
  if (level === 'error' || level === 'critical') return 'error';
  return 'system';
}

function shouldCapture(info) {
  const msg = info.message || '';
  if (!msg || EXCLUDE_MESSAGES.has(msg)) return false;
  const level = info.level;

  if (level === 'webhook' || level === 'security' || level === 'critical' || level === 'error') {
    return true;
  }

  const prefixes = [
    'stripe_webhook',
    'stripe_checkout',
    'auth_',
    'admin_',
    'community_post_reported',
    'community_comment_reported',
    'mongo_',
    'http_response_5xx',
    'admin_route_denied',
  ];

  return prefixes.some((p) => msg.startsWith(p));
}

function buildPayload(info) {
  const skip = new Set(['message', 'level', 'timestamp', 'module', 'splat', Symbol.for('level')]);
  const payload = {};
  Object.keys(info).forEach((key) => {
    if (skip.has(key) || key.startsWith('Symbol')) return;
    payload[key] = info[key];
  });
  return payload;
}

async function persistFromWinstonInfo(info) {
  if (!shouldCapture(info)) return null;

  const message = info.message;
  const level = info.level;
  const module = categorize(message, level);
  const timestamp = info.timestamp ? new Date(info.timestamp) : new Date();
  const actorId = info.actorId ? String(info.actorId) : info.userId ? String(info.userId) : null;
  const targetUserId = info.targetUserId ? String(info.targetUserId) : null;

  const doc = await AuditLog.create({
    message,
    level,
    module,
    timestamp,
    actorId,
    targetUserId,
    email: info.email || null,
    ip: info.ip || null,
    endpoint: info.endpoint || null,
    payload: buildPayload(info),
  });

  return doc;
}

class AuditLogTransport extends Transport {
  constructor(opts = {}) {
    super(opts);
  }

  log(info, callback) {
    setImmediate(() => this.emit('logged', info));
    persistFromWinstonInfo(info).catch(() => {});
    callback();
  }
}

function parseDateQuery(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

function buildListFilter(query) {
  const {
    module,
    level,
    actorId,
    userId,
    createdFrom,
    createdTo,
    q,
    last24h,
    message,
  } = query;

  const filter = {};

  if (module && module !== 'all') filter.module = module;
  if (level) filter.level = level;
  if (actorId) filter.actorId = String(actorId);
  if (userId) filter.targetUserId = String(userId);
  if (message) filter.message = message;

  if (last24h === 'true' || last24h === '1') {
    filter.timestamp = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  } else {
    const from = parseDateQuery(createdFrom);
    const to = parseDateQuery(createdTo, true);
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = from;
      if (to) filter.timestamp.$lte = to;
    }
  }

  if (q?.trim()) {
    filter.$or = [
      { message: { $regex: q.trim(), $options: 'i' } },
      { email: { $regex: q.trim(), $options: 'i' } },
      { endpoint: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  return filter;
}

async function listAuditLogs(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit, 10) || 50));
  const filter = buildListFilter(query);

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return {
    items: items.map(formatListItem),
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

function formatListItem(row) {
  return {
    id: String(row._id),
    message: row.message,
    level: row.level,
    module: row.module,
    moduleLabel: MODULE_LABELS[row.module] || row.module,
    timestamp: row.timestamp,
    actorId: row.actorId,
    targetUserId: row.targetUserId,
    email: row.email,
    ip: row.ip,
    endpoint: row.endpoint,
    preview: summarizePayload(row),
  };
}

function summarizePayload(row) {
  const p = row.payload || {};
  const parts = [];
  if (p.action) parts.push(p.action);
  if (p.reason) parts.push(p.reason);
  if (p.type) parts.push(p.type);
  if (p.note) parts.push(String(p.note).slice(0, 60));
  if (p.message && p.message !== row.message) parts.push(String(p.message).slice(0, 80));
  return parts.join(' · ') || null;
}

async function getAuditLogById(id) {
  const row = await AuditLog.findById(id).lean();
  if (!row) return null;
  return {
    id: String(row._id),
    message: row.message,
    level: row.level,
    module: row.module,
    moduleLabel: MODULE_LABELS[row.module] || row.module,
    timestamp: row.timestamp,
    actorId: row.actorId,
    targetUserId: row.targetUserId,
    email: row.email,
    ip: row.ip,
    endpoint: row.endpoint,
    payload: row.payload || {},
  };
}

async function getModuleStats() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await AuditLog.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: '$module', count: { $sum: 1 } } },
  ]);
  const byModule = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  return { last24h: byModule, since: since.toISOString() };
}

function escapeCsv(value) {
  const s = value == null ? '' : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exportAuditLogsCsv(query) {
  const filter = buildListFilter(query);
  const limit = Math.min(5000, parseInt(query.limit, 10) || 2000);
  const items = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(limit).lean();

  const headers = [
    'timestamp',
    'module',
    'level',
    'message',
    'actorId',
    'targetUserId',
    'email',
    'ip',
    'endpoint',
    'payload',
  ];

  const lines = [headers.join(',')];
  items.forEach((row) => {
    lines.push(
      [
        new Date(row.timestamp).toISOString(),
        row.module,
        row.level,
        row.message,
        row.actorId,
        row.targetUserId,
        row.email,
        row.ip,
        row.endpoint,
        JSON.stringify(row.payload || {}),
      ]
        .map(escapeCsv)
        .join(',')
    );
  });

  return lines.join('\n');
}

/**
 * Importa líneas JSON recientes desde archivos Winston (bootstrap / histórico local).
 */
async function importRecentWinstonFiles(maxLines = 400) {
  if (!fs.existsSync(logsDir)) return { imported: 0 };

  const files = fs
    .readdirSync(logsDir)
    .filter((f) => f.startsWith('app-') && f.endsWith('.log'))
    .sort()
    .reverse()
    .slice(0, 3);

  const lines = [];
  for (const file of files) {
    if (lines.length >= maxLines) break;
    try {
      const content = fs.readFileSync(path.join(logsDir, file), 'utf8');
      const fileLines = content.trim().split('\n').filter(Boolean);
      lines.push(...fileLines.slice(-maxLines));
    } catch (_) {
      /* ignore */
    }
  }

  let imported = 0;
  const slice = lines.slice(-maxLines);

  for (const line of slice) {
    try {
      const info = JSON.parse(line);
      if (!shouldCapture(info)) continue;
      const ts = info.timestamp ? new Date(info.timestamp) : new Date();
      const exists = await AuditLog.findOne({
        message: info.message,
        timestamp: ts,
        level: info.level,
      })
        .select('_id')
        .lean();
      if (exists) continue;
      await persistFromWinstonInfo(info);
      imported += 1;
    } catch (_) {
      /* skip bad line */
    }
  }

  return { imported };
}

module.exports = {
  AuditLogTransport,
  categorize,
  shouldCapture,
  persistFromWinstonInfo,
  listAuditLogs,
  getAuditLogById,
  getModuleStats,
  exportAuditLogsCsv,
  importRecentWinstonFiles,
  MODULE_LABELS,
};
