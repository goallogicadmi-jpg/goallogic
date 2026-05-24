const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
const metricsPath = path.join(logsDir, 'metrics.json');

const WINDOW_MS = 60 * 1000;
const requestTimestamps = [];

let http500 = 0;
let premium403 = 0;
let loginFailed = 0;
let webhookEvents = 0;

let flushTimer;

function pruneRequests() {
  const cutoff = Date.now() - WINDOW_MS;
  while (requestTimestamps.length && requestTimestamps[0] < cutoff) {
    requestTimestamps.shift();
  }
}

function recordRequest() {
  requestTimestamps.push(Date.now());
  pruneRequests();
}

function requestsLastMinute() {
  pruneRequests();
  return requestTimestamps.length;
}

function incHttp500() {
  http500 += 1;
}

function incPremium403() {
  premium403 += 1;
}

function incLoginFailed() {
  loginFailed += 1;
}

function incWebhookEvents() {
  webhookEvents += 1;
}

function snapshot() {
  pruneRequests();
  return {
    updatedAt: new Date().toISOString(),
    requestsLastMinute: requestTimestamps.length,
    http500,
    premium403,
    loginFailed,
    webhookEvents,
  };
}

function persistSync() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(metricsPath, JSON.stringify(snapshot(), null, 2), 'utf8');
  } catch (_) {
    /* evitar crash por permisos */
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setInterval(persistSync, 30 * 1000);
  if (typeof flushTimer.unref === 'function') flushTimer.unref();
}

function onResponseFinished(statusCode, locals) {
  recordRequest();
  if (statusCode >= 500) incHttp500();
  if (statusCode === 403 && locals?.forbidReason === 'premium_required') {
    incPremium403();
  }
}

scheduleFlush();
['SIGINT', 'SIGTERM', 'beforeExit'].forEach((ev) => {
  process.on(ev, () => persistSync());
});

module.exports = {
  recordRequest,
  requestsLastMinute,
  incHttp500,
  incPremium403,
  incLoginFailed,
  incWebhookEvents,
  snapshot,
  persistSync,
  onResponseFinished,
};
