/**
 * Middleware para verificar si el usuario es administrador
 * Solo permite acceso a usuarios con rol "admin" o "admin_secundario"
 */
const logger = require('../utils/logger');

const checkAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Debes iniciar sesión.'
    });
  }

  const userRole = req.user.role;

  if (!userRole || (userRole !== 'admin' && userRole !== 'admin_secundario')) {
    logger.warn('admin_route_denied', {
      userId: req.user.id,
      role: userRole,
      path: `${req.baseUrl}${req.path}`,
      ip: req.ip,
    });
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Solo los administradores pueden realizar esta acción.'
    });
  }

  next();
};

module.exports = checkAdmin;
