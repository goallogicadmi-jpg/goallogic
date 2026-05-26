const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');

const router = express.Router();

/** Módulos del Admin Panel PRO y estado de implementación. */
const MODULES = [
  { id: 'users', status: 'active', apiPrefix: '/api/admin' },
  { id: 'stripe', status: 'active', apiPrefix: '/api/admin/stripe' },
  { id: 'cms', status: 'active', apiPrefix: '/api/admin/cms' },
  { id: 'leagues', status: 'active', apiPrefix: '/api/admin/leagues' },
  { id: 'moderation', status: 'active', apiPrefix: '/api/admin/moderation' },
  { id: 'logs', status: 'active', apiPrefix: '/api/admin/logs' },
  { id: 'coupons', status: 'active', apiPrefix: '/api/admin/coupons' },
  { id: 'settings', status: 'active', apiPrefix: '/api/admin/settings' },
];

/**
 * GET /api/admin/pro/modules
 * Metadatos de módulos para el panel (esqueleto).
 */
router.get('/modules', auth, checkAdmin, (req, res) => {
  res.json({
    success: true,
    modules: MODULES,
    version: 'pro-v1-skeleton',
  });
});

/**
 * Placeholder: cada sub-ruta devuelve 501 hasta implementar.
 */
function notImplemented(moduleId) {
  return (req, res) => {
    res.status(501).json({
      success: false,
      message: `Módulo "${moduleId}" en desarrollo`,
      code: 'ADMIN_PRO_NOT_IMPLEMENTED',
    });
  };
}

router.get('/logs', auth, checkAdmin, notImplemented('logs'));

module.exports = router;
