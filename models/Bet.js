const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  partido: {
    type: String,
    required: true
  },
  mercado: {
    type: String,
    enum: ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'],
    required: true
  },
  seleccion: {
    type: String,
    required: true
  },
  cuota: {
    type: Number,
    required: true
  },
  stake: {
    type: Number,
    required: true
  },
  modelo_analisis: {
    type: String,
    enum: ['xG', 'Poisson', 'Mixto'],
    required: true
  },
  confianza: {
    type: Number,
    min: 1,
    max: 5,
    required: true
  },
  resultado: {
    type: String,
    enum: ['pendiente', 'ganada', 'perdida', 'nula'],
    default: 'pendiente'
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Bet', betSchema);
