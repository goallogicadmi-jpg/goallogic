const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { mongoUriHint, stripeApiModeFromEnv } = require('../utils/mongoUriHint');

const ALLOWED_ROLES = ['admin', 'admin_secundario', 'usuario'];

/**
 * Verifica JWT Bearer y adjunta req.user.
 * @param {{ requirePremium?: boolean }} options
 */
async function authenticateRequest(req, res, next, options = {}) {
  const { requirePremium = true } = options;
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticaci?n no proporcionado'
      });
    }

    // Verificar formato "Bearer token"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inv?lido. Use: Bearer <token>'
      });
    }

    const token = parts[1];

    // Verificar JWT_SECRET
    if (!process.env.JWT_SECRET) {
      logger.critical('auth_jwt_secret_missing', { ip: req.ip });
      return res.status(500).json({
        success: false,
        message: 'Error de configuraci?n del servidor'
      });
    }

    // Verificar y decodificar el token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Obtener informaci?n del usuario desde la base de datos para asegurar datos actualizados
    const user = await User.findById(decoded.user_id)
      .select('role isMainAdmin premium tokenVersion email')
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const roleFromDb = user.role || 'usuario';
    if (!ALLOWED_ROLES.includes(roleFromDb)) {
      logger.warn('auth_unknown_role', {
        userId: String(decoded.user_id),
        role: roleFromDb,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: 'Rol de usuario no v?lido. Contacta soporte.',
      });
    }

    const dbTokenVersion = user.tokenVersion ?? 0;
    const tokenTv = decoded.tv !== undefined && decoded.tv !== null ? Number(decoded.tv) : 0;
    if (dbTokenVersion !== tokenTv) {
      logger.warn('auth_jwt_token_revoked', {
        userId: String(decoded.user_id),
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Sesi?n invalidada. Inicia sesi?n de nuevo.',
      });
    }

    const isAdminRole =
      roleFromDb === 'admin' ||
      roleFromDb === 'admin_secundario' ||
      user.isMainAdmin === true;
    const isPremium = user.premium === true;

    if (requirePremium && !isAdminRole && !isPremium) {
      res.locals.forbidReason = 'premium_required';
      const routeKey = `${req.baseUrl || ''}${req.path || ''}`;
      logger.security('auth_premium_required_403', {
        premiumFromDb: isPremium,
        stripeMode: stripeApiModeFromEnv(),
        mongoUriHint: mongoUriHint(),
        path: routeKey,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Debes completar el pago' });
    }

    // Agregar informaci?n del usuario al request (siempre desde BD, no del body)
    req.user = {
      id: decoded.user_id,
      role: roleFromDb,
      isMainAdmin: user.isMainAdmin || false,
      premium: isPremium
    };

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inv?lido'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }

    logger.critical('auth_middleware_error', { message: error.message, ip: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Error al verificar token'
    });
  }
}

/** JWT + suscripci?n premium (rutas de datos costosos). */
const auth = (req, res, next) => authenticateRequest(req, res, next, { requirePremium: true });

/** Solo JWT (checkout Stripe antes de activar premium). */
const authJwt = (req, res, next) => authenticateRequest(req, res, next, { requirePremium: false });

module.exports = auth;
module.exports.authJwt = authJwt;
