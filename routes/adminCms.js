const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const CMSItem = require('../models/CMSItem');
const { CMS_TYPES, CMS_STATUSES, BANNER_VARIANTS } = require('../models/CMSItem');
const logger = require('../utils/logger');
const {
  logCmsAction,
  parseDateQuery,
  activateDueScheduledItems,
  mapCmsItem,
} = require('../utils/cmsHelpers');

const router = express.Router();

function buildListFilter(query) {
  const { type, status, createdFrom, createdTo, q } = query;
  const filter = {};
  if (type && CMS_TYPES.includes(type)) filter.type = type;
  if (status && CMS_STATUSES.includes(status)) filter.status = status;
  const from = parseDateQuery(createdFrom);
  const to = parseDateQuery(createdTo, true);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  if (q?.trim()) {
    filter.$or = [
      { title: { $regex: q.trim(), $options: 'i' } },
      { body: { $regex: q.trim(), $options: 'i' } },
      { excerpt: { $regex: q.trim(), $options: 'i' } },
    ];
  }
  return filter;
}

function validatePayload(body, isUpdate = false) {
  const errors = [];
  const { title, body: content, type, status, scheduledPublishAt, bannerVariant, priority, dismissible, excerpt } =
    body || {};

  if (!isUpdate || title !== undefined) {
    if (!title?.trim()) errors.push('El título es obligatorio');
  }
  if (!isUpdate || content !== undefined) {
    if (!content?.trim()) errors.push('El contenido es obligatorio');
  }
  if (!isUpdate || type !== undefined) {
    if (!CMS_TYPES.includes(type)) errors.push('Tipo inválido');
  }
  if (status !== undefined && status && !CMS_STATUSES.includes(status)) {
    errors.push('Estado inválido');
  }
  if (bannerVariant !== undefined && bannerVariant && !BANNER_VARIANTS.includes(bannerVariant)) {
    errors.push('Variante de banner inválida');
  }

  return { errors, fields: { title, content, type, status, scheduledPublishAt, bannerVariant, priority, dismissible, excerpt } };
}

router.get('/items', auth, checkAdmin, async (req, res) => {
  try {
    await activateDueScheduledItems();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 40));
    const filter = buildListFilter(req.query);

    const [items, total] = await Promise.all([
      CMSItem.find(filter)
        .populate('author', 'nombre email')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CMSItem.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: items.map((i) => mapCmsItem(i)),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error('admin_cms_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar contenido CMS' });
  }
});

router.get('/items/:id', auth, checkAdmin, async (req, res) => {
  try {
    const item = await CMSItem.findById(req.params.id).populate('author', 'nombre email');
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }
    res.json({ success: true, data: mapCmsItem(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener ítem' });
  }
});

router.post('/items', auth, checkAdmin, async (req, res) => {
  try {
    const { errors, fields } = validatePayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join('. ') });
    }

    let status = fields.status || 'draft';
    let scheduledPublishAt = fields.scheduledPublishAt
      ? new Date(fields.scheduledPublishAt)
      : null;
    let publishedAt = null;

    if (status === 'scheduled') {
      if (!scheduledPublishAt || Number.isNaN(scheduledPublishAt.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Fecha de publicación programada obligatoria',
        });
      }
      if (scheduledPublishAt.getTime() <= Date.now()) {
        status = 'published';
        publishedAt = new Date();
        scheduledPublishAt = null;
      }
    } else if (status === 'published') {
      publishedAt = new Date();
      scheduledPublishAt = null;
    }

    const item = await CMSItem.create({
      title: fields.title.trim(),
      body: fields.content.trim(),
      excerpt: fields.excerpt?.trim() || fields.content.trim().slice(0, 200),
      type: fields.type,
      status,
      scheduledPublishAt,
      publishedAt,
      author: req.user.id,
      bannerVariant: fields.bannerVariant || 'info',
      priority: Number(fields.priority) || 0,
      dismissible: fields.dismissible !== false,
    });

    await item.populate('author', 'nombre email');
    logCmsAction('create', req, { itemId: String(item._id), type: item.type, status: item.status });

    res.status(201).json({ success: true, data: mapCmsItem(item) });
  } catch (error) {
    logger.error('admin_cms_create_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al crear ítem' });
  }
});

router.put('/items/:id', auth, checkAdmin, async (req, res) => {
  try {
    const item = await CMSItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    const { errors, fields } = validatePayload(req.body, true);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors.join('. ') });
    }

    if (fields.title !== undefined) item.title = fields.title.trim();
    if (fields.content !== undefined) {
      item.body = fields.content.trim();
      if (!fields.excerpt) item.excerpt = fields.content.trim().slice(0, 200);
    }
    if (fields.excerpt !== undefined) item.excerpt = fields.excerpt.trim();
    if (fields.type !== undefined) item.type = fields.type;
    if (fields.bannerVariant !== undefined) item.bannerVariant = fields.bannerVariant;
    if (fields.priority !== undefined) item.priority = Number(fields.priority) || 0;
    if (fields.dismissible !== undefined) item.dismissible = fields.dismissible !== false;

    if (fields.status !== undefined) {
      if (fields.status === 'scheduled') {
        const sched = fields.scheduledPublishAt
          ? new Date(fields.scheduledPublishAt)
          : item.scheduledPublishAt;
        if (!sched || Number.isNaN(sched.getTime())) {
          return res.status(400).json({ success: false, message: 'Fecha programada obligatoria' });
        }
        if (sched.getTime() <= Date.now()) {
          item.status = 'published';
          item.publishedAt = new Date();
          item.scheduledPublishAt = null;
        } else {
          item.status = 'scheduled';
          item.scheduledPublishAt = sched;
          item.publishedAt = null;
        }
      } else if (fields.status === 'published') {
        item.status = 'published';
        item.publishedAt = item.publishedAt || new Date();
        item.scheduledPublishAt = null;
      } else {
        item.status = fields.status;
        if (fields.status === 'draft' || fields.status === 'archived') {
          item.scheduledPublishAt = fields.scheduledPublishAt
            ? new Date(fields.scheduledPublishAt)
            : item.scheduledPublishAt;
        }
      }
    } else if (fields.scheduledPublishAt !== undefined && item.status === 'scheduled') {
      item.scheduledPublishAt = new Date(fields.scheduledPublishAt);
    }

    await item.save();
    await item.populate('author', 'nombre email');
    logCmsAction('update', req, { itemId: String(item._id), status: item.status });

    res.json({ success: true, data: mapCmsItem(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar ítem' });
  }
});

router.delete('/items/:id', auth, checkAdmin, async (req, res) => {
  try {
    const item = await CMSItem.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }
    logCmsAction('delete', req, { itemId: String(item._id), type: item.type });
    res.json({ success: true, message: 'Ítem eliminado', id: String(item._id) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar ítem' });
  }
});

router.post('/items/:id/publish', auth, checkAdmin, async (req, res) => {
  try {
    const item = await CMSItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    const scheduleAt = req.body?.scheduledPublishAt
      ? new Date(req.body.scheduledPublishAt)
      : null;

    if (scheduleAt && !Number.isNaN(scheduleAt.getTime()) && scheduleAt.getTime() > Date.now()) {
      item.status = 'scheduled';
      item.scheduledPublishAt = scheduleAt;
      item.publishedAt = null;
    } else {
      item.status = 'published';
      item.publishedAt = new Date();
      item.scheduledPublishAt = null;
    }

    await item.save();
    logCmsAction('publish', req, {
      itemId: String(item._id),
      status: item.status,
      scheduledPublishAt: item.scheduledPublishAt,
    });

    res.json({ success: true, data: mapCmsItem(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al publicar' });
  }
});

router.post('/items/:id/unpublish', auth, checkAdmin, async (req, res) => {
  try {
    const item = await CMSItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ítem no encontrado' });
    }

    item.status = req.body?.archive === true ? 'archived' : 'draft';
    item.scheduledPublishAt = null;
    await item.save();

    logCmsAction('unpublish', req, { itemId: String(item._id), status: item.status });

    res.json({ success: true, data: mapCmsItem(item) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al despublicar' });
  }
});

module.exports = router;
