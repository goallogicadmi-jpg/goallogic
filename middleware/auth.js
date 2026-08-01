const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const { mongoUriHint, stripeApiModeFromEnv } = require('../utils/mongoUriHint');
const { hasFullProAccess, resolveEffectivePlan } = require('../utils/planAccess');
const { expireTrialIfNeeded } = require('../utils/trialService');

const ALLOWED_ROLES = ['admin', 'admin_secundario', 'usuario', 'analista'];

const USER_AUTH_SELECT =
  'role isMainAdmin premium tokenVersion email tipo plan billingLocked trialActive trialEndsAt trialExpiredAcknowledged welcomeShown';

/**
 * Verifica JWT Bearer y adjunta req.user.
 * @param {{ requirePremium?: boolean }} options — requirePremium permite acceso free con límites (no 403 por pago).
 */
async function authenticateRequest(req, res, next, options = {}) {
  const { requirePremium = true } = options;
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación no proporcionado',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Formato de token inválido. Use: Bearer <token>',
      });
    }

    const token = parts[1];

    if (!process.env.JWT_SECRET) {
      logger.critical('auth_jwt_secret_missing', { ip: req.ip });
      return res.status(500).json({
        success: false,
        message: 'Error de configuración del servidor',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user = await User.findById(decoded.user_id).select(USER_AUTH_SELECT).lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    user = await expireTrialIfNeeded(user);

    const roleFromDb = user.role || 'usuario';
    if (!ALLOWED_ROLES.includes(roleFromDb)) {
      logger.warn('auth_unknown_role', {
        userId: String(decoded.user_id),
        role: roleFromDb,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: 'Rol de usuario no válido. Contacta soporte.',
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
        message: 'Sesión invalidada. Inicia sesión de nuevo.',
      });
    }

    const isAdminRole =
      roleFromDb === 'admin' ||
      roleFromDb === 'admin_secundario' ||
      user.isMainAdmin === true;

    const isAnalystRole = roleFromDb === 'analista';

    const proAccess = hasFullProAccess(user);
    const effectivePlan = resolveEffectivePlan(user);

    if (requirePremium && !isAdminRole && !isAnalystRole && !proAccess && effectivePlan !== 'free') {
      res.locals.forbidReason = 'premium_required';
      const routeKey = `${req.baseUrl || ''}${req.path || ''}`;
      logger.security('auth_premium_required_403', {
        plan: effectivePlan,
        stripeMode: stripeApiModeFromEnv(),
        mongoUriHint: mongoUriHint(),
        path: routeKey,
        ip: req.ip,
      });
      return res.status(403).json({ error: 'Debes completar el pago' });
    }

    req.user = {
      id: decoded.user_id,
      role: roleFromDb,
      isMainAdmin: user.isMainAdmin || false,
      premium: user.premium === true,
      plan: effectivePlan,
      trialActive: user.trialActive === true,
      trialEndsAt: user.trialEndsAt || null,
      hasProAccess: proAccess || isAdminRole || isAnalystRole,
    };
    req.userDoc = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
    }

    logger.critical('auth_middleware_error', { message: error.message, ip: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Error al verificar token',
    });
  }
}

/** JWT + acceso a features premium (trial, pro, familia o plan free con límites). */
const auth = (req, res, next) => authenticateRequest(req, res, next, { requirePremium: true });

/** Solo JWT (checkout, perfil, plan). */
const authJwt = (req, res, next) => authenticateRequest(req, res, next, { requirePremium: false });

module.exports = auth;
module.exports.authJwt = authJwt;
module.exports.authenticateRequest = authenticateRequest;
