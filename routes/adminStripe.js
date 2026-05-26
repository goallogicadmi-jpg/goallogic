const express = require('express');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const { getStripeAnalytics } = require('../utils/stripeAdminAnalytics');
const stripeWebhookMetrics = require('../utils/stripeWebhookMetrics');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/admin/stripe/analytics
 * Dashboard Stripe LIVE: métricas, gráficas, pagos y estado webhook.
 */
router.get('/analytics', auth, checkAdmin, async (req, res) => {
  try {
    const analytics = await getStripeAnalytics();
    const webhook = stripeWebhookMetrics.getWebhookStatus(
      Boolean(process.env.STRIPE_WEBHOOK_SECRET)
    );

    res.json({
      success: true,
      data: {
        ...analytics,
        webhook,
      },
    });
  } catch (error) {
    logger.error('admin_stripe_analytics_error', {
      message: error.message,
      type: error.type,
      code: error.code,
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Error al obtener analytics de Stripe',
      code: error.code || 'STRIPE_ANALYTICS_ERROR',
    });
  }
});

module.exports = router;
