const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Campos obligatorios
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  apellido: {
    type: String,
    trim: true,
    default: ''
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password_hash: {
    type: String,
    required: true
  },
  // Campos opcionales (preparados para el futuro)
  foto_perfil_url: {
    type: String
  },
  pais: {
    type: String
  },
  ciudad: {
    type: String
  },
  direccion: {
    type: String,
    trim: true,
    default: ''
  },
  codigo_postal: {
    type: String,
    trim: true,
    default: ''
  },
  /** Tipo de cuenta: usuario estándar o familiar (acceso gratuito permanente). */
  tipo: {
    type: String,
    enum: ['usuario', 'familia'],
    default: 'usuario',
    index: true,
  },
  /** Plan comercial: free-family = acceso gratuito sin Stripe. */
  plan: {
    type: String,
    trim: true,
    default: null,
    index: true,
  },
  /** Si true, nunca se solicita pago ni se revoca premium vía Stripe. */
  billingLocked: {
    type: Boolean,
    default: false,
    index: true,
  },
  /** Modal de bienvenida familiar ya mostrado. */
  welcomeShown: {
    type: Boolean,
    default: false,
  },
  /** Guía detallada de onboarding enviada en el primer login. */
  onboardingGuideSent: {
    type: Boolean,
    default: false,
  },
  /** Prueba gratuita de 15 días activa. */
  trialActive: {
    type: Boolean,
    default: false,
    index: true,
  },
  /** Fin de la prueba gratuita. */
  trialEndsAt: {
    type: Date,
    default: null,
    index: true,
  },
  /** Usuario vio el modal de trial expirado. */
  trialExpiredAcknowledged: {
    type: Boolean,
    default: false,
  },
  premium: {
    type: Boolean,
    default: false,
    index: true
  },
  /** Fecha en que el usuario pasó a premium (primera activación vía Stripe). */
  premium_since: {
    type: Date
  },
  /** IDs de Stripe para correlacionar suscripciones y webhooks. */
  stripe_customer_id: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  stripe_subscription_id: {
    type: String,
    trim: true,
    sparse: true,
    index: true
  },
  idioma: {
    type: String,
    default: 'es'
  },
  timezone: {
    type: String
  },
  equipo_favorito: {
    type: String
  },
  ligas_favoritas: [{
    type: String
  }],
  // Rol del usuario: admin, admin_secundario, usuario
  role: {
    type: String,
    enum: ['admin', 'admin_secundario', 'usuario', 'analista'],
    default: 'usuario',
    index: true // Índice para búsquedas de administradores
  },
  /** Fecha en que el usuario fue certificado como analista deportivo. */
  analystVerifiedAt: {
    type: Date,
    default: null,
  },
  /** Precio mensual de suscripción al analista (centavos, display). */
  analystSubscriptionPriceCents: {
    type: Number,
    default: null,
    min: 0,
  },
  /** Stripe Price ID para suscripción al analista (configurado por admin). */
  analystStripePriceId: {
    type: String,
    trim: true,
    default: null,
  },
  /** Identificador público visible (ej. BRAYAN-CORTES-582). */
  publicId: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
    index: true,
  },
  /** Estado operativo del analista deportivo. */
  analystStatus: {
    type: String,
    enum: ['none', 'pending', 'active', 'suspended', 'rejected'],
    default: 'none',
    index: true,
  },
  analystSuspendedAt: {
    type: Date,
    default: null,
  },
  analystSuspendedReason: {
    type: String,
    trim: true,
    default: null,
  },
  analystPostsBlocked: {
    type: Boolean,
    default: false,
  },
  analystMessagesBlocked: {
    type: Boolean,
    default: false,
  },
  analystWarnings: [{
    message: { type: String, trim: true, required: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  }],
  /** Bio pública del analista deportivo. */
  analystDescription: {
    type: String,
    trim: true,
    default: '',
    maxlength: 2000,
  },
  // Indica si es el administrador principal del sistema
  isMainAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  /** Se incrementa al cambiar contraseña para invalidar JWT antiguos */
  tokenVersion: {
    type: Number,
    default: 0,
    min: 0
  },
  /** Aviso legal aceptado por el usuario (obligatorio para usar la plataforma). */
  legalAccepted: {
    type: Boolean,
    default: false,
    index: true
  },
  legalAcceptedAt: {
    type: Date
  },
  /** Bloqueo de participación en comunidad (posts/comentarios). */
  communityBlocked: {
    type: Boolean,
    default: false,
    index: true,
  },
  /** Silencio temporal en comunidad (null = sin silencio). */
  communityMutedUntil: {
    type: Date,
    default: null,
  },
  /** Hash SHA-256 del token de recuperación de contraseña (no almacenar token plano). */
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Middleware pre('save') para actualizar updated_at automáticamente
userSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Middleware pre('findOneAndUpdate') para actualizar updated_at en actualizaciones
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updated_at: Date.now() });
  next();
});

module.exports = mongoose.model('User', userSchema);
