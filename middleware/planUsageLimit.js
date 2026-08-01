const User = require('../models/User');
const { authJwt } = require('./auth');
const { checkAndIncrementUsage } = require('../utils/trialService');
const { hasFullProAccess } = require('../utils/planAccess');

function createUsageLimiter(type) {
  return async (req, res, next) => {
    try {
      if (!req.userDoc && req.user?.id) {
        req.userDoc = await User.findById(req.user.id).lean();
      }

      const user = req.userDoc;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
      }

      if (hasFullProAccess(user)) {
        return next();
      }

      const result = await checkAndIncrementUsage(user, type);
      if (!result.allowed) {
        return res.status(429).json({
          success: false,
          error: 'daily_limit_reached',
          message: result.message,
          limit: result.limit,
          used: result.used,
        });
      }

      req.usageQuota = result;
      return next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al verificar límites del plan',
      });
    }
  };
}

const predictionsUsageLimiter = [authJwt, createUsageLimiter('predictions')];
const simulationsUsageLimiter = [authJwt, createUsageLimiter('simulations')];

module.exports = {
  createUsageLimiter,
  predictionsUsageLimiter,
  simulationsUsageLimiter,
};
