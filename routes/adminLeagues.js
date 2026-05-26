const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const LeagueCatalog = require('../models/LeagueCatalog');
const logger = require('../utils/logger');
const { logLeagueAction, parseDateQuery } = require('../utils/leagueAdminHelpers');
const {
  reloadMemoryCatalog,
  docToEntry,
  mapLeagueListItem,
  getLeagueDoc,
} = require('../utils/leagueCatalogStore');
const { forceSyncLeague } = require('../utils/leagueSyncService');

const router = express.Router();

router.get('/', auth, checkAdmin, async (req, res) => {
  try {
    await reloadMemoryCatalog();
    const { domain, active, q, createdFrom, createdTo } = req.query;
    const filter = {};

    if (domain && ['club', 'selection'].includes(domain)) filter.domain = domain;
    if (active === 'true') filter.active = true;
    if (active === 'false') filter.active = false;

    const from = parseDateQuery(createdFrom);
    const to = parseDateQuery(createdTo, true);
    if (from || to) {
      filter.updatedAt = {};
      if (from) filter.updatedAt.$gte = from;
      if (to) filter.updatedAt.$lte = to;
    }

    if (q?.trim()) {
      filter.$or = [
        { name: { $regex: q.trim(), $options: 'i' } },
        { country: { $regex: q.trim(), $options: 'i' } },
        { nameOverride: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 50));

    const [docs, total] = await Promise.all([
      LeagueCatalog.find(filter).sort({ priority: 1, name: 1 }).skip((page - 1) * limit).limit(limit),
      LeagueCatalog.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        items: docs.map((d) => mapLeagueListItem(docToEntry(d))),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    logger.error('admin_leagues_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar ligas' });
  }
});

router.post('/sync-all', auth, checkAdmin, async (req, res) => {
  try {
    const onlyActive = req.body?.onlyActive !== false;
    const filter = onlyActive ? { active: true } : {};
    const leagues = await LeagueCatalog.find(filter).select('leagueId').lean();
    const results = [];

    for (const row of leagues.slice(0, 15)) {
      try {
        const r = await forceSyncLeague(row.leagueId);
        results.push({ leagueId: row.leagueId, ok: true, durationMs: r.durationMs });
      } catch (err) {
        results.push({ leagueId: row.leagueId, ok: false, error: err.message });
      }
    }

    logLeagueAction('sync_all', req, { count: results.length, onlyActive });

    res.json({
      success: true,
      data: { results, processed: results.length, total: leagues.length },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error en sincronización masiva' });
  }
});

router.get('/:leagueId', auth, checkAdmin, async (req, res) => {
  try {
    const doc = await getLeagueDoc(req.params.leagueId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }
    res.json({ success: true, data: docToEntry(doc) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener liga' });
  }
});

router.put('/:leagueId', auth, checkAdmin, async (req, res) => {
  try {
    const doc = await getLeagueDoc(req.params.leagueId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }

    const { nameOverride, logoOverride, country, seasonOverride, priority, active } = req.body || {};

    if (nameOverride !== undefined) doc.nameOverride = nameOverride?.trim() || null;
    if (logoOverride !== undefined) doc.logoOverride = logoOverride?.trim() || null;
    if (country !== undefined) doc.country = String(country).trim();
    if (priority !== undefined) doc.priority = Number(priority) || doc.priority;
    if (seasonOverride !== undefined) {
      doc.seasonOverride = seasonOverride === null || seasonOverride === ''
        ? null
        : Number(seasonOverride);
    }
    if (active !== undefined) doc.active = Boolean(active);

    await doc.save();
    await reloadMemoryCatalog();

    logLeagueAction('update', req, {
      leagueId: doc.leagueId,
      active: doc.active,
      seasonOverride: doc.seasonOverride,
    });

    res.json({ success: true, data: docToEntry(doc) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar liga' });
  }
});

router.post('/:leagueId/toggle-active', auth, checkAdmin, async (req, res) => {
  try {
    const doc = await getLeagueDoc(req.params.leagueId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }

    doc.active = !doc.active;
    await doc.save();
    await reloadMemoryCatalog();

    logLeagueAction('toggle_active', req, {
      leagueId: doc.leagueId,
      active: doc.active,
    });

    res.json({
      success: true,
      data: docToEntry(doc),
      message: doc.active ? 'Liga activada' : 'Liga desactivada',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado' });
  }
});

router.post('/:leagueId/sync', auth, checkAdmin, async (req, res) => {
  try {
    const leagueId = Number(req.params.leagueId);
    const result = await forceSyncLeague(leagueId);
    logLeagueAction('sync', req, { leagueId, durationMs: result.durationMs, seasonUsed: result.seasonUsed });
    res.json({ success: true, data: result });
  } catch (error) {
    logLeagueAction('sync_failed', req, {
      leagueId: req.params.leagueId,
      message: error.message,
    });
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Error al sincronizar',
      data: error.data || null,
    });
  }
});

router.get('/:leagueId/sync-history', auth, checkAdmin, async (req, res) => {
  try {
    const doc = await getLeagueDoc(req.params.leagueId);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Liga no encontrada' });
    }
    const history = [...(doc.syncHistory || [])].reverse();
    res.json({ success: true, data: { items: history } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener historial' });
  }
});

module.exports = router;
