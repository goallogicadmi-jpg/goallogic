const logger = require('./logger');

function logCouponAction(action, req, payload = {}) {
  logger.info('admin_coupon_action', {
    action,
    actorId: req?.user?.id ? String(req.user.id) : null,
    ip: req?.ip || null,
    endpoint: req ? `${req.method} ${req.baseUrl}${req.path}` : null,
    ...payload,
  });
}

function couponDisplayStatus(coupon, promo, meta = {}) {
  const now = Math.floor(Date.now() / 1000);
  if (!coupon?.valid) return 'inactive';
  if (promo && promo.active === false) return 'inactive';
  if (coupon.redeem_by && coupon.redeem_by < now) return 'expired';
  if (promo?.expires_at && promo.expires_at < now) return 'expired';
  if (meta.scheduledDeactivateAt && new Date(meta.scheduledDeactivateAt).getTime() <= Date.now()) {
    return 'expired';
  }
  if (meta.scheduledActivateAt && new Date(meta.scheduledActivateAt).getTime() > Date.now()) {
    return 'scheduled';
  }
  if (coupon.max_redemptions && coupon.times_redeemed >= coupon.max_redemptions) {
    return 'exhausted';
  }
  if (promo?.max_redemptions && promo.times_redeemed >= promo.max_redemptions) {
    return 'exhausted';
  }
  return 'active';
}

function mapCouponListItem(row) {
  const status = row.status || 'inactive';
  const isPercent = row.percentOff != null;
  const discountLabel = isPercent
    ? `${row.percentOff}%`
    : row.amountOff != null
      ? `${(row.amountOff / 100).toFixed(2)} ${(row.currency || 'usd').toUpperCase()}`
      : '—';

  return {
    id: row.stripeCouponId,
    stripeCouponId: row.stripeCouponId,
    stripePromotionCodeId: row.stripePromotionCodeId,
    promoCode: row.promoCode,
    label: row.label,
    status,
    statusLabel:
      {
        active: 'Activo',
        inactive: 'Inactivo',
        expired: 'Expirado',
        exhausted: 'Agotado',
        scheduled: 'Programado',
      }[status] || status,
    discountLabel,
    percentOff: row.percentOff,
    amountOff: row.amountOff,
    currency: row.currency,
    duration: row.duration,
    durationInMonths: row.durationInMonths,
    maxRedemptions: row.maxRedemptions,
    timesRedeemed: row.timesRedeemed ?? 0,
    redeemBy: row.redeemBy,
    expiresAt: row.expiresAt,
    autoApplyCheckout: row.autoApplyCheckout,
    scheduledActivateAt: row.scheduledActivateAt,
    scheduledDeactivateAt: row.scheduledDeactivateAt,
    livemode: row.livemode,
    createdAt: row.createdAt,
  };
}

module.exports = {
  logCouponAction,
  couponDisplayStatus,
  mapCouponListItem,
};
