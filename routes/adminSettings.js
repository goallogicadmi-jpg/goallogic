const express = require('express');
const auth = require('../middleware/auth');
const checkMainAdmin = require('../middleware/checkMainAdmin');
const logger = require('../utils/logger');
const {
  logSettingsAction,
  buildGroupedSettings,
  getServerStatus,
  computePreviewDiff,
  applySettingsUpdates,
  getRevisionHistory,
  reloadCache,
} = require('../utils/systemSettingsService');

const router = express.Router();

router.use(auth, checkMainAdmin);

router.get('/', async (req, res) => {
  try {
    await reloadCache();
    res.json({
      success: true,
      data: {
        categories: buildGroupedSettings(),
        server: getServerStatus(),
      },
    });
  } catch (error) {
    logger.error('admin_settings_get_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al cargar configuración' });
  }
});

router.get('/status', async (req, res) => {
  try {
    res.json({ success: true, data: getServerStatus() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estado' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const items = await getRevisionHistory({
      key: req.query.key,
      limit: parseInt(req.query.limit, 10) || 30,
    });
    res.json({ success: true, data: { items } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cargar historial' });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const updates = req.body?.settings || [];
    const preview = computePreviewDiff(updates);
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = req.body?.settings || [];
    const note = req.body?.note || '';

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Sin cambios para guardar' });
    }

    const preview = computePreviewDiff(updates);
    if (preview.hasErrors) {
      return res.status(400).json({
        success: false,
        message: 'Hay valores inválidos',
        data: preview,
      });
    }

    const actor = { id: req.user.id, email: req.user.email };
    const result = await applySettingsUpdates(updates, actor, note);

    logSettingsAction('update', req, {
      batchId: result.batchId,
      keys: result.applied.map((a) => a.key),
      count: result.applied.length,
    });

    res.json({
      success: true,
      data: {
        applied: result.applied,
        batchId: result.batchId,
        categories: buildGroupedSettings(),
      },
    });
  } catch (error) {
    logSettingsAction('update_failed', req, { message: error.message });
    res.status(400).json({ success: false, message: error.message || 'Error al guardar' });
  }
});

module.exports = router;
