const logger = require('./logger');
const { getMailTransport, getFromAddress } = require('./sendPasswordResetEmail');

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'goal.logic.admi@gmail.com';

const SUBJECT = 'Bienvenido a GoalLogic — Tu nueva plataforma de análisis deportivo';

function buildWelcomeBodies(user) {
  const greeting = user.nombre ? `¡Bienvenido a GoalLogic, ${user.nombre}!` : '¡Bienvenido a GoalLogic!';

  const text = `${greeting}

Gracias por unirte a nuestra plataforma. Desde ahora tendrás acceso a análisis avanzados, estadísticas detalladas, predicciones basadas en modelos y herramientas diseñadas para ayudarte a entender mejor el rendimiento de tus equipos favoritos.

🔍 ¿Qué puedes hacer dentro de GoalLogic?
- Explorar estadísticas completas de clubes y selecciones
- Ver predicciones basadas en modelos estadísticos
- Analizar partidos, tendencias y rendimiento
- Acceder a contenido exclusivo si eres usuario premium

⚠️ Recordatorio importante
GoalLogic es una plataforma informativa y educativa.
No somos una casa de apuestas y no garantizamos resultados.
Las decisiones que tomes basadas en la información presentada son completamente responsabilidad tuya.

🤝 ¿Necesitas ayuda?
Si tienes dudas o necesitas soporte, puedes escribirnos a:
${SUPPORT_EMAIL}

Gracias por confiar en GoalLogic.
El equipo de GoalLogic ⚽
`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.65; color: #222; max-width: 560px;">
  <h1 style="color: #F28A00; font-size: 22px; margin: 0 0 16px;">${greeting}</h1>
  <p>Gracias por unirte a nuestra plataforma. Desde ahora tendrás acceso a análisis avanzados, estadísticas detalladas, predicciones basadas en modelos y herramientas diseñadas para ayudarte a entender mejor el rendimiento de tus equipos favoritos.</p>

  <h2 style="font-size: 16px; margin: 24px 0 8px;">🔍 ¿Qué puedes hacer dentro de GoalLogic?</h2>
  <ul style="padding-left: 20px; color: #444;">
    <li>Explorar estadísticas completas de clubes y selecciones</li>
    <li>Ver predicciones basadas en modelos estadísticos</li>
    <li>Analizar partidos, tendencias y rendimiento</li>
    <li>Acceder a contenido exclusivo si eres usuario premium</li>
  </ul>

  <h2 style="font-size: 16px; margin: 24px 0 8px;">⚠️ Recordatorio importante</h2>
  <p style="font-size: 14px; color: #555;">
    GoalLogic es una plataforma informativa y educativa.<br>
    No somos una casa de apuestas y no garantizamos resultados.<br>
    Las decisiones que tomes basadas en la información presentada son completamente responsabilidad tuya.
  </p>

  <h2 style="font-size: 16px; margin: 24px 0 8px;">🤝 ¿Necesitas ayuda?</h2>
  <p style="font-size: 14px; color: #555;">
    Si tienes dudas o necesitas soporte, puedes escribirnos a:<br>
    <a href="mailto:${SUPPORT_EMAIL}" style="color: #F28A00;">${SUPPORT_EMAIL}</a>
  </p>

  <p style="margin-top: 28px;">Gracias por confiar en GoalLogic.<br><strong>El equipo de GoalLogic ⚽</strong></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
  <p style="font-size: 12px; color: #888;">GoalLogic — plataforma informativa. No somos casa de apuestas.</p>
</body>
</html>`;

  return { text, html };
}

/**
 * Envía email de bienvenida tras el registro.
 * @param {{ email: string, nombre?: string }} user
 */
async function sendWelcomeEmail(user) {
  if (!user?.email) {
    logger.warn('welcome_email_skipped', { reason: 'missing_email' });
    return { delivered: false };
  }

  const { text, html } = buildWelcomeBodies(user);
  const transport = getMailTransport();

  if (!transport) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[welcome_email_dev_notice] Email de bienvenida omitido (modo dev)');
      logger.info('welcome_email_skipped', {
        reason: 'smtp_not_configured',
        toHint: user.email.replace(/(^.).*(@.*$)/, '$1***$2'),
      });
    } else {
      logger.warn('welcome_email_skipped', {
        reason: 'smtp_not_configured_production',
        toHint: user.email.replace(/(^.).*(@.*$)/, '$1***$2'),
      });
    }
    return { delivered: false, devMode: true };
  }

  await transport.sendMail({
    from: getFromAddress(),
    to: user.email,
    subject: SUBJECT,
    text,
    html,
  });

  logger.info('welcome_email_sent', {
    toHint: user.email.replace(/(^.).*(@.*$)/, '$1***$2'),
  });

  return { delivered: true };
}

module.exports = { sendWelcomeEmail };
