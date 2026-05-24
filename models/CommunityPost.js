const mongoose = require('mongoose');

const PUBLICATION_TYPES = [
  'Tiros de esquina',
  'Goles',
  'Tarjetas',
  'Equipos',
  'Comentario',
];

const CommunityPostSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  publicationType: {
    type: String,
    enum: PUBLICATION_TYPES,
    required: true,
  },
  matchId: { type: String, default: '' },
  matchInfo: {
    homeTeam: String,
    awayTeam: String,
    league: String,
    startTime: Date,
  },
  modelUsed: { type: String, enum: ['xG', 'Poisson', 'Mixto'] },
  statsUsed: [{
    type: String,
    enum: ['xG', 'Corners', 'Forma', 'H2H', 'Local/Visitante'],
  }],
  probability: { type: String, default: '' },
  probabilities: {
    home: { type: Number, min: 0, max: 100 },
    draw: { type: Number, min: 0, max: 100 },
    away: { type: Number, min: 0, max: 100 },
  },
  text: { type: String, required: true },
  reactionsCount: {
    like: { type: Number, default: 0 },
    useful: { type: Number, default: 0 },
  },
  commentsCount: { type: Number, default: 0 },
  isReported: { type: Boolean, default: false },
  reports: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

CommunityPostSchema.index({ createdAt: 1 });

module.exports = mongoose.model('CommunityPost', CommunityPostSchema);
