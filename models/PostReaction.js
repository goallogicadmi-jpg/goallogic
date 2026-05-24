const mongoose = require('mongoose');

const PostReactionSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityPost', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['like', 'useful'], required: true },
}, { timestamps: true });

PostReactionSchema.index({ post: 1, user: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('PostReaction', PostReactionSchema);
