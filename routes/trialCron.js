const express = require('express');
const logger = require('../utils/logger');
const { expireAllDueTrials } = require('../utils/trialService');

const router = express.Router();

/**
 * POST /api/trial/checkExpiration
 * Cron diario — protegido con CRON_SECRET o TRIAL_CRON_SECRET.
 */
router.post('/checkExpiration', async (req, res) => {
  const secret = process.env.TRIAL_CRON_SECRET || process.env.CRON_SECRET;
  const provided = req.headers['x-cron-secret'] || req.body?.secret;

  if (!secret || provided !== secret) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  try {
    const expired = await expireAllDueTrials();
    logger.info('trial_check_expiration_cron', { expired });
    res.json({ success: true, expired });
  } catch (error) {
    logger.error('trial_check_expiration_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al expirar trials' });
  }
});

module.exports = router;
