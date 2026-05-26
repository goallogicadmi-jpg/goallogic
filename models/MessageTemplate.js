const mongoose = require('mongoose');

const messageTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    titulo: { type: String, required: true, trim: true, maxlength: 200 },
    contenido: { type: String, required: true, trim: true, maxlength: 5000 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    variables: {
      type: [String],
      default: ['name', 'email', 'premium_since'],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

messageTemplateSchema.index({ name: 1 });

module.exports = mongoose.model('MessageTemplate', messageTemplateSchema);
