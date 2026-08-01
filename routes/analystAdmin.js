const express = require('express');
const Stripe = require('stripe');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const checkMainAdmin = require('../middleware/checkMainAdmin');
const User = require('../models/User');
const AnalystSubscription = require('../models/AnalystSubscription');
const AnalystMessage = require('../models/AnalystMessage');
const AnalystVerification = require('../models/AnalystVerification');
const AnalystAuditLog = require('../models/AnalystAuditLog');
const logger = require('../utils/logger');
const { logAnalystAudit } = require('../utils/analystAudit');
const {
  ACTIVE_SUB_STATUSES,
  getAnalystDashboard,
  mapAnalystAdminRow,
  getAnalystAdminDetail,
} = require('../utils/analystAdminService');
const { deactivateAnalystSubscriptionByStripeId } = require('../utils/analystSubscriptionService');
const { createAnalystAccount } = require('../utils/analystCreateService');
const {
  getAnalystRanking,
  previewCommunityRankingPost,
  publishCommunityRankingPost,
  RANKING_CATEGORIES,
} = require('../utils/analystRankingService');

const router = express.Router();

router.use(auth, checkAdmin);

function getStripeClient() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) return null;
  return new Stripe(key);
}

function stripeDashboardBase() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  return key.startsWith('sk_live_') ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';
}

function loadAnalystOr404(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return User.findById(id);
}

router.get('/analysts/dashboard', async (req, res) => {
  try {
    const data = await getAnalystDashboard();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/ranking', async (req, res) => {
  try {
    const category = req.query.category || 'roi';
    if (!RANKING_CATEGORIES[category]) {
      return res.status(400).json({ success: false, message: 'Categoría de ranking inválida' });
    }
    const data = await getAnalystRanking(category);
    res.json({
      success: true,
      data: {
        ...data,
        categories: Object.entries(RANKING_CATEGORIES).map(([id, meta]) => ({
          id,
          label: meta.label,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/ranking/preview', async (req, res) => {
  try {
    const category = req.query.category || 'roi';
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 10);
    if (!RANKING_CATEGORIES[category]) {
      return res.status(400).json({ success: false, message: 'Categoría inválida' });
    }
    const data = await previewCommunityRankingPost(category, limit);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/ranking/publish', async (req, res) => {
  try {
    const category = req.body?.category || 'roi';
    const limit = Math.min(parseInt(req.body?.limit, 10) || 10, 10);
    if (!RANKING_CATEGORIES[category]) {
      return res.status(400).json({ success: false, message: 'Categoría inválida' });
    }

    const result = await publishCommunityRankingPost({
      category,
      limit,
      actorId: req.user.id,
    });

    await logAnalystAudit({
      action: 'ranking_published_community',
      actorId: req.user.id,
      details: {
        category,
        postId: String(result.postId),
        topCount: result.preview.topCount,
      },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Ranking publicado en la comunidad',
      data: {
        postId: result.postId,
        text: result.preview.text,
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Error al publicar ranking',
    });
  }
});

router.get('/analysts/audit', checkMainAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 300);
    const logs = await AnalystAuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actorId', 'nombre email')
      .populate('analystId', 'nombre publicId')
      .lean();
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/verifications', async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const filter = status === 'all' ? {} : { status };
    const rows = await AnalystVerification.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'nombre apellido email publicId foto_perfil_url role analystStatus')
      .populate('reviewedBy', 'nombre email')
      .lean();
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/verifications/:id', async (req, res) => {
  try {
    const row = await AnalystVerification.findById(req.params.id)
      .populate('userId', 'nombre apellido email publicId foto_perfil_url')
      .populate('reviewedBy', 'nombre email')
      .populate('history.actorId', 'nombre email')
      .lean();
    if (!row) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/verifications/:id/approve', async (req, res) => {
  try {
    const verification = await AnalystVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (verification.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada' });
    }

    const user = await User.findById(verification.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    verification.status = 'approved';
    verification.reviewedBy = req.user.id;
    verification.reviewedAt = new Date();
    verification.history.push({
      action: 'approved',
      actorId: req.user.id,
      note: (req.body?.note || '').trim(),
    });
    await verification.save();

    user.role = 'analista';
    user.analystStatus = 'active';
    user.analystVerifiedAt = new Date();
    await user.save();

    await logAnalystAudit({
      action: 'verification_approved',
      analystId: user._id,
      actorId: req.user.id,
      targetUserId: user._id,
      details: { verificationId: String(verification._id) },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Analista verificado y activado' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/verifications/:id/reject', async (req, res) => {
  try {
    const verification = await AnalystVerification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    if (verification.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'La solicitud ya fue procesada' });
    }

    verification.status = 'rejected';
    verification.reviewedBy = req.user.id;
    verification.reviewedAt = new Date();
    verification.history.push({
      action: 'rejected',
      actorId: req.user.id,
      note: (req.body?.note || req.body?.reason || '').trim(),
    });
    await verification.save();

    const user = await User.findById(verification.userId);
    if (user) {
      if (user.role !== 'analista') user.analystStatus = 'rejected';
      await user.save();
    }

    await logAnalystAudit({
      action: 'verification_rejected',
      analystId: user?._id,
      actorId: req.user.id,
      targetUserId: verification.userId,
      details: { verificationId: String(verification._id) },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Solicitud rechazada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/verifications', async (req, res) => {
  try {
    const { userId, documents, notes } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'userId requerido' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const verification = await AnalystVerification.create({
      userId,
      status: 'pending',
      documents: Array.isArray(documents) ? documents : [],
      notes: (notes || '').trim(),
      history: [{ action: 'submitted', actorId: req.user.id, note: 'Registro admin' }],
    });

    user.analystStatus = 'pending';
    await user.save();

    await logAnalystAudit({
      action: 'verification_submitted',
      analystId: user._id,
      actorId: req.user.id,
      targetUserId: user._id,
      details: { verificationId: String(verification._id) },
      ip: req.ip,
    });

    res.status(201).json({ success: true, data: verification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/create', async (req, res) => {
  try {
    const result = await createAnalystAccount({
      ...req.body,
      actorId: req.user.id,
      ip: req.ip,
      verified: req.body?.verified !== false,
    });

    res.status(201).json({
      success: true,
      message: 'Analista creado correctamente',
      data: result,
    });
  } catch (err) {
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Error al crear analista',
    });
  }
});

router.get('/analysts/stripe/dashboard-url', async (req, res) => {
  res.json({
    success: true,
    data: {
      pricesUrl: `${stripeDashboardBase()}/products?active=true`,
      createPriceUrl: `${stripeDashboardBase()}/products/create`,
    },
  });
});

router.post('/analysts/stripe/create-price', checkMainAdmin, async (req, res) => {
  try {
    const stripe = getStripeClient();
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe no configurado' });
    }

    const { productName, unitAmountCents, currency = 'eur' } = req.body || {};
    const amount = parseInt(unitAmountCents, 10);
    if (!productName || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'productName y unitAmountCents son obligatorios',
      });
    }

    const product = await stripe.products.create({
      name: String(productName).trim().slice(0, 120),
      metadata: { source: 'goal_logic_analyst_admin' },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: String(currency).toLowerCase(),
      recurring: { interval: 'month' },
    });

    await logAnalystAudit({
      action: 'stripe_price_created',
      actorId: req.user.id,
      details: { productId: product.id, priceId: price.id, unitAmountCents: amount },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        priceId: price.id,
        productId: product.id,
        dashboardUrl: `${stripeDashboardBase()}/prices/${price.id}`,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/analysts/:id', checkMainAdmin, async (req, res) => {
  try {
    const user = await loadAnalystOr404(req.params.id);
    if (!user || user.role !== 'analista') {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    user.role = 'usuario';
    user.analystStatus = 'none';
    user.analystVerifiedAt = null;
    user.analystStripePriceId = null;
    user.analystSubscriptionPriceCents = null;
    user.analystDescription = '';
    await user.save();

    await logAnalystAudit({
      action: 'analyst_removed',
      analystId: user._id,
      actorId: req.user.id,
      targetUserId: user._id,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Analista eliminado (rol revertido a usuario)' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts', async (req, res) => {
  try {
    const filter = { role: 'analista' };
    if (req.query.status) filter.analystStatus = req.query.status;

    const analysts = await User.find(filter)
      .select(
        'nombre apellido email publicId foto_perfil_url role analystStatus analystVerifiedAt analystStripePriceId analystSubscriptionPriceCents analystPostsBlocked analystMessagesBlocked analystSuspendedAt analystSuspendedReason analystWarnings analystDescription pais created_at'
      )
      .sort({ nombre: 1 })
      .lean();

    const enriched = await Promise.all(analysts.map(mapAnalystAdminRow));
    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/:id', async (req, res) => {
  try {
    const detail = await getAnalystAdminDetail(req.params.id);
    if (!detail) return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    res.json({ success: true, data: detail });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/analysts/:id', async (req, res) => {
  try {
    const user = await loadAnalystOr404(req.params.id);
    if (!user || user.role !== 'analista') {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const { nombre, apellido, pais, foto_perfil_url, analystDescription, analystSubscriptionPriceCents, analystStripePriceId } = req.body || {};
    if (nombre != null) user.nombre = String(nombre).trim();
    if (apellido != null) user.apellido = String(apellido).trim();
    if (pais != null) user.pais = String(pais).trim();
    if (foto_perfil_url != null) {
      const nextUrl = String(foto_perfil_url).trim();
      const prevUrl = user.foto_perfil_url;
      user.foto_perfil_url = nextUrl || null;
      if (prevUrl && prevUrl !== user.foto_perfil_url) {
        const { deleteCloudinaryImageByUrl } = require('../utils/cloudinaryAvatar');
        deleteCloudinaryImageByUrl(prevUrl).catch(() => {});
      }
    }
    if (analystDescription != null) user.analystDescription = String(analystDescription).trim();
    if (analystStripePriceId != null) user.analystStripePriceId = String(analystStripePriceId).trim();
    if (analystSubscriptionPriceCents != null) {
      const cents = parseInt(analystSubscriptionPriceCents, 10);
      if (Number.isNaN(cents) || cents < 0) {
        return res.status(400).json({ success: false, message: 'Precio inválido' });
      }
      user.analystSubscriptionPriceCents = cents;
    }

    await user.save();
    await logAnalystAudit({
      action: 'analyst_updated',
      analystId: user._id,
      actorId: req.user.id,
      details: req.body,
      ip: req.ip,
    });

    res.json({ success: true, data: await mapAnalystAdminRow(user.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/analysts/:id/price', async (req, res) => {
  try {
    const { stripePriceId, priceCents } = req.body || {};
    const user = await loadAnalystOr404(req.params.id);
    if (!user || user.role !== 'analista') {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const prev = {
      analystStripePriceId: user.analystStripePriceId,
      analystSubscriptionPriceCents: user.analystSubscriptionPriceCents,
    };

    if (stripePriceId != null) user.analystStripePriceId = String(stripePriceId).trim();
    if (priceCents != null) {
      const cents = parseInt(priceCents, 10);
      if (Number.isNaN(cents) || cents < 0) {
        return res.status(400).json({ success: false, message: 'Precio inválido' });
      }
      user.analystSubscriptionPriceCents = cents;
    }

    await user.save();

    await logAnalystAudit({
      action: 'price_updated',
      analystId: user._id,
      actorId: req.user.id,
      details: { previous: prev, current: { analystStripePriceId: user.analystStripePriceId, analystSubscriptionPriceCents: user.analystSubscriptionPriceCents } },
      ip: req.ip,
    });

    logger.info('analyst_price_updated', { analystId: String(user._id), actorId: String(req.user.id) });

    res.json({
      success: true,
      data: {
        id: user._id,
        analystStripePriceId: user.analystStripePriceId,
        analystSubscriptionPriceCents: user.analystSubscriptionPriceCents,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/analysts/:id/suspend', async (req, res) => {
  try {
    const user = await loadAnalystOr404(req.params.id);
    if (!user || user.role !== 'analista') {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const { suspend, reason } = req.body || {};
    const shouldSuspend = suspend !== false;

    if (shouldSuspend) {
      user.analystStatus = 'suspended';
      user.analystSuspendedAt = new Date();
      user.analystSuspendedReason = (reason || '').trim() || null;
    } else {
      user.analystStatus = 'active';
      user.analystSuspendedAt = null;
      user.analystSuspendedReason = null;
    }

    await user.save();

    await logAnalystAudit({
      action: shouldSuspend ? 'analyst_suspended' : 'analyst_reactivated',
      analystId: user._id,
      actorId: req.user.id,
      details: { reason: user.analystSuspendedReason },
      ip: req.ip,
    });

    res.json({
      success: true,
      message: shouldSuspend ? 'Analista suspendido' : 'Analista reactivado',
      data: { analystStatus: user.analystStatus },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/analysts/:id/sanctions', async (req, res) => {
  try {
    const user = await loadAnalystOr404(req.params.id);
    if (!user || user.role !== 'analista') {
      return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    }

    const {
      blockPosts,
      blockMessages,
      removeVerification,
      grantVerification,
      warningMessage,
    } = req.body || {};

    if (blockPosts != null) user.analystPostsBlocked = Boolean(blockPosts);
    if (blockMessages != null) user.analystMessagesBlocked = Boolean(blockMessages);

    if (grantVerification === true) {
      user.analystVerifiedAt = new Date();
      if (user.analystStatus === 'none' || user.analystStatus === 'pending') {
        user.analystStatus = 'active';
      }
    }

    if (removeVerification === true) {
      user.analystVerifiedAt = null;
      user.analystStatus = 'suspended';
    }

    if (warningMessage && String(warningMessage).trim()) {
      user.analystWarnings = user.analystWarnings || [];
      user.analystWarnings.push({
        message: String(warningMessage).trim(),
        actorId: req.user.id,
        createdAt: new Date(),
      });
    }

    await user.save();

    await logAnalystAudit({
      action: 'analyst_sanctions',
      analystId: user._id,
      actorId: req.user.id,
      details: req.body,
      ip: req.ip,
    });

    res.json({ success: true, message: 'Sanciones aplicadas', data: await mapAnalystAdminRow(user.toObject()) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/:id/subscribers', async (req, res) => {
  try {
    const detail = await getAnalystAdminDetail(req.params.id);
    if (!detail) return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    res.json({ success: true, data: detail.subscribers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/analysts/:id/subscribers/:subscriptionId/cancel', async (req, res) => {
  try {
    const sub = await AnalystSubscription.findOne({
      _id: req.params.subscriptionId,
      analystId: req.params.id,
    });
    if (!sub) return res.status(404).json({ success: false, message: 'Suscripción no encontrada' });

    if (sub.stripeSubscriptionId) {
      await deactivateAnalystSubscriptionByStripeId(sub.stripeSubscriptionId);
    } else {
      sub.status = 'canceled';
      await sub.save();
    }

    await logAnalystAudit({
      action: 'subscription_force_canceled',
      analystId: sub.analystId,
      actorId: req.user.id,
      targetUserId: sub.subscriberId,
      details: { subscriptionId: String(sub._id) },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Suscripción cancelada' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/:id/messages', async (req, res) => {
  try {
    const messages = await AnalystMessage.find({ analystId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();

    const enriched = await Promise.all(
      messages.map(async (m) => {
        const recipients = await AnalystMessage.countDocuments({
          analystId: m.analystId,
          title: m.title,
          content: m.content,
          createdAt: m.createdAt,
        });
        return { ...m, recipientCount: recipients || 1 };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/analysts/messages/:messageId/suspend', async (req, res) => {
  try {
    const message = await AnalystMessage.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Mensaje no encontrado' });

    message.suspended = true;
    message.suspendedAt = new Date();
    message.suspendedReason = (req.body?.reason || '').trim() || 'Suspendido por administración';
    await message.save();

    await logAnalystAudit({
      action: 'message_suspended',
      analystId: message.analystId,
      actorId: req.user.id,
      details: { messageId: String(message._id), reason: message.suspendedReason },
      ip: req.ip,
    });

    res.json({ success: true, message: 'Mensaje suspendido' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/analysts/:id/payments', async (req, res) => {
  try {
    const detail = await getAnalystAdminDetail(req.params.id);
    if (!detail) return res.status(404).json({ success: false, message: 'Analista no encontrado' });
    res.json({
      success: true,
      data: {
        payments: detail.payments,
        totalRevenueCents: detail.totalRevenueCents,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
