const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const checkMainAdmin = require('../middleware/checkMainAdmin');
const MessageCampaign = require('../models/MessageCampaign');
const MessageTemplate = require('../models/MessageTemplate');
const Message = require('../models/Message');
const logger = require('../utils/logger');
const {
  logMessageAction,
  normalizeSegment,
  seedDefaultTemplatesIfEmpty,
  countSegmentUsers,
  previewMessageContent,
  executeCampaign,
  refreshCampaignStats,
  mapCampaignListItem,
  mapTemplate,
  parseDateQuery,
  TEMPLATE_VARIABLES,
} = require('../utils/messageAdminHelpers');

const router = express.Router();

router.use(auth, checkMainAdmin);

router.get('/templates', async (req, res) => {
  try {
    await seedDefaultTemplatesIfEmpty();
    const rows = await MessageTemplate.find().sort({ name: 1 }).lean();
    res.json({
      success: true,
      data: { items: rows.map(mapTemplate), variables: TEMPLATE_VARIABLES },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar plantillas' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, titulo, contenido, description } = req.body;
    if (!name?.trim() || !titulo?.trim() || !contenido?.trim()) {
      return res.status(400).json({ success: false, message: 'Nombre, título y cuerpo requeridos' });
    }
    const row = await MessageTemplate.create({
      name: name.trim(),
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      description: (description || '').trim(),
      variables: TEMPLATE_VARIABLES,
      createdBy: req.user.id,
    });
    logMessageAction('template_create', req, { templateId: String(row._id) });
    res.status(201).json({ success: true, data: mapTemplate(row) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const row = await MessageTemplate.findById(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });

    if (req.body.name != null) row.name = String(req.body.name).trim();
    if (req.body.titulo != null) row.titulo = String(req.body.titulo).trim();
    if (req.body.contenido != null) row.contenido = String(req.body.contenido).trim();
    if (req.body.description != null) row.description = String(req.body.description).trim();
    row.updatedBy = req.user.id;
    await row.save();

    logMessageAction('template_update', req, { templateId: String(row._id) });
    res.json({ success: true, data: mapTemplate(row) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const row = await MessageTemplate.findByIdAndDelete(req.params.id);
    if (!row) return res.status(404).json({ success: false, message: 'Plantilla no encontrada' });
    logMessageAction('template_delete', req, { templateId: String(row._id) });
    res.json({ success: true, message: 'Plantilla eliminada' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/segment/preview', async (req, res) => {
  try {
    const segment = normalizeSegment(req.body?.segment || {});
    const count = await countSegmentUsers(segment);
    res.json({
      success: true,
      data: { count, segment },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { titulo, contenido, userId } = req.body;
    if (!titulo?.trim() || !contenido?.trim()) {
      return res.status(400).json({ success: false, message: 'Título y contenido requeridos' });
    }
    const preview = await previewMessageContent({
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      userId,
    });
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/campaigns', async (req, res) => {
  try {
    const filter = { adminId: req.user.id };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      filter.titulo = new RegExp(escapeRegex(String(req.query.q).trim()), 'i');
    }
    const from = parseDateQuery(req.query.from);
    const to = parseDateQuery(req.query.to, true);
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }

    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const rows = await MessageCampaign.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: {
        items: rows.map(mapCampaignListItem),
        total: rows.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al listar campañas' });
  }
});

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/campaigns/:id', async (req, res) => {
  try {
    const row = await MessageCampaign.findOne({
      _id: req.params.id,
      adminId: req.user.id,
    }).lean();
    if (!row) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    await refreshCampaignStats(row._id);
    const updated = await MessageCampaign.findById(row._id).lean();

    const recentMessages = await Message.find({ campaign_id: row._id })
      .populate('user_id', 'nombre email')
      .sort({ created_at: -1 })
      .limit(20)
      .lean();

    res.json({
      success: true,
      data: {
        campaign: mapCampaignListItem(updated),
        errorLog: updated.errorLog || [],
        recentMessages,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar campaña' });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const {
      titulo,
      contenido,
      segment,
      sendMode,
      scheduledAt,
      templateId,
      batchSize,
      note,
    } = req.body;

    if (!titulo?.trim() || !contenido?.trim()) {
      return res.status(400).json({ success: false, message: 'Título y contenido requeridos' });
    }

    const seg = normalizeSegment(segment || {});
    const targetCount = await countSegmentUsers(seg);
    if (targetCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'El segmento no tiene destinatarios',
      });
    }

    const mode = sendMode === 'scheduled' ? 'scheduled' : 'now';
    let sched = scheduledAt ? new Date(scheduledAt) : null;
    if (mode === 'scheduled') {
      if (!sched || Number.isNaN(sched.getTime())) {
        return res.status(400).json({ success: false, message: 'Fecha programada inválida' });
      }
      if (sched.getTime() <= Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'La fecha debe ser futura (o usa enviar ahora)',
        });
      }
    } else {
      sched = null;
    }

    const segmentDoc = {
      ...seg,
      userIds: seg.userIds
        .filter(Boolean)
        .map((id) => new mongoose.Types.ObjectId(id)),
    };

    const campaign = await MessageCampaign.create({
      adminId: req.user.id,
      templateId: templateId || null,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      segment: segmentDoc,
      sendMode: mode,
      scheduledAt: sched,
      status: mode === 'scheduled' ? 'scheduled' : 'pending',
      batchSize: Math.min(200, Math.max(10, parseInt(batchSize, 10) || 50)),
      stats: { targetCount, delivered: 0, opened: 0, errorCount: 0 },
      note: (note || '').trim().slice(0, 300),
    });

    logMessageAction('campaign_create', req, {
      campaignId: String(campaign._id),
      sendMode: mode,
      targetCount,
    });

    if (mode === 'now') {
      setImmediate(async () => {
        try {
          await executeCampaign(campaign._id);
          logMessageAction('campaign_sent', req, { campaignId: String(campaign._id) });
        } catch (err) {
          logger.error('campaign_send_async_error', {
            campaignId: String(campaign._id),
            message: err.message,
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      data: mapCampaignListItem(campaign),
      message:
        mode === 'scheduled'
          ? `Campaña programada (${targetCount} destinatarios)`
          : `Campaña en envío (${targetCount} destinatarios)`,
    });
  } catch (error) {
    logMessageAction('campaign_create_failed', req, { message: error.message });
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post('/campaigns/:id/cancel', async (req, res) => {
  try {
    const row = await MessageCampaign.findOne({
      _id: req.params.id,
      adminId: req.user.id,
    });
    if (!row) return res.status(404).json({ success: false, message: 'Campaña no encontrada' });

    if (!['scheduled', 'pending'].includes(row.status)) {
      return res.status(400).json({
        success: false,
        message: 'Solo se pueden cancelar campañas pendientes o programadas',
      });
    }

    row.status = 'cancelled';
    row.completedAt = new Date();
    await row.save();

    logMessageAction('campaign_cancel', req, { campaignId: String(row._id) });
    res.json({ success: true, data: mapCampaignListItem(row) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const adminId = req.user.id;
    const filter = { admin_id: adminId };
    if (req.query.campaignId) filter.campaign_id = req.query.campaignId;
    if (req.query.leido === 'true') filter.leido = true;
    if (req.query.leido === 'false') filter.leido = false;
    if (req.query.q) {
      filter.$or = [
        { titulo: new RegExp(escapeRegex(req.query.q.trim()), 'i') },
        { contenido: new RegExp(escapeRegex(req.query.q.trim()), 'i') },
      ];
    }
    const from = parseDateQuery(req.query.from);
    const to = parseDateQuery(req.query.to, true);
    if (from || to) {
      filter.created_at = {};
      if (from) filter.created_at.$gte = from;
      if (to) filter.created_at.$lte = to;
    }

    const limit = Math.min(200, parseInt(req.query.limit, 10) || 50);
    const messages = await Message.find(filter)
      .populate('user_id', 'nombre email')
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    const [total, read, unread] = await Promise.all([
      Message.countDocuments({ admin_id: adminId }),
      Message.countDocuments({ admin_id: adminId, leido: true }),
      Message.countDocuments({ admin_id: adminId, leido: false }),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        stats: { total, read, unread },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar historial' });
  }
});

module.exports = router;
