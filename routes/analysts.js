const express = require('express');
const Stripe = require('stripe');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const User = require('../models/User');
const AnalystSubscription = require('../models/AnalystSubscription');
const CommunityPost = require('../models/CommunityPost');
const Bet = require('../models/Bet');
const { authJwt } = require('../middleware/auth');
const logger = require('../utils/logger');
const { getAnalystBetStats, isSportsAnalyst } = require('../utils/analystStats');
const { notDeletedFilter } = require('../utils/moderationHelpers');
const {
  forbidAnalystViewingOtherAnalyst,
  assertAnalystSelf,
} = require('../utils/analystPrivacy');
const {
  listAnalystSubscribersPublic,
  sendAnalystMessages,
} = require('../utils/analystMessaging');

const router = express.Router();

function getStripeClient() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  return new Stripe(key);
}

function normalizeCheckoutRedirectUrl(url) {
  const trimmed = (typeof url === 'string' ? url : '').trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

function withCheckoutSessionPlaceholder(url) {
  const normalized = normalizeCheckoutRedirectUrl(url);
  if (!normalized) return url;
  if (normalized.includes('{CHECKOUT_SESSION_ID}')) return normalized;
  const sep = normalized.includes('?') ? '&' : '?';
  return `${normalized}${sep}session_id={CHECKOUT_SESSION_ID}`;
}

async function loadAnalystOr404(analystId) {
  if (!mongoose.Types.ObjectId.isValid(analystId)) return null;
  const user = await User.findById(analystId)
    .select(
      'nombre apellido pais foto_perfil_url role analystVerifiedAt analystStripePriceId analystSubscriptionPriceCents analystStatus analystPostsBlocked analystMessagesBlocked created_at publicId'
    )
    .lean();
  if (!user || !isSportsAnalyst(user)) return null;
  if (user.analystStatus === 'suspended') return null;
  return user;
}

async function isSubscribedToAnalyst(subscriberId, analystId) {
  if (!subscriberId) return false;
  const row = await AnalystSubscription.findOne({
    subscriberId,
    analystId,
    status: { $in: ['active', 'trialing', 'past_due'] },
  }).lean();
  return Boolean(row);
}

async function countAnalystSubscribers(analystId) {
  return AnalystSubscription.countDocuments({
    analystId,
    status: { $in: ['active', 'trialing', 'past_due'] },
  });
}

function mapAnalystPublic(user, stats, subscriberCount) {
  return {
    id: user._id,
    publicId: user.publicId || null,
    nombre: user.nombre,
    apellido: user.apellido || '',
    pais: user.pais || null,
    foto_perfil_url: user.foto_perfil_url || null,
    verified: true,
    verifiedAt: user.analystVerifiedAt || null,
    subscriptionPriceCents: user.analystSubscriptionPriceCents ?? null,
    hasStripePrice: Boolean(user.analystStripePriceId),
    stats: {
      currentStreak: stats.currentStreak,
      winRate: stats.winRate,
      roi: stats.roi,
      totalGanadas: stats.totalGanadas,
      totalPerdidas: stats.totalPerdidas,
      totalApuestas: stats.totalApuestas,
    },
    historySummary: stats.historySummary,
    subscriberCount,
  };
}

const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados envíos. Intenta en un minuto.' },
});

const subscribeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta en un minuto.' },
});

router.get('/', authJwt, async (req, res) => {
  try {
    const analysts = await User.find({ role: 'analista' })
      .select(
        'nombre apellido pais foto_perfil_url analystVerifiedAt analystSubscriptionPriceCents analystStripePriceId'
      )
      .sort({ nombre: 1 })
      .lean();

    const enriched = await Promise.all(
      analysts.map(async (analyst) => {
        const stats = await getAnalystBetStats(analyst._id);
        const subscriberCount = await countAnalystSubscribers(analyst._id);
        return mapAnalystPublic(analyst, stats, subscriberCount);
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    logger.error('analysts_list_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al listar analistas' });
  }
});

router.get('/:id', authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const stats = await getAnalystBetStats(analyst._id);
    const subscriberCount = await countAnalystSubscribers(analyst._id);
    const subscribed =
      req.user?.id && String(req.user.id) === String(analyst._id)
        ? true
        : await isSubscribedToAnalyst(req.user?.id, analyst._id);

    const posts = await CommunityPost.find({ user: analyst._id, ...notDeletedFilter() })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('publicationType matchInfo text probability createdAt reactionsCount imagen_url')
      .lean();

    res.json({
      success: true,
      data: {
        ...mapAnalystPublic(analyst, stats, subscriberCount),
        subscribed,
        isSelf: req.user?.id && String(req.user.id) === String(analyst._id),
        posts,
      },
    });
  } catch (err) {
    logger.error('analyst_profile_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al cargar perfil del analista' });
  }
});

router.get('/:id/subscription-status', authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const subscribed = await isSubscribedToAnalyst(req.user.id, analyst._id);
    res.json({ success: true, subscribed });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error al verificar suscripción' });
  }
});

router.get('/:id/history', authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    if (forbidAnalystViewingOtherAnalyst(req, res, analyst._id)) return;

    const isSelf = String(req.user.id) === String(analyst._id);
    const subscribed = isSelf || (await isSubscribedToAnalyst(req.user.id, analyst._id));

    if (!subscribed) {
      return res.status(403).json({
        success: false,
        code: 'subscription_required',
        message: 'Suscríbete al analista para ver su historial completo.',
      });
    }

    const stats = await getAnalystBetStats(analyst._id);
    const bets = await Bet.find({ user_id: String(analyst._id) })
      .sort({ created_at: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        stats,
        bets,
        performanceTimeline: stats.performanceTimeline,
      },
    });
  } catch (err) {
    logger.error('analyst_history_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al cargar historial' });
  }
});

router.get('/:id/subscribers', authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    if (!(await assertAnalystSelf(req, res, analyst._id))) return;

    const subscribers = await listAnalystSubscribersPublic(analyst._id);

    res.json({ success: true, data: subscribers });
  } catch (err) {
    logger.error('analyst_subscribers_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al cargar suscriptores' });
  }
});

router.post('/:id/messages/send', messageSendLimiter, authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    if (!(await assertAnalystSelf(req, res, analyst._id))) return;

    const analystUser = await User.findById(analyst._id).select('analystMessagesBlocked analystStatus').lean();
    if (analystUser?.analystMessagesBlocked || analystUser?.analystStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'El envío de mensajes está bloqueado para este analista.',
      });
    }

    const { title, content, subscriberIds, subscriberPublicIds } = req.body || {};

    const result = await sendAnalystMessages(analyst._id, {
      title,
      content,
      subscriberIds: Array.isArray(subscriberIds) ? subscriberIds : undefined,
      subscriberPublicIds: Array.isArray(subscriberPublicIds) ? subscriberPublicIds : undefined,
    });

    logger.info('analyst_messages_sent', {
      analystId: String(analyst._id),
      sentCount: result.sentCount,
    });

    res.status(201).json({
      success: true,
      message: `Mensaje enviado a ${result.sentCount} suscriptor(es).`,
      data: { sentCount: result.sentCount },
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        code: err.code || 'send_error',
        message: err.message,
      });
    }
    logger.error('analyst_messages_send_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al enviar mensajes' });
  }
});

router.post('/:id/subscribe', subscribeLimiter, authJwt, async (req, res) => {
  try {
    const analyst = await loadAnalystOr404(req.params.id);
    if (!analyst) {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    if (String(req.user.id) === String(analyst._id)) {
      return res.status(400).json({ success: false, message: 'No puedes suscribirte a ti mismo' });
    }

    const already = await isSubscribedToAnalyst(req.user.id, analyst._id);
    if (already) {
      return res.status(400).json({ success: false, message: 'Ya estás suscrito a este analista' });
    }

    const priceId = (analyst.analystStripePriceId || '').trim();
    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: 'Este analista aún no tiene precio de suscripción configurado.',
      });
    }

    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe no configurado' });
    }

    const successUrl = normalizeCheckoutRedirectUrl(process.env.STRIPE_SUCCESS_URL);
    const cancelUrl = normalizeCheckoutRedirectUrl(process.env.STRIPE_CANCEL_URL);
    if (!successUrl || !cancelUrl) {
      return res.status(500).json({ success: false, message: 'URLs de checkout no configuradas' });
    }

    const price = await stripe.prices.retrieve(priceId);
    const mode = price.recurring ? 'subscription' : 'payment';
    const subscriberId = String(req.user.id);
    const analystId = String(analyst._id);

    const sessionParams = {
      mode,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: subscriberId,
      success_url: withCheckoutSessionPlaceholder(successUrl),
      cancel_url: cancelUrl,
      metadata: {
        checkoutType: 'analyst_subscription',
        userId: subscriberId,
        analystId,
      },
    };

    if (mode === 'subscription') {
      sessionParams.subscription_data = {
        metadata: {
          checkoutType: 'analyst_subscription',
          userId: subscriberId,
          analystId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logger.info('analyst_subscribe_checkout_created', {
      subscriberId,
      analystId,
      sessionId: session.id,
    });

    res.json({ success: true, url: session.url });
  } catch (err) {
    logger.error('analyst_subscribe_checkout_error', { message: err.message });
    res.status(500).json({ success: false, message: 'Error al iniciar suscripción' });
  }
});

module.exports = router;
