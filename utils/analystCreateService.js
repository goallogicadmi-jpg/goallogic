const bcrypt = require('bcrypt');
const User = require('../models/User');
const Bet = require('../models/Bet');
const { buildUniquePublicId } = require('./publicId');
const { logAnalystAudit } = require('./analystAudit');
const { sanitizeEmail } = require('./authSanitize');
const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = require('./passwordPolicy');
const crypto = require('crypto');

const VALID_MERCADOS = ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'];
const VALID_MODELOS = ['xG', 'Poisson', 'Mixto'];
const VALID_RESULTADOS = ['pendiente', 'ganada', 'perdida', 'nula'];

function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url').slice(0, 12);
}

function normalizeInitialBets(bets) {
  if (!Array.isArray(bets)) return [];
  return bets
    .map((bet) => ({
      partido: String(bet.partido || '').trim(),
      mercado: VALID_MERCADOS.includes(bet.mercado) ? bet.mercado : 'Resultado',
      seleccion: String(bet.seleccion || bet.mercado || 'Local').trim(),
      cuota: Number(bet.cuota),
      stake: Number(bet.stake),
      modelo_analisis: VALID_MODELOS.includes(bet.modelo_analisis) ? bet.modelo_analisis : 'Mixto',
      confianza: Math.min(5, Math.max(1, parseInt(bet.confianza, 10) || 3)),
      resultado: VALID_RESULTADOS.includes(bet.resultado) ? bet.resultado : 'ganada',
      created_at: bet.created_at ? new Date(bet.created_at) : new Date(),
    }))
    .filter((bet) => bet.partido && bet.cuota > 0 && bet.stake > 0);
}

async function createAnalystAccount({
  nombre,
  apellido = '',
  email,
  pais = '',
  foto_perfil_url = '',
  analystDescription = '',
  analystSubscriptionPriceCents = null,
  analystStripePriceId = '',
  password,
  initialBets = [],
  actorId,
  ip,
  verified = true,
}) {
  const cleanName = String(nombre || '').trim();
  if (!cleanName) {
    const err = new Error('El nombre es obligatorio.');
    err.status = 400;
    throw err;
  }

  let cleanEmail;
  try {
    cleanEmail = sanitizeEmail(email);
  } catch {
    const err = new Error('Email inválido.');
    err.status = 400;
    throw err;
  }

  const exists = await User.findOne({ email: cleanEmail }).lean();
  if (exists) {
    const err = new Error('El email ya está registrado.');
    err.status = 409;
    throw err;
  }

  const plainPassword = password || generateTempPassword();
  if (
    plainPassword.length < MIN_PASSWORD_LENGTH ||
    plainPassword.length > MAX_PASSWORD_LENGTH
  ) {
    const err = new Error(`La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres.`);
    err.status = 400;
    throw err;
  }

  const publicId = await buildUniquePublicId(cleanName, apellido);
  const password_hash = await bcrypt.hash(plainPassword, 10);

  let priceCents = null;
  if (analystSubscriptionPriceCents != null && analystSubscriptionPriceCents !== '') {
    priceCents = parseInt(analystSubscriptionPriceCents, 10);
    if (Number.isNaN(priceCents) || priceCents < 0) {
      const err = new Error('Precio mensual inválido.');
      err.status = 400;
      throw err;
    }
  }

  const user = await User.create({
    nombre: cleanName,
    apellido: String(apellido || '').trim(),
    telefono: '0000000000',
    email: cleanEmail,
    password_hash,
    pais: String(pais || '').trim(),
    ciudad: '',
    direccion: '',
    codigo_postal: '',
    foto_perfil_url: String(foto_perfil_url || '').trim() || undefined,
    analystDescription: String(analystDescription || '').trim(),
    publicId,
    role: 'analista',
    analystStatus: 'active',
    analystVerifiedAt: verified ? new Date() : null,
    analystSubscriptionPriceCents: priceCents,
    analystStripePriceId: String(analystStripePriceId || '').trim() || null,
    legalAccepted: true,
    legalAcceptedAt: new Date(),
  });

  const bets = normalizeInitialBets(initialBets);
  if (bets.length) {
    await Bet.insertMany(
      bets.map((bet) => ({
        ...bet,
        user_id: user._id,
      }))
    );
  }

  await logAnalystAudit({
    action: 'analyst_created',
    analystId: user._id,
    actorId,
    targetUserId: user._id,
    details: {
      publicId,
      initialBetsCount: bets.length,
      verified,
    },
    ip,
  });

  return {
    id: user._id,
    nombre: user.nombre,
    email: user.email,
    publicId,
    temporaryPassword: password ? null : plainPassword,
    initialBetsCount: bets.length,
  };
}

module.exports = {
  createAnalystAccount,
  normalizeInitialBets,
};
