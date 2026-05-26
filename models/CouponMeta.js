const mongoose = require('mongoose');

const couponMetaSchema = new mongoose.Schema(
  {
    stripeCouponId: { type: String, required: true, unique: true, index: true },
    stripePromotionCodeId: { type: String, default: null, index: true },
    promoCode: { type: String, trim: true, uppercase: true, index: true },
    label: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    autoApplyCheckout: { type: Boolean, default: false, index: true },
    scheduledActivateAt: { type: Date, default: null },
    scheduledDeactivateAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'coupon_meta' }
);

module.exports = mongoose.model('CouponMeta', couponMetaSchema);
