const mongoose = require('mongoose');

const favoritesSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  equipos: [{
    type: String
  }],
  ligas: [{
    type: String
  }],
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware pre('save') para actualizar updated_at automáticamente
favoritesSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Middleware pre('findOneAndUpdate') para actualizar updated_at en actualizaciones
favoritesSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

module.exports = mongoose.model('Favorites', favoritesSchema);
