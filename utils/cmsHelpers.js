const logger = require('./logger');
const CMSItem = require('../models/CMSItem');

function logCmsAction(action, req, payload = {}) {
  logger.info('admin_cms_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    endpoint: req ? `${req.method} ${req.baseUrl}${req.path}` : null,
    ...payload,
  });
}

function parseDateQuery(value, endOfDay = false) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Publica ítems programados cuya fecha ya pasó.
 */
async function activateDueScheduledItems() {
  const now = new Date();
  const result = await CMSItem.updateMany(
    {
      status: 'scheduled',
      scheduledPublishAt: { $lte: now },
    },
    {
      $set: { status: 'published', publishedAt: now },
    }
  );
  return result.modifiedCount || 0;
}

function getEffectiveStatus(item) {
  if (!item) return 'draft';
  if (item.status === 'scheduled' && item.scheduledPublishAt) {
    if (new Date(item.scheduledPublishAt).getTime() <= Date.now()) {
      return 'published';
    }
    return 'scheduled';
  }
  return item.status;
}

function mapCmsItem(item, { includeBody = true } = {}) {
  const row = item.toObject ? item.toObject() : item;
  const effectiveStatus = getEffectiveStatus(row);
  return {
    id: String(row._id),
    title: row.title,
    excerpt: row.excerpt || '',
    body: includeBody ? row.body : undefined,
    type: row.type,
    status: row.status,
    effectiveStatus,
    scheduledPublishAt: row.scheduledPublishAt || null,
    publishedAt: row.publishedAt || null,
    bannerVariant: row.bannerVariant || 'info',
    priority: row.priority ?? 0,
    dismissible: row.dismissible !== false,
    author: row.author,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function buildPublicQuery(type) {
  const now = new Date();
  return {
    type,
    $or: [
      { status: 'published' },
      {
        status: 'scheduled',
        scheduledPublishAt: { $lte: now },
      },
    ],
  };
}

module.exports = {
  logCmsAction,
  parseDateQuery,
  activateDueScheduledItems,
  getEffectiveStatus,
  mapCmsItem,
  buildPublicQuery,
};
