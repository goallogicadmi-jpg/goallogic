const express = require('express');
const auth = require('../middleware/auth');
const checkMainAdmin = require('../middleware/checkMainAdmin');
const CouponMeta = require('../models/CouponMeta');
const logger = require('../utils/logger');
const { logCouponAction, mapCouponListItem } = require('../utils/couponAdminHelpers');
const {
  listCouponsAdmin,
  createCouponAdmin,
  setPromotionActive,
  getCouponDetail,
  getCouponConversionStats,
} = require('../utils/stripeCouponAdmin');

const router = express.Router();

router.use(auth, checkMainAdmin);

router.get('/', async (req, res) => {
  try {
    const items = await listCouponsAdmin(req.query);
    res.json({
      success: true,
      data: {
        items: items.map(mapCouponListItem),
        total: items.length,
        envCouponId: (process.env.STRIPE_COUPON_ID || '').trim() || null,
      },
    });
  } catch (error) {
    logger.error('admin_coupons_list_error', { message: error.message, code: error.code });
    res.status(500).json({
      success: false,
      message: error.message || 'Error al listar cupones',
      code: error.code,
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const result = await createCouponAdmin(req.body, req.user.id);
    logCouponAction('create', req, {
      stripeCouponId: result.coupon.id,
      promoCode: result.promotion.code,
    });
    const items = await listCouponsAdmin();
    const created = items.find((i) => i.stripeCouponId === result.coupon.id);
    res.status(201).json({
      success: true,
      data: created ? mapCouponListItem(created) : { stripeCouponId: result.coupon.id },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Error al crear cupón',
    });
  }
});

router.get('/:couponId', async (req, res) => {
  try {
    const detail = await getCouponDetail(req.params.couponId);
    const { coupon, promo, meta, status } = detail;
    res.json({
      success: true,
      data: {
        ...mapCouponListItem({
          stripeCouponId: coupon.id,
          stripePromotionCodeId: promo?.id,
          promoCode: promo?.code || meta.promoCode,
          label: meta.label || coupon.name,
          percentOff: coupon.percent_off,
          amountOff: coupon.amount_off,
          currency: coupon.currency,
          duration: coupon.duration,
          durationInMonths: coupon.duration_in_months,
          maxRedemptions: coupon.max_redemptions,
          timesRedeemed: coupon.times_redeemed,
          redeemBy: coupon.redeem_by ? new Date(coupon.redeem_by * 1000).toISOString() : null,
          expiresAt: promo?.expires_at ? new Date(promo.expires_at * 1000).toISOString() : null,
          autoApplyCheckout: meta.autoApplyCheckout,
          scheduledActivateAt: meta.scheduledActivateAt,
          scheduledDeactivateAt: meta.scheduledDeactivateAt,
          notes: meta.notes,
          status,
          livemode: coupon.livemode,
          createdAt: new Date(coupon.created * 1000).toISOString(),
        }),
        raw: { coupon, promo },
      },
    });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message || 'Cupón no encontrado' });
  }
});

router.post('/:couponId/deactivate', async (req, res) => {
  try {
    let meta = await CouponMeta.findOne({ stripeCouponId: req.params.couponId });
    let promoId = meta?.stripePromotionCodeId;
    if (!promoId) {
      const detail = await getCouponDetail(req.params.couponId);
      promoId = detail.promo?.id;
    }
    if (!promoId) {
      return res.status(400).json({ success: false, message: 'Sin código promocional asociado' });
    }
    await setPromotionActive(promoId, false);
    logCouponAction('deactivate', req, { stripeCouponId: req.params.couponId });
    res.json({ success: true, message: 'Cupón desactivado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error al desactivar' });
  }
});

router.post('/:couponId/activate', async (req, res) => {
  try {
    let meta = await CouponMeta.findOne({ stripeCouponId: req.params.couponId });
    let promoId = meta?.stripePromotionCodeId;
    if (!promoId) {
      const detail = await getCouponDetail(req.params.couponId);
      promoId = detail.promo?.id;
    }
    if (!promoId) {
      return res.status(400).json({ success: false, message: 'Sin código promocional asociado' });
    }
    await setPromotionActive(promoId, true);
    logCouponAction('activate', req, { stripeCouponId: req.params.couponId });
    res.json({ success: true, message: 'Cupón activado' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error al activar' });
  }
});

router.post('/:couponId/set-checkout-default', async (req, res) => {
  try {
    const detail = await getCouponDetail(req.params.couponId);
    await CouponMeta.updateMany({ autoApplyCheckout: true }, { autoApplyCheckout: false });
    await CouponMeta.findOneAndUpdate(
      { stripeCouponId: req.params.couponId },
      {
        stripeCouponId: req.params.couponId,
        stripePromotionCodeId: detail.promo?.id || null,
        promoCode: detail.promo?.code || null,
        label: detail.meta?.label || detail.coupon?.name,
        autoApplyCheckout: true,
      },
      { upsert: true }
    );
    logCouponAction('set_checkout_default', req, { stripeCouponId: req.params.couponId });
    res.json({ success: true, message: 'Cupón marcado para checkout automático' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:couponId/stats', async (req, res) => {
  try {
    const stats = await getCouponConversionStats(req.params.couponId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Error al obtener estadísticas' });
  }
});

module.exports = router;
