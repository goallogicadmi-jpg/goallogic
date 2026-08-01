const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { expireAllDueTrials } = require('../utils/trialService');

const WORKER_INTERVAL_MS = 60 * 60 * 1000; // cada hora (cron diario efectivo)

let workerTimer = null;
let isRunning = false;

async function runWorker() {
  if (isRunning) return;
  if (!mongoose.connection || mongoose.connection.readyState !== 1) return;

  isRunning = true;
  try {
    const n = await expireAllDueTrials();
    if (n > 0) {
      logger.info('trial_expiration_worker_run', { expired: n });
    }
  } catch (err) {
    logger.error('trial_expiration_worker_fatal', { message: err.message });
  } finally {
    isRunning = false;
  }
}

function startTrialExpirationWorker() {
  if (workerTimer) return;
  runWorker();
  workerTimer = setInterval(runWorker, WORKER_INTERVAL_MS);
  logger.info('trial_expiration_worker_started', { intervalMs: WORKER_INTERVAL_MS });
}

function stopTrialExpirationWorker() {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

module.exports = {
  startTrialExpirationWorker,
  stopTrialExpirationWorker,
  runWorker,
};
