const mongoose = require('mongoose');

const simulatorStateSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  capital_inicial: {
    type: Number,
    required: true,
    default: 1000
  },
  capital_actual: {
    type: Number,
    required: true,
    default: 1000
  },
  apuestas: [{
    partido: {
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
    resultado: {
      type: String,
      enum: ['ganada', 'perdida', 'nula', 'pendiente'],
      default: 'pendiente'
    },
    ganancia: {
      type: Number,
      default: 0
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    // Campo para almacenar la fila completa de la tabla
    table_row: {
      type: mongoose.Schema.Types.Mixed,
      required: false
    }
  }],
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware pre('save') para actualizar updated_at automáticamente
simulatorStateSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Middleware pre('findOneAndUpdate') para actualizar updated_at en actualizaciones
simulatorStateSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

module.exports = mongoose.model('SimulatorState', simulatorStateSchema);
