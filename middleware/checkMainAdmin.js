const User = require('../models/User');

/**
 * Solo administrador principal (role admin + isMainAdmin).
 */
async function checkMainAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const user = await User.findById(req.user.id).select('role isMainAdmin');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.role !== 'admin' || !user.isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador principal puede realizar esta acción.',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al verificar permisos' });
  }
}

module.exports = checkMainAdmin;
