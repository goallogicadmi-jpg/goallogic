const mongoose = require('mongoose');

const CMS_TYPES = ['news', 'announcement', 'banner'];
const CMS_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
const BANNER_VARIANTS = ['info', 'warning', 'success'];

const cmsItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, maxlength: 50000 },
    excerpt: { type: String, trim: true, maxlength: 500, default: '' },
    type: {
      type: String,
      enum: CMS_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: CMS_STATUSES,
      default: 'draft',
      index: true,
    },
    scheduledPublishAt: { type: Date, default: null, index: true },
    publishedAt: { type: Date, default: null, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bannerVariant: {
      type: String,
      enum: BANNER_VARIANTS,
      default: 'info',
    },
    priority: { type: Number, default: 0 },
    dismissible: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'cms_items' }
);

cmsItemSchema.index({ type: 1, status: 1, publishedAt: -1 });
cmsItemSchema.index({ status: 1, scheduledPublishAt: 1 });

module.exports = mongoose.model('CMSItem', cmsItemSchema);
module.exports.CMS_TYPES = CMS_TYPES;
module.exports.CMS_STATUSES = CMS_STATUSES;
module.exports.BANNER_VARIANTS = BANNER_VARIANTS;
