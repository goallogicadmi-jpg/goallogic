const nodemailer = require('nodemailer');
const logger = require('./logger');
const { buildResetPasswordUrl, RESET_EXPIRY_MS } = require('./passwordReset');

let cachedTransport = null;

function getMailTransport() {
  if (cachedTransport) return cachedTransport;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransport;
}

function getFromAddress() {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  const fromName = process.env.SMTP_FROM_NAME || 'GoalLogic';
  return `"${fromName}" <${fromEmail}>`;
}

/**
 * Envía email de recuperación de contraseña.
 * @param {{ email: string, nombre?: string }} user
 * @param {string} rawToken Token en texto plano (solo para el enlace; no se guarda en BD).
 */
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'goal.logic.admi@gmail.com';

async function sendPasswordResetEmail(user, rawToken) {
  const resetUrl = buildResetPasswordUrl(rawToken);
  const minutes = Math.round(RESET_EXPIRY_MS / 60000);
  const greeting = user.nombre ? `Hola ${user.nombre},` : 'Hola,';

  const subject = 'Recuperación de contraseña — GoalLogic';
  const text = `${greeting}

Recibimos una solicitud para restablecer la contraseña de tu cuenta en GoalLogic.

Enlace (válido ${minutes} minutos):
${resetUrl}

Si no solicitaste este cambio, ignora este correo. Tu contraseña no se modificará.

Si necesitas ayuda adicional, contáctanos en: ${SUPPORT_EMAIL}

— Equipo GoalLogic
`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
  <p>${greeting}</p>
  <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>GoalLogic</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${resetUrl}" style="background:#F28A00;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
      Restablecer contraseña
    </a>
  </p>
  <p style="font-size:14px;color:#555;">Este enlace expira en <strong>${minutes} minutos</strong>.</p>
  <p style="font-size:14px;color:#555;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña permanecerá igual.</p>
  <p style="font-size:14px;color:#555;">Si necesitas ayuda adicional, contáctanos en: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
  <p style="font-size:12px;color:#888;">GoalLogic — plataforma informativa. No somos casa de apuestas.</p>
</body>
</html>`;

  const transport = getMailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      logger.warn('password_reset_email_skipped', {
        reason: 'smtp_not_configured',
        toHint: user.email.replace(/(^.).*(@.*$)/, '$1***$2'),
      });
      logger.info('password_reset_dev_link', { resetUrl });
      // Visible en consola sin depender del nivel de winston
      console.log('[password_reset_dev_link]', resetUrl);
    } else {
      logger.error('password_reset_email_failed', {
        reason: 'smtp_not_configured_production',
      });
      throw new Error('Servicio de correo no configurado');
    }
    return { delivered: false, devMode: true };
  }

  await transport.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject,
    text,
    html,
  });

  logger.info('password_reset_email_sent', {
    toHint: user.email.replace(/(^.).*(@.*$)/, '$1***$2'),
  });

  return { delivered: true };
}

module.exports = { sendPasswordResetEmail, getMailTransport, getFromAddress };
