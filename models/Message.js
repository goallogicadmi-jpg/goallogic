const mongoose = require('mongoose');

/**
 * Modelo de Mensajes
 * Sistema de mensajería interna entre administradores y usuarios
 */
const messageSchema = new mongoose.Schema({
  // Usuario receptor del mensaje
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Índice para búsquedas rápidas
  },
  // Administrador que envía el mensaje
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Título del mensaje
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  // Contenido del mensaje
  contenido: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  // Estado de lectura
  leido: {
    type: Boolean,
    default: false,
    index: true // Índice para contar mensajes no leídos
  },
  // Campaña masiva/programada (opcional)
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MessageCampaign',
    default: null,
    index: true,
  },
  // Fecha de creación
  created_at: {
    type: Date,
    default: Date.now,
    index: true // Índice para ordenar por fecha
  }
});

// Índice compuesto para búsquedas eficientes
messageSchema.index({ user_id: 1, leido: 1 });
messageSchema.index({ admin_id: 1, created_at: -1 });

module.exports = mongoose.model('Message', messageSchema);
