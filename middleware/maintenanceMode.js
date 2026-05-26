const { isMaintenanceMode, getSettingString } = require('../utils/systemSettingsService');

/**
 * Bloquea rutas públicas si modo mantenimiento (admin y health exentos).
 */
function maintenanceModeGuard(req, res, next) {
  if (!isMaintenanceMode()) return next();

  const path = req.path || '';
  if (
    path.startsWith('/api/admin') ||
    path === '/api/health' ||
    path.startsWith('/api/auth/login') ||
    path === '/api/settings/public'
  ) {
    return next();
  }

  return res.status(503).json({
    success: false,
    maintenance: true,
    message: getSettingString(
      'general.maintenance_message',
      'Plataforma en mantenimiento.'
    ),
  });
}

module.exports = maintenanceModeGuard;
