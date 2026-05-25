const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');

const router = express.Router();

/** Módulos del Admin Panel PRO y estado de implementación. */
const MODULES = [
  { id: 'users', status: 'partial', apiPrefix: '/api/admin' },
  { id: 'stripe', status: 'planned', apiPrefix: '/api/admin/pro/stripe' },
  { id: 'cms', status: 'planned', apiPrefix: '/api/admin/pro/cms' },
  { id: 'leagues', status: 'planned', apiPrefix: '/api/admin/pro/leagues' },
  { id: 'moderation', status: 'partial', apiPrefix: '/api/community' },
  { id: 'logs', status: 'planned', apiPrefix: '/api/admin/pro/logs' },
  { id: 'coupons', status: 'planned', apiPrefix: '/api/admin/pro/coupons' },
  { id: 'settings', status: 'planned', apiPrefix: '/api/admin/pro/settings' },
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

router.get('/stripe/overview', auth, checkAdmin, notImplemented('stripe'));
router.get('/cms/items', auth, checkAdmin, notImplemented('cms'));
router.get('/leagues/catalog', auth, checkAdmin, notImplemented('leagues'));
router.get('/logs', auth, checkAdmin, notImplemented('logs'));
router.get('/coupons', auth, checkAdmin, notImplemented('coupons'));
router.get('/settings', auth, checkAdmin, notImplemented('settings'));

module.exports = router;
