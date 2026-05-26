const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'enum'],
      required: true,
    },
    category: { type: String, required: true, index: true },
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    options: [{ type: String }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'system_settings' }
);

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
