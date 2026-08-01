const express = require('express');
const User = require('../models/User');
const { authJwt } = require('../middleware/auth');
const logger = require('../utils/logger');
const { serializePlanStatus } = require('../utils/planAccess');
const { expireTrialIfNeeded, getDailyUsageSummary, checkAndIncrementUsage } = require('../utils/trialService');

const router = express.Router();

async function loadFreshUser(userId) {
  let user = await User.findById(userId).lean();
  if (!user) return null;
  return expireTrialIfNeeded(user);
}

/**
 * GET /api/user/trialStatus
 */
router.get('/trialStatus', authJwt, async (req, res) => {
  try {
    const user = await loadFreshUser(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const status = serializePlanStatus(user);
    const usage = await getDailyUsageSummary(user._id, user);

    res.json({
      success: true,
      data: {
        ...status,
        dailyUsage: usage,
      },
    });
  } catch (error) {
    logger.error('user_trial_status_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener estado del trial' });
  }
});

/**
 * GET /api/user/plan
 */
router.get('/plan', authJwt, async (req, res) => {
  try {
    const user = await loadFreshUser(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const status = serializePlanStatus(user);
    const usage = await getDailyUsageSummary(user._id, user);

    res.json({
      success: true,
      data: {
        ...status,
        dailyUsage: usage,
      },
    });
  } catch (error) {
    logger.error('user_plan_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener plan' });
  }
});

/**
 * POST /api/user/usage/consume
 * Verifica e incrementa uso diario (predicciones o simulaciones).
 */
router.post('/usage/consume', authJwt, async (req, res) => {
  try {
    const { type } = req.body || {};
    if (!['predictions', 'simulations'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de uso inválido',
      });
    }

    const user = await loadFreshUser(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
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

    const usage = await getDailyUsageSummary(user._id, user);

    res.json({
      success: true,
      data: {
        type,
        quota: result,
        dailyUsage: usage,
      },
    });
  } catch (error) {
    logger.error('user_usage_consume_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al registrar uso del plan' });
  }
});

/**
 * POST /api/user/upgrade — inicia checkout Stripe (sin tarjeta en trial).
 */
router.post('/upgrade', authJwt, async (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      message: 'Redirige al checkout de Stripe',
      checkoutEndpoint: `${baseUrl}/api/payments/create-checkout-session`,
      method: 'POST',
      requiresAuth: true,
    });
  } catch (error) {
    logger.error('user_upgrade_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al iniciar upgrade' });
  }
});

/**
 * POST /api/user/trial-expired-acknowledge
 */
router.post('/trial-expired-acknowledge', authJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    user.trialExpiredAcknowledged = true;
    await user.save();

    res.json({ success: true, trialExpiredAcknowledged: true });
  } catch (error) {
    logger.error('trial_expired_ack_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al registrar confirmación' });
  }
});

module.exports = router;
