const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { processDueScheduledCampaigns } = require('../utils/messageAdminHelpers');

const WORKER_INTERVAL_MS = 60 * 1000;

let workerTimer = null;
let isRunning = false;

async function runWorker() {
  if (isRunning) return;
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;

  isRunning = true;
  try {
    const n = await processDueScheduledCampaigns();
    if (n > 0) {
      logger.info('message_campaign_worker_run', { processed: n });
    }
  } catch (err) {
    logger.error('message_campaign_worker_fatal', { message: err.message });
  } finally {
    isRunning = false;
  }
}

function startMessageCampaignWorker() {
  if (workerTimer) return;
  runWorker();
  workerTimer = setInterval(runWorker, WORKER_INTERVAL_MS);
  logger.info('message_campaign_worker_started', { intervalMs: WORKER_INTERVAL_MS });
}

function stopMessageCampaignWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

module.exports = {
  startMessageCampaignWorker,
  stopMessageCampaignWorker,
  runWorker,
};
