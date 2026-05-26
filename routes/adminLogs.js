const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const logger = require('../utils/logger');
const {
  listAuditLogs,
  getAuditLogById,
  getModuleStats,
  exportAuditLogsCsv,
  importRecentWinstonFiles,
} = require('../utils/auditLogService');

const router = express.Router();

/**
 * GET /api/admin/logs
 * Listado paginado con filtros.
 */
router.get('/', auth, checkAdmin, async (req, res) => {
  try {
    const data = await listAuditLogs(req.query);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('admin_logs_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar logs' });
  }
});

/**
 * GET /api/admin/logs/stats
 * Contadores por módulo (últimas 24h).
 */
router.get('/stats', auth, checkAdmin, async (req, res) => {
  try {
    const stats = await getModuleStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

/**
 * GET /api/admin/logs/export
 * Export CSV.
 */
router.get('/export', auth, checkAdmin, async (req, res) => {
  try {
    const csv = await exportAuditLogsCsv(req.query);
    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`\uFEFF${csv}`);
    logger.info('admin_logs_exported', {
      actorId: String(req.user.id),
      ip: req.ip,
      filters: req.query,
    });
  } catch (error) {
    logger.error('admin_logs_export_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al exportar logs' });
  }
});

/**
 * POST /api/admin/logs/import-winston
 * Importa líneas recientes desde archivos app-*.log (solo admin).
 */
router.post('/import-winston', auth, checkAdmin, async (req, res) => {
  try {
    const result = await importRecentWinstonFiles(
      Math.min(2000, parseInt(req.body?.maxLines, 10) || 500)
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al importar logs' });
  }
});

/**
 * GET /api/admin/logs/:id
 */
router.get('/:id', auth, checkAdmin, async (req, res) => {
  try {
    const item = await getAuditLogById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Log no encontrado' });
    }
    res.json({ success: true, data: item });
  } catch (error) {
    logger.error('admin_logs_detail_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener detalle' });
  }
});

module.exports = router;
