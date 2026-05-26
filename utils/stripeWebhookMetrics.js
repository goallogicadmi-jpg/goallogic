const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '..', 'logs');
const metricsPath = path.join(logsDir, 'stripe-webhook-metrics.json');

const MAX_LATENCY_SAMPLES = 100;
const MAX_ERRORS = 25;

const state = {
  lastEventAt: null,
  lastEventType: null,
  lastEventId: null,
  lastSuccessAt: null,
  lastErrorAt: null,
  lastSignatureErrorAt: null,
  totalProcessed: 0,
  totalErrors: 0,
  latencyMs: [],
  recentErrors: [],
};

function persist() {
  try {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    fs.writeFileSync(
      metricsPath,
      JSON.stringify(
        {
          ...state,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      ),
      'utf8'
    );
  } catch (_) {
    /* ignore */
  }
}

function load() {
  try {
    if (!fs.existsSync(metricsPath)) return;
    const raw = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    Object.assign(state, {
      lastEventAt: raw.lastEventAt ?? null,
      lastEventType: raw.lastEventType ?? null,
      lastEventId: raw.lastEventId ?? null,
      lastSuccessAt: raw.lastSuccessAt ?? null,
      lastErrorAt: raw.lastErrorAt ?? null,
      lastSignatureErrorAt: raw.lastSignatureErrorAt ?? null,
      totalProcessed: raw.totalProcessed ?? 0,
      totalErrors: raw.totalErrors ?? 0,
      latencyMs: Array.isArray(raw.latencyMs) ? raw.latencyMs.slice(-MAX_LATENCY_SAMPLES) : [],
      recentErrors: Array.isArray(raw.recentErrors) ? raw.recentErrors.slice(-MAX_ERRORS) : [],
    });
  } catch (_) {
    /* ignore corrupt file */
  }
}

function avgLatencyMs() {
  if (!state.latencyMs.length) return null;
  const sum = state.latencyMs.reduce((a, b) => a + b, 0);
  return Math.round(sum / state.latencyMs.length);
}

function recordSignatureError(message) {
  const at = new Date().toISOString();
  state.lastSignatureErrorAt = at;
  state.lastErrorAt = at;
  state.totalErrors += 1;
  state.recentErrors.push({
    at,
    type: 'signature_failed',
    message: String(message || '').slice(0, 200),
  });
  if (state.recentErrors.length > MAX_ERRORS) {
    state.recentErrors = state.recentErrors.slice(-MAX_ERRORS);
  }
  persist();
}

function recordEventStart(event) {
  state.lastEventAt = new Date().toISOString();
  state.lastEventType = event?.type || 'unknown';
  state.lastEventId = event?.id || null;
}

function recordEventSuccess(latencyMs) {
  state.lastSuccessAt = new Date().toISOString();
  state.totalProcessed += 1;
  if (typeof latencyMs === 'number' && latencyMs >= 0) {
    state.latencyMs.push(latencyMs);
    if (state.latencyMs.length > MAX_LATENCY_SAMPLES) {
      state.latencyMs = state.latencyMs.slice(-MAX_LATENCY_SAMPLES);
    }
  }
  persist();
}

function recordHandlerError(eventType, message) {
  const at = new Date().toISOString();
  state.lastErrorAt = at;
  state.totalErrors += 1;
  state.recentErrors.push({
    at,
    type: eventType || 'handler_error',
    message: String(message || '').slice(0, 300),
  });
  if (state.recentErrors.length > MAX_ERRORS) {
    state.recentErrors = state.recentErrors.slice(-MAX_ERRORS);
  }
  persist();
}

function getWebhookStatus(secretConfigured) {
  const avg = avgLatencyMs();
  const online =
    secretConfigured &&
    state.lastSuccessAt &&
    Date.now() - new Date(state.lastSuccessAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  return {
    configured: Boolean(secretConfigured),
    status: online ? 'online' : secretConfigured ? 'idle' : 'not_configured',
    lastEventAt: state.lastEventAt,
    lastEventType: state.lastEventType,
    lastEventId: state.lastEventId,
    lastSuccessAt: state.lastSuccessAt,
    lastErrorAt: state.lastErrorAt,
    avgLatencyMs: avg,
    totalProcessed: state.totalProcessed,
    totalErrors: state.totalErrors,
    recentErrors: state.recentErrors.slice().reverse(),
  };
}

load();

module.exports = {
  recordSignatureError,
  recordEventStart,
  recordEventSuccess,
  recordHandlerError,
  getWebhookStatus,
};
