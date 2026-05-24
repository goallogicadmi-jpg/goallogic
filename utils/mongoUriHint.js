/**
 * Fragmento de MONGO_URI sin credenciales (solo diagnóstico: mismo cluster/DB).
 */
function mongoUriHint() {
  const raw = process.env.MONGO_URI || '';
  if (!raw) return '(MONGO_URI vacía)';
  return raw.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

function stripeApiModeFromEnv() {
  const sk = process.env.STRIPE_SECRET_KEY || '';
  if (sk.startsWith('sk_test_')) return 'test';
  if (sk.startsWith('sk_live_')) return 'live';
  return 'unknown';
}

module.exports = { mongoUriHint, stripeApiModeFromEnv };
