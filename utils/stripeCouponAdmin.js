const Stripe = require('stripe');
const CouponMeta = require('../models/CouponMeta');
const { couponDisplayStatus } = require('./couponAdminHelpers');

function getStripe() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!key) {
    const err = new Error('STRIPE_SECRET_KEY no configurada');
    err.code = 'STRIPE_NOT_CONFIGURED';
    throw err;
  }
  return new Stripe(key);
}

async function loadMetaMap() {
  const rows = await CouponMeta.find().lean();
  const byCoupon = new Map();
  const byPromo = new Map();
  rows.forEach((r) => {
    byCoupon.set(r.stripeCouponId, r);
    if (r.stripePromotionCodeId) byPromo.set(r.stripePromotionCodeId, r);
    if (r.promoCode) byPromo.set(r.promoCode.toUpperCase(), r);
  });
  return { byCoupon, rows };
}

async function applyScheduledTransitions(stripe) {
  const now = new Date();
  const dueActivate = await CouponMeta.find({
    scheduledActivateAt: { $lte: now },
    stripePromotionCodeId: { $ne: null },
  });
  const dueDeactivate = await CouponMeta.find({
    scheduledDeactivateAt: { $lte: now },
    stripePromotionCodeId: { $ne: null },
  });

  for (const meta of dueActivate) {
    try {
      await stripe.promotionCodes.update(meta.stripePromotionCodeId, { active: true });
      meta.scheduledActivateAt = null;
      await meta.save();
    } catch (_) {
      /* ignore */
    }
  }

  for (const meta of dueDeactivate) {
    try {
      await stripe.promotionCodes.update(meta.stripePromotionCodeId, { active: false });
      meta.scheduledDeactivateAt = null;
      await meta.save();
    } catch (_) {
      /* ignore */
    }
  }
}

async function listCouponsAdmin(filters = {}) {
  const stripe = getStripe();
  await applyScheduledTransitions(stripe);

  const { byCoupon } = await loadMetaMap();
  const coupons = await stripe.coupons.list({ limit: 100 });

  const items = [];

  for (const coupon of coupons.data || []) {
    const promos = await stripe.promotionCodes.list({
      coupon: coupon.id,
      limit: 20,
    });

    const promoList = promos.data?.length
      ? promos.data
      : [{ id: null, code: null, active: coupon.valid, times_redeemed: 0 }];

    for (const promo of promoList) {
      const meta = byCoupon.get(coupon.id) || {};
      const row = {
        stripeCouponId: coupon.id,
        stripePromotionCodeId: promo.id,
        promoCode: promo.code || meta.promoCode || null,
        label: meta.label || coupon.name || coupon.id,
        percentOff: coupon.percent_off,
        amountOff: coupon.amount_off,
        currency: coupon.currency,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months,
        maxRedemptions: coupon.max_redemptions,
        timesRedeemed: coupon.times_redeemed ?? promo.times_redeemed ?? 0,
        redeemBy: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
        expiresAt: promo.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
        autoApplyCheckout: Boolean(meta.autoApplyCheckout),
        scheduledActivateAt: meta.scheduledActivateAt,
        scheduledDeactivateAt: meta.scheduledDeactivateAt,
        livemode: coupon.livemode,
        createdAt: new Date(coupon.created * 1000).toISOString(),
        notes: meta.notes,
      };
      row.status = couponDisplayStatus(coupon, promo, meta);

      if (filters.status && filters.status !== 'all' && row.status !== filters.status) continue;
      if (filters.type === 'percent' && row.percentOff == null) continue;
      if (filters.type === 'amount' && row.amountOff == null) continue;
      if (filters.q?.trim()) {
        const q = filters.q.trim().toLowerCase();
        const hay =
          String(row.promoCode || '').toLowerCase().includes(q) ||
          String(row.label || '').toLowerCase().includes(q) ||
          String(row.stripeCouponId || '').toLowerCase().includes(q);
        if (!hay) continue;
      }

      items.push(row);
    }
  }

  items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return items;
}

async function createCouponAdmin(payload, actorId) {
  const stripe = getStripe();
  const {
    code,
    label,
    type,
    percentOff,
    amountOff,
    currency = 'usd',
    duration = 'once',
    durationInMonths,
    maxRedemptions,
    expiresAt,
    redeemBy,
    autoApplyCheckout,
    scheduledActivateAt,
    scheduledDeactivateAt,
    notes,
  } = payload;

  if (!code?.trim()) {
    throw new Error('El código promocional es obligatorio');
  }

  const couponParams = {
    name: label?.trim() || code.trim(),
    duration,
    metadata: { source: 'goallogic_admin' },
  };

  if (duration === 'repeating') {
    const months = parseInt(durationInMonths, 10) || 1;
    couponParams.duration_in_months = months;
  }

  if (type === 'percent') {
    const pct = Math.min(100, Math.max(1, parseInt(percentOff, 10) || 0));
    if (!pct) throw new Error('Porcentaje inválido');
    couponParams.percent_off = pct;
  } else if (type === 'amount') {
    const cents = Math.max(1, parseInt(amountOff, 10) || 0);
    if (!cents) throw new Error('Monto inválido');
    couponParams.amount_off = cents;
    couponParams.currency = (currency || 'usd').toLowerCase();
  } else {
    throw new Error('Tipo de descuento inválido');
  }

  if (maxRedemptions) {
    couponParams.max_redemptions = Math.max(1, parseInt(maxRedemptions, 10));
  }

  if (redeemBy) {
    const rb = Math.floor(new Date(redeemBy).getTime() / 1000);
    if (!Number.isNaN(rb)) couponParams.redeem_by = rb;
  }

  const coupon = await stripe.coupons.create(couponParams);

  const promoParams = {
    coupon: coupon.id,
    code: code.trim().toUpperCase(),
  };

  if (maxRedemptions) {
    promoParams.max_redemptions = Math.max(1, parseInt(maxRedemptions, 10));
  }

  if (expiresAt) {
    const exp = Math.floor(new Date(expiresAt).getTime() / 1000);
    if (!Number.isNaN(exp)) promoParams.expires_at = exp;
  }

  const scheduleFuture =
    scheduledActivateAt && new Date(scheduledActivateAt).getTime() > Date.now();
  if (!scheduleFuture) {
    promoParams.active = true;
  } else {
    promoParams.active = false;
  }

  const promotion = await stripe.promotionCodes.create(promoParams);

  if (autoApplyCheckout) {
    await CouponMeta.updateMany({ autoApplyCheckout: true }, { autoApplyCheckout: false });
  }

  const meta = await CouponMeta.create({
    stripeCouponId: coupon.id,
    stripePromotionCodeId: promotion.id,
    promoCode: promotion.code,
    label: label?.trim() || promotion.code,
    notes: notes || '',
    autoApplyCheckout: Boolean(autoApplyCheckout),
    scheduledActivateAt: scheduledActivateAt ? new Date(scheduledActivateAt) : null,
    scheduledDeactivateAt: scheduledDeactivateAt ? new Date(scheduledDeactivateAt) : null,
    createdBy: actorId,
  });

  return { coupon, promotion, meta };
}

async function setPromotionActive(stripePromotionCodeId, active) {
  const stripe = getStripe();
  return stripe.promotionCodes.update(stripePromotionCodeId, { active });
}

async function getCouponDetail(stripeCouponId) {
  const stripe = getStripe();
  const coupon = await stripe.coupons.retrieve(stripeCouponId);
  const promos = await stripe.promotionCodes.list({ coupon: stripeCouponId, limit: 20 });
  const meta = (await CouponMeta.findOne({ stripeCouponId }).lean()) || {};
  const promo = promos.data?.[0] || null;

  return {
    coupon,
    promo,
    meta,
    status: couponDisplayStatus(coupon, promo, meta),
  };
}

async function validatePromotionCode(code) {
  const stripe = getStripe();
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: 'Código vacío' };
  }

  const list = await stripe.promotionCodes.list({
    code: normalized,
    active: true,
    limit: 1,
  });

  const promo = list.data?.[0];
  if (!promo) {
    return { valid: false, message: 'Código no válido o inactivo' };
  }

  const coupon = await stripe.coupons.retrieve(
    typeof promo.coupon === 'string' ? promo.coupon : promo.coupon.id
  );

  const status = couponDisplayStatus(coupon, promo);
  if (status !== 'active') {
    return { valid: false, message: 'El cupón no está disponible', status };
  }

  return {
    valid: true,
    promotionCodeId: promo.id,
    stripeCouponId: coupon.id,
    code: promo.code,
    percentOff: coupon.percent_off,
    amountOff: coupon.amount_off,
    currency: coupon.currency,
    duration: coupon.duration,
    message:
      coupon.percent_off != null
        ? `Descuento del ${coupon.percent_off}% aplicado`
        : `Descuento de ${(coupon.amount_off / 100).toFixed(2)} ${(coupon.currency || 'usd').toUpperCase()}`,
  };
}

async function resolveCheckoutDiscount({ promotionCode } = {}) {
  if (promotionCode?.trim()) {
    const v = await validatePromotionCode(promotionCode);
    if (!v.valid) {
      const err = new Error(v.message || 'Cupón inválido');
      err.code = 'COUPON_INVALID';
      throw err;
    }
    return { type: 'promotion_code', id: v.promotionCodeId };
  }

  const metaDefault = await CouponMeta.findOne({ autoApplyCheckout: true }).lean();
  if (metaDefault?.stripePromotionCodeId) {
    return { type: 'promotion_code', id: metaDefault.stripePromotionCodeId };
  }

  const envCoupon = (process.env.STRIPE_COUPON_ID || '').trim();
  if (envCoupon) {
    if (envCoupon.startsWith('promo_')) {
      return { type: 'promotion_code', id: envCoupon };
    }
    return { type: 'coupon', id: envCoupon };
  }

  return null;
}

async function getCouponConversionStats(stripeCouponId) {
  const stripe = getStripe();
  const coupon = await stripe.coupons.retrieve(stripeCouponId);

  let checkoutWithDiscount = 0;
  let startingAfter;
  for (let i = 0; i < 5; i++) {
    const params = { limit: 100 };
    if (startingAfter) params.starting_after = startingAfter;
    const sessions = await stripe.checkout.sessions.list(params);
    const batch = sessions.data || [];
    checkoutWithDiscount += batch.filter(
      (s) =>
        s.status === 'complete' &&
        (s.total_details?.amount_discount > 0 ||
          (s.discounts && s.discounts.length > 0))
    ).length;
    if (!sessions.has_more || !batch.length) break;
    startingAfter = batch[batch.length - 1].id;
  }

  return {
    timesRedeemed: coupon.times_redeemed ?? 0,
    maxRedemptions: coupon.max_redemptions,
    recentCheckoutSessionsWithDiscount: checkoutWithDiscount,
    note: 'Muestra aproximada de últimas sesiones Stripe (máx. 500).',
  };
}

module.exports = {
  getStripe,
  listCouponsAdmin,
  createCouponAdmin,
  setPromotionActive,
  getCouponDetail,
  validatePromotionCode,
  resolveCheckoutDiscount,
  getCouponConversionStats,
};
