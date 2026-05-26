const Stripe = require('stripe');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const metrics = require('../utils/metrics');
const stripeWebhookMetrics = require('../utils/stripeWebhookMetrics');
const { mongoUriHint, stripeApiModeFromEnv } = require('../utils/mongoUriHint');

const PAYMENT_FAILED_TYPES = new Set([
  'payment_intent.payment_failed',
  'checkout.session.async_payment_failed',
  'invoice.payment_failed',
  'charge.failed',
]);

const HANDLED_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
]);

/** Consola: body + firma. Activar solo en depuración: STRIPE_WEBHOOK_DEBUG=1 */
const STRIPE_WEBHOOK_VERBOSE_LOG = process.env.STRIPE_WEBHOOK_DEBUG === '1';
const STRIPE_WEBHOOK_LOG_MAX = 500000;

function describeRawBody(body) {
  if (body == null) {
    return { kind: 'null', length: 0, rawUtf8: '' };
  }
  if (Buffer.isBuffer(body)) {
    return {
      kind: 'Buffer',
      length: body.length,
      rawUtf8: body.toString('utf8'),
    };
  }
  if (typeof body === 'string') {
    return { kind: 'string', length: body.length, rawUtf8: body };
  }
  try {
    return { kind: typeof body, length: 0, rawUtf8: JSON.stringify(body) };
  } catch {
    return { kind: typeof body, length: 0, rawUtf8: '[unserializable]' };
  }
}

function isValidUserId(id) {
  if (id == null || id === '') return false;
  const s = String(id).trim();
  return mongoose.Types.ObjectId.isValid(s);
}

/**
 * Resuelve el Mongo userId desde sesión, suscripción o factura.
 */
async function resolveUserId(obj) {
  if (!obj || typeof obj !== 'object') return null;

  const meta = obj.metadata && typeof obj.metadata === 'object' ? obj.metadata : {};
  const raw =
    obj.client_reference_id ||
    meta.userId ||
    meta.user_id;

  if (raw != null && isValidUserId(raw)) {
    return String(raw).trim();
  }

  if (typeof obj.customer === 'string' && obj.customer.startsWith('cus_')) {
    const u = await User.findOne({ stripe_customer_id: obj.customer })
      .select('_id')
      .lean();
    if (u?._id) return String(u._id);
  }

  const subId =
    typeof obj.subscription === 'string' && obj.subscription.startsWith('sub_')
      ? obj.subscription
      : typeof obj.id === 'string' && obj.id.startsWith('sub_')
        ? obj.id
        : null;

  if (subId) {
    const u = await User.findOne({ stripe_subscription_id: subId })
      .select('_id')
      .lean();
    if (u?._id) return String(u._id);
  }

  return null;
}

async function setPremiumActive(userId, stripePatch = {}) {
  const user = await User.findById(userId);
  if (!user) {
    console.error(
      `[webhook] setPremiumActive: usuario no existe en BD userId=${String(userId)}, mongoUriHint=${mongoUriHint()}`
    );
    logger.warn('stripe_webhook_user_not_found', { userId: String(userId) });
    return false;
  }

  const set = {
    premium: true,
    updated_at: new Date(),
    ...stripePatch,
  };

  if (!user.premium_since) {
    set.premium_since = new Date();
  }

  await User.updateOne({ _id: userId }, { $set: set });
  const after = await User.findById(userId).select('email premium').lean();
  const mode = stripeApiModeFromEnv();
  const premiumOk = after?.premium === true;
  console.log(
    `[webhook] Activando premium — userId=${String(userId)}, email=${after?.email ?? '(sin email)'}, isPremium(premium)=${premiumOk}, stripeMode=${mode}, mongoUriHint=${mongoUriHint()}`
  );
  logger.log('webhook', 'stripe_webhook_premium_activated_user', {
    userId: String(userId),
    email: after?.email,
    premium: premiumOk,
    stripeMode: mode,
    mongoUriHint: mongoUriHint(),
  });
  return true;
}

async function setPremiumInactive(userId) {
  if (!isValidUserId(userId)) return false;
  await User.updateOne(
    { _id: userId },
    {
      $set: { premium: false, updated_at: new Date() },
      $unset: { stripe_subscription_id: '' },
    }
  );
  const after = await User.findById(userId).select('email premium').lean();
  console.log(
    `[webhook] Desactivando premium — userId=${String(userId)}, email=${after?.email ?? '(sin email)'}, isPremium(premium)=${after?.premium === true}, stripeMode=${stripeApiModeFromEnv()}, mongoUriHint=${mongoUriHint()}`
  );
  logger.log('webhook', 'stripe_webhook_premium_deactivated_user', {
    userId: String(userId),
    email: after?.email,
    premium: after?.premium === true,
    stripeMode: stripeApiModeFromEnv(),
  });
  return true;
}

function subscriptionShouldBePremium(sub) {
  const status = sub?.status;
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return true;
  }
  return false;
}

/** Estados finales: no tocar `incomplete`/`paused` aquí para no pisar una activación recién hecha por checkout. */
function subscriptionShouldDeactivatePremium(sub) {
  const s = sub?.status;
  return s === 'canceled' || s === 'unpaid' || s === 'incomplete_expired';
}

/**
 * POST /api/payments/webhook
 * Requiere body raw (express.raw) para verificar la firma de Stripe.
 */
async function stripeWebhook(req, res) {
  const handlerStarted = Date.now();
  console.log('WEBHOOK_HANDLER_START');
  const isProd = process.env.NODE_ENV === 'production';
  const whSecret =
    process.env.STRIPE_WEBHOOK_SECRET ||
    (!isProd
      ? 'whsec_smoke_local_placeholder_signature_verification_only'
      : null);

  if (!whSecret) {
    logger.critical('stripe_webhook_missing_secret', { ip: req.ip });
    metrics.incWebhookEvents();
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    logger.critical('stripe_webhook_missing_api_key', { ip: req.ip });
    metrics.incWebhookEvents();
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sigHeader = req.headers['stripe-signature'];
  const bodyDesc = describeRawBody(req.body);
  const { kind, length, rawUtf8 } = bodyDesc;

  if (!Buffer.isBuffer(req.body)) {
    console.error(
      '[stripe-webhook] req.body no es Buffer (express.raw no aplicó). kind=%s length=%s',
      kind,
      length
    );
    logger.security('stripe_webhook_body_not_buffer', {
      bodyKind: kind,
      bodyLength: length,
      ip: req.ip,
    });
  }

  if (STRIPE_WEBHOOK_VERBOSE_LOG) {
    console.log('[stripe-webhook] req.headers["stripe-signature"]:', sigHeader ?? '(ausente)');
    console.log(
      '[stripe-webhook] body RAW (UTF-8, antes de constructEvent), bytes=%s:',
      length
    );
    const out =
      rawUtf8.length > STRIPE_WEBHOOK_LOG_MAX
        ? `${rawUtf8.slice(0, STRIPE_WEBHOOK_LOG_MAX)}\n...<truncado a ${STRIPE_WEBHOOK_LOG_MAX} caracteres>`
        : rawUtf8;
    console.log(out);
  }

  logger.log('webhook', 'stripe_webhook_ingress', {
    hasSignature: Boolean(sigHeader),
    stripeSignatureHeader: sigHeader || null,
    bodyKind: kind,
    bodyByteLength: length,
    bodyRawUtf8:
      rawUtf8.length > 20000 ? `${rawUtf8.slice(0, 20000)}...<truncado logger>` : rawUtf8,
    webhookSecretIsWhsec:
      typeof whSecret === 'string' && whSecret.startsWith('whsec_'),
    ip: req.ip,
  });

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sigHeader, whSecret);
  } catch (err) {
    metrics.incWebhookEvents();
    console.error('[stripe-webhook] constructEvent falló:', err.message);
    console.error(err.stack);
    console.error('[stripe-webhook] stripe-signature:', sigHeader ?? '(ausente)');
    console.error('[stripe-webhook] body kind=%s length=%s', kind, length);
    console.error(
      '[stripe-webhook] body RAW UTF-8 (en error):',
      rawUtf8.length > STRIPE_WEBHOOK_LOG_MAX
        ? `${rawUtf8.slice(0, STRIPE_WEBHOOK_LOG_MAX)}\n...<truncado>`
        : rawUtf8
    );
    logger.security('stripe_webhook_signature_failed', {
      message: err.message,
      stack: err.stack,
      stripeSignatureHeader: sigHeader || null,
      bodyKind: kind,
      bodyByteLength: length,
      bodyRawUtf8:
        rawUtf8.length > 20000 ? `${rawUtf8.slice(0, 20000)}...<truncado>` : rawUtf8,
      ip: req.ip,
    });
    stripeWebhookMetrics.recordSignatureError(err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  metrics.incWebhookEvents();
  stripeWebhookMetrics.recordEventStart(event);
  console.log(`Evento recibido: ${event.type}`);

  if (PAYMENT_FAILED_TYPES.has(event.type)) {
    const obj = event.data.object || {};
    const userId = await resolveUserId(obj);
    logger.log('webhook', 'stripe_payment_failed', {
      type: event.type,
      userId: userId || undefined,
      sessionId: obj.id,
      paymentIntent: obj.payment_intent,
      amount: obj.amount,
      currency: obj.currency,
      ip: req.ip,
    });
    return res.json({ received: true, handled: 'payment_failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const paidOk =
          session.payment_status === 'paid' ||
          session.payment_status === 'no_payment_required';

        if (!paidOk) {
          logger.log('webhook', 'stripe_checkout_completed_skip_status', {
            sessionId: session.id,
            payment_status: session.payment_status,
          });
          break;
        }

        const userId = await resolveUserId(session);
        if (!userId) {
          console.warn(
            `[webhook] checkout.session.completed sin usuario resuelto sessionId=${session.id}, client_reference_id=${session.client_reference_id ?? '(vacío)'}, metadata=${JSON.stringify(session.metadata || {})}`
          );
          logger.warn('stripe_checkout_completed_no_user', {
            sessionId: session.id,
            client_reference_id: session.client_reference_id,
            metadata: session.metadata,
          });
          break;
        }

        console.log(
          `[webhook] checkout.session.completed → userId resuelto=${userId}, client_reference_id=${session.client_reference_id ?? '(n/a)'}, stripeMode=${stripeApiModeFromEnv()}, mongoUriHint=${mongoUriHint()}`
        );
        const stripePatch = {};
        if (typeof session.customer === 'string' && session.customer.startsWith('cus_')) {
          stripePatch.stripe_customer_id = session.customer;
        }
        if (
          typeof session.subscription === 'string' &&
          session.subscription.startsWith('sub_')
        ) {
          stripePatch.stripe_subscription_id = session.subscription;
        }

        await setPremiumActive(userId, stripePatch);
        logger.log('webhook', 'stripe_premium_activated_checkout', {
          userId,
          sessionId: session.id,
          mode: session.mode,
        });
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object;
        const userId = await resolveUserId(sub);
        if (!userId) {
          logger.warn('stripe_subscription_created_no_user', {
            subscriptionId: sub.id,
          });
          break;
        }
        const stripePatch = {
          stripe_subscription_id: sub.id,
        };
        if (typeof sub.customer === 'string' && sub.customer.startsWith('cus_')) {
          stripePatch.stripe_customer_id = sub.customer;
        }
        if (subscriptionShouldBePremium(sub)) {
          await setPremiumActive(userId, stripePatch);
        }
        logger.log('webhook', 'stripe_subscription_created', {
          userId,
          subscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = await resolveUserId(sub);
        if (!userId) {
          logger.warn('stripe_subscription_updated_no_user', {
            subscriptionId: sub.id,
          });
          break;
        }
        const stripePatch = {
          stripe_subscription_id: sub.id,
        };
        if (typeof sub.customer === 'string' && sub.customer.startsWith('cus_')) {
          stripePatch.stripe_customer_id = sub.customer;
        }
        if (subscriptionShouldBePremium(sub)) {
          await setPremiumActive(userId, stripePatch);
        } else if (subscriptionShouldDeactivatePremium(sub)) {
          await setPremiumInactive(userId);
        }
        logger.log('webhook', 'stripe_subscription_updated', {
          userId,
          subscriptionId: sub.id,
          status: sub.status,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = await resolveUserId(sub);
        if (!userId) {
          logger.warn('stripe_subscription_deleted_no_user', {
            subscriptionId: sub.id,
          });
          break;
        }
        await setPremiumInactive(userId);
        logger.log('webhook', 'stripe_subscription_deleted', {
          userId,
          subscriptionId: sub.id,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_create' && invoice.amount_paid === 0) {
          // evitar doble log ruidoso; checkout.session.completed ya activó
        }
        const userId = await resolveUserId(invoice);
        if (!userId) {
          logger.warn('stripe_invoice_succeeded_no_user', { invoiceId: invoice.id });
          break;
        }
        const stripePatch = {};
        if (typeof invoice.customer === 'string' && invoice.customer.startsWith('cus_')) {
          stripePatch.stripe_customer_id = invoice.customer;
        }
        if (
          typeof invoice.subscription === 'string' &&
          invoice.subscription.startsWith('sub_')
        ) {
          stripePatch.stripe_subscription_id = invoice.subscription;
        }
        await setPremiumActive(userId, stripePatch);
        logger.log('webhook', 'stripe_invoice_payment_succeeded', {
          userId,
          invoiceId: invoice.id,
        });
        break;
      }

      default:
        if (!HANDLED_TYPES.has(event.type)) {
          logger.log('webhook', 'stripe_webhook_ignored_event', { type: event.type });
        }
    }
  } catch (e) {
    stripeWebhookMetrics.recordHandlerError(event.type, e.message);
    logger.critical('stripe_webhook_handler_error', {
      type: event.type,
      message: e.message,
      stack: e.stack,
    });
    return res.status(500).json({ error: 'Webhook handler error' });
  }

  stripeWebhookMetrics.recordEventSuccess(Date.now() - handlerStarted);
  return res.json({ received: true });
}

module.exports = stripeWebhook;
