const crypto = require('crypto');

const RESET_TOKEN_BYTES = 32;
const RESET_EXPIRY_MS = 15 * 60 * 1000;

function generateResetToken() {
  return crypto.randomBytes(RESET_TOKEN_BYTES).toString('hex');
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function getResetExpiresAt() {
  return new Date(Date.now() + RESET_EXPIRY_MS);
}

function isResetTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() <= Date.now();
}

function buildResetPasswordUrl(rawToken) {
  const base =
    process.env.PASSWORD_RESET_URL ||
    'https://goal-logic.com/reset-password';
  const normalized = base.replace(/\?.*$/, '').replace(/\/$/, '');
  return `${normalized}?token=${encodeURIComponent(rawToken)}`;
}

module.exports = {
  RESET_EXPIRY_MS,
  generateResetToken,
  hashResetToken,
  getResetExpiresAt,
  isResetTokenExpired,
  buildResetPasswordUrl,
};
