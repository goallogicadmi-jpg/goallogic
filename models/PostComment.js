const mongoose = require('mongoose');

const PostCommentSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  isReported: { type: Boolean, default: false },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now },
  }],
  reportStatus: {
    type: String,
    enum: ['open', 'resolved', 'dismissed'],
    default: 'open',
  },
  deletedAt: { type: Date, default: null },
  moderationHistory: [{
    action: { type: String, required: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

PostCommentSchema.index({ isReported: 1, reportStatus: 1 });
PostCommentSchema.index({ deletedAt: 1 });

module.exports = mongoose.model('PostComment', PostCommentSchema);
