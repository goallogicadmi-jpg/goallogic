const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const logger = require('../utils/logger');
const { buildFamilyUserFields, FAMILY_TIPO, FAMILY_PLAN } = require('../utils/familyUser');
const { sanitizeEmail } = require('../utils/authSanitize');
const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = require('../utils/passwordPolicy');

const router = express.Router();

const checkMainAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }
    if (user.role !== 'admin' || !user.isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador principal puede gestionar cuentas familiares',
      });
    }
    next();
  } catch (error) {
    logger.error('family_check_main_admin_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al verificar permisos' });
  }
};

const FAMILY_USER_SELECT =
  '_id nombre apellido email telefono tipo plan premium billingLocked welcomeShown premium_since created_at updated_at';

function mapFamilyUserResponse(user) {
  return {
    _id: user._id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    telefono: user.telefono,
    tipo: user.tipo,
    plan: user.plan,
    premium: user.premium === true,
    billingLocked: user.billingLocked === true,
    welcomeShown: user.welcomeShown === true,
    premium_since: user.premium_since,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * GET /api/admin/family/users
 */
router.get('/users', auth, checkAdmin, checkMainAdmin, async (req, res) => {
  try {
    const users = await User.find({ tipo: FAMILY_TIPO })
      .select(FAMILY_USER_SELECT)
      .sort({ created_at: -1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      data: users.map(mapFamilyUserResponse),
      total: users.length,
    });
  } catch (error) {
    logger.error('family_users_list_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al listar usuarios familiares' });
  }
});

/**
 * POST /api/admin/family/users
 * Body: { nombre, apellido, email, telefono, password }
 */
router.post('/users', auth, checkAdmin, checkMainAdmin, async (req, res) => {
  try {
    const { nombre, apellido, telefono, password } = req.body || {};
    let email;

    try {
      email = sanitizeEmail(req.body?.email);
    } catch {
      return res.status(400).json({ success: false, message: 'Email inválido' });
    }

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre es obligatorio' });
    }
    if (!telefono || typeof telefono !== 'string' || !telefono.trim()) {
      return res.status(400).json({ success: false, message: 'El teléfono es obligatorio' });
    }
    if (
      !password ||
      typeof password !== 'string' ||
      password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const familyFields = buildFamilyUserFields();

    const newUser = new User({
      nombre: nombre.trim(),
      apellido: (apellido || '').trim(),
      telefono: telefono.trim(),
      email,
      password_hash,
      role: 'usuario',
      tokenVersion: 0,
      legalAccepted: false,
      ...familyFields,
    });

    await newUser.save();

    logger.info('family_user_created', {
      userId: String(newUser._id),
      email: newUser.email,
      actorId: String(req.user.id),
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Usuario familiar creado con acceso gratuito permanente',
      data: mapFamilyUserResponse(newUser.toObject()),
    });
  } catch (error) {
    logger.error('family_user_create_error', { message: error.message });
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'El email ya está registrado' });
    }
    res.status(500).json({ success: false, message: 'Error al crear usuario familiar' });
  }
});

module.exports = router;
