const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Favorites = require('../models/Favorites');
const SimulatorState = require('../models/SimulatorState');
const auth = require('../middleware/auth');
const { authJwt } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { sanitizeRegisterBody, sanitizeLoginBody, sanitizeEmail } = require('../utils/authSanitize');
const { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } = require('../utils/passwordPolicy');
const metrics = require('../utils/metrics');
const { mongoUriHint, stripeApiModeFromEnv } = require('../utils/mongoUriHint');
const { isFamilyUser } = require('../utils/familyUser');
const { buildTrialFieldsForNewUser, serializePlanStatus } = require('../utils/planAccess');
const { deleteCloudinaryImageByUrl, isCloudinaryAssetUrl } = require('../utils/cloudinaryAvatar');
const { buildUniquePublicId, ensureUserPublicId } = require('../utils/publicId');
const { expireTrialIfNeeded } = require('../utils/trialService');
const { trySendFirstLoginGuideMessage } = require('../utils/automatedMessageTriggers');

const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados registros. Intenta en un minuto.' },
});

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión. Espera un minuto.' },
});

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

function serializeAuthUserFields(user) {
  const planStatus = serializePlanStatus(user);
  return {
    tipo: user.tipo || 'usuario',
    plan: planStatus.plan,
    billingLocked: user.billingLocked === true || isFamilyUser(user),
    welcomeShown: user.welcomeShown === true,
    trialActive: planStatus.trialActive,
    trialEndsAt: planStatus.trialEndsAt,
    trialDaysRemaining: planStatus.trialDaysRemaining,
    hasProAccess: planStatus.hasProAccess,
    trialExpiredAcknowledged: planStatus.trialExpiredAcknowledged,
    showTrialExpiredModal: planStatus.showTrialExpiredModal,
    limits: planStatus.limits,
    features: planStatus.features,
  };
}

/**
 * POST /api/auth/register
 * Registra un nuevo usuario
 * Body: { nombre, apellido, telefono, email, password, pais, ciudad, direccion, codigo_postal }
 * Retorna: { message, user_id, userId }
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    let nombre;
    let apellido;
    let telefono;
    let email;
    let password;
    let pais;
    let ciudad;
    let direccion;
    let codigo_postal;

    try {
      ({
        nombre,
        apellido,
        telefono,
        email,
        password,
        pais,
        ciudad,
        direccion,
        codigo_postal,
      } = sanitizeRegisterBody(req.body));
    } catch (sanErr) {
      const code = sanErr.statusCode || 400;
      return res.status(code).json({
        success: false,
        message: sanErr.message || 'Datos inválidos',
      });
    }

    // Verificar si el email ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    // Hashear la contraseña con bcrypt (salt rounds: 10)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Crear nuevo usuario con trial gratuito de 15 días (sin tarjeta)
    const trialFields = buildTrialFieldsForNewUser();
    const publicId = await buildUniquePublicId(nombre.trim(), apellido.trim());
    const newUser = new User({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      telefono: telefono.trim(),
      email: email.toLowerCase().trim(),
      password_hash: password_hash,
      pais: pais.trim(),
      ciudad: ciudad.trim(),
      direccion: direccion.trim(),
      codigo_postal: codigo_postal.trim(),
      tokenVersion: 0,
      publicId,
      ...trialFields,
    });

    await newUser.save();

    const userIdStr = newUser._id.toString();

    const { sendWelcomeEmail } = require('../utils/sendWelcomeEmail');
    sendWelcomeEmail(newUser).catch((mailErr) => {
      logger.error('welcome_email_error', {
        message: mailErr.message,
        toHint: newUser.email.replace(/(^.).*(@.*$)/, '$1***$2'),
      });
    });

    // Retornar respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      user_id: newUser._id,
      userId: userIdStr
    });

  } catch (error) {
    console.error('❌ Error en registro de usuario:', error);

    // Manejar errores de MongoDB
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'El email ya está registrado'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Datos de usuario inválidos',
        errors: error.errors
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al registrar usuario'
    });
  }
});

/**
 * POST /api/auth/login
 * Autentica un usuario y genera un token JWT
 * Body: { email, password }
 * Retorna: { token }
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    let email;
    let password;
    try {
      ({ email, password } = sanitizeLoginBody(req.body));
    } catch (sanErr) {
      const code = sanErr.statusCode || 400;
      return res.status(code).json({
        success: false,
        message: sanErr.message || 'Datos inválidos',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      metrics.incLoginFailed();
      logger.security('auth_login_failed', {
        reason: 'user_not_found',
        emailHint: email.replace(/(^.).*(@.*$)/, '$1***$2'),
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      metrics.incLoginFailed();
      logger.security('auth_login_failed', {
        reason: 'bad_password',
        userId: String(user._id),
        ip: req.ip,
      });
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas'
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.critical('auth_jwt_secret_missing_at_login', { ip: req.ip });
      return res.status(500).json({
        success: false,
        message: 'Error de configuración del servidor'
      });
    }

    const tokenVersion = user.tokenVersion ?? 0;
    const payload = {
      user_id: user._id.toString(),
      role: user.role || 'usuario',
      isMainAdmin: user.isMainAdmin || false,
      tv: tokenVersion,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    logger.info('auth_login_success', {
      userId: String(user._id),
      email: user.email,
      role: user.role || 'usuario',
      ip: req.ip,
    });

    ensureUserPublicId(user).catch((err) => {
      logger.error('ensure_public_id_login_error', { userId: String(user._id), message: err.message });
    });

    trySendFirstLoginGuideMessage(user._id).catch((msgErr) => {
      logger.error('first_login_guide_message_error', {
        message: msgErr.message,
        userId: String(user._id),
      });
    });

    res.json({
      success: true,
      token: token,
      user: {
        id: user._id.toString(),
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role || 'usuario',
        isMainAdmin: user.isMainAdmin || false,
        premium: user.premium === true,
        legalAccepted: user.legalAccepted === true,
        ...serializeAuthUserFields(user),
      }
    });

  } catch (error) {
    logger.error('auth_login_error', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al autenticar usuario'
    });
  }
});

/**
 * POST /api/auth/change-password
 * Cambia la contraseña e invalida sesiones anteriores (incrementa tokenVersion).
 */
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Contraseña actual y nueva son requeridas',
      });
    }
    if (
      typeof newPassword !== 'string' ||
      newPassword.length < MIN_PASSWORD_LENGTH ||
      newPassword.length > MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `La nueva contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`,
      });
    }
    if (/[<>{}$]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'La nueva contraseña contiene caracteres no permitidos',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password_hash);
    if (!ok) {
      logger.warn('auth_change_password_failed', { userId: String(user._id), ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Contraseña actual incorrecta',
      });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await user.save();

    logger.info('auth_password_changed', { userId: String(user._id), ip: req.ip });

    res.json({
      success: true,
      message: 'Contraseña actualizada. Vuelve a iniciar sesión en todos tus dispositivos.',
    });
  } catch (error) {
    logger.error('auth_change_password_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al cambiar la contraseña' });
  }
});

/**
 * GET /api/auth/session
 * Datos mínimos de sesión (JWT sin exigir premium). Incluye legalAccepted.
 */
router.get('/session', authJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select(
        'nombre apellido email foto_perfil_url role isMainAdmin premium legalAccepted legalAcceptedAt tipo plan billingLocked welcomeShown trialActive trialEndsAt trialExpiredAcknowledged'
      )
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    res.json({
      success: true,
      user: {
        id: String(user._id),
        user_id: String(user._id),
        nombre: user.nombre || null,
        apellido: user.apellido || null,
        email: user.email,
        foto_perfil_url: user.foto_perfil_url || null,
        role: user.role || 'usuario',
        isMainAdmin: user.isMainAdmin || false,
        premium: user.premium === true,
        legalAccepted: user.legalAccepted === true,
        legalAcceptedAt: user.legalAcceptedAt || null,
        ...serializeAuthUserFields(user),
      },
    });
  } catch (error) {
    logger.error('auth_session_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al obtener sesión' });
  }
});

/**
 * POST /api/auth/accept-legal
 * Registra la aceptación del aviso legal (obligatorio antes de usar la plataforma).
 */
router.post('/accept-legal', authJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.legalAccepted === true) {
      return res.json({
        success: true,
        message: 'Aviso legal ya aceptado',
        legalAccepted: true,
        legalAcceptedAt: user.legalAcceptedAt,
      });
    }

    user.legalAccepted = true;
    user.legalAcceptedAt = new Date();
    await user.save();

    logger.info('auth_legal_accepted', { ip: req.ip });

    res.json({
      success: true,
      message: 'Aviso legal aceptado',
      legalAccepted: true,
      legalAcceptedAt: user.legalAcceptedAt,
    });
  } catch (error) {
    logger.error('auth_accept_legal_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al registrar aceptación' });
  }
});

/**
 * POST /api/auth/welcome-shown
 * Marca el modal de bienvenida (trial o familia) como visto.
 */
router.post('/welcome-shown', authJwt, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.welcomeShown === true) {
      return res.json({
        success: true,
        welcomeShown: true,
        message: 'Bienvenida ya registrada',
      });
    }

    user.welcomeShown = true;
    await user.save();

    logger.info('auth_welcome_shown', {
      userId: String(user._id),
      tipo: user.tipo,
      ip: req.ip,
    });

    res.json({
      success: true,
      welcomeShown: true,
      message: 'Bienvenida registrada',
    });
  } catch (error) {
    logger.error('auth_welcome_shown_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al registrar bienvenida' });
  }
});

/**
 * GET /api/auth/me
 * Obtiene el perfil completo del usuario autenticado
 * Requiere: token válido en header Authorization
 * Retorna: { user, favorites, simulator_state }
 * 
 * Optimizado para realizar consultas paralelas y manejar valores por defecto
 */
router.get('/me', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente (debe venir del middleware auth)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    let userRecord = await User.findById(userId)
      .select(
        'nombre apellido email telefono pais ciudad direccion codigo_postal idioma timezone equipo_favorito ligas_favoritas foto_perfil_url role isMainAdmin premium legalAccepted legalAcceptedAt tipo plan billingLocked welcomeShown trialActive trialEndsAt trialExpiredAcknowledged created_at updated_at'
      )
      .lean();

    userRecord = await expireTrialIfNeeded(userRecord);

    const MAX_SIMULATOR_APUESTAS_ME = 200;
    const MAX_FAVORITES_ITEMS_ME = 400;

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    const user = userRecord;

    const [favorites, simulatorState] = await Promise.all([
      Favorites.findOne({ user_id: userId }).lean(),
      SimulatorState.findOne({ user_id: userId }).lean(),
    ]);

    logger.info('auth_me_db_read', {
      premium: user.premium === true,
      plan: user.plan,
      trialActive: user.trialActive,
      stripeMode: stripeApiModeFromEnv(),
      mongoUriHint: mongoUriHint(),
    });

    // Preparar valores por defecto para favoritos
    const sliceEnd = (arr, max) => {
      if (!Array.isArray(arr) || arr.length <= max) return arr || [];
      return arr.slice(-max);
    };

    const favoritesData = favorites
      ? {
          equipos: sliceEnd(favorites.equipos, MAX_FAVORITES_ITEMS_ME),
          ligas: sliceEnd(favorites.ligas, MAX_FAVORITES_ITEMS_ME),
          updated_at: favorites.updated_at,
        }
      : {
          equipos: [],
          ligas: [],
          updated_at: null,
        };

    const apuestasRaw = simulatorState?.apuestas || [];
    const apuestasLimited = Array.isArray(apuestasRaw)
      ? apuestasRaw.slice(-MAX_SIMULATOR_APUESTAS_ME)
      : [];

    const simulatorData = simulatorState
      ? {
          capital_inicial: simulatorState.capital_inicial || 1000,
          capital_actual: simulatorState.capital_actual || 1000,
          apuestas: apuestasLimited,
          updated_at: simulatorState.updated_at,
        }
      : {
          capital_inicial: 1000,
          capital_actual: 1000,
          apuestas: [],
          updated_at: null,
        };

    // Retornar perfil completo
    res.json({
      success: true,
      user: {
        user_id: user._id,
        nombre: user.nombre || null,
        apellido: user.apellido || null,
        telefono: user.telefono || null,
        email: user.email,
        foto_perfil_url: user.foto_perfil_url || null,
        pais: user.pais || null,
        ciudad: user.ciudad || null,
        direccion: user.direccion || null,
        codigo_postal: user.codigo_postal || null,
        idioma: user.idioma || 'es',
        timezone: user.timezone || null,
        equipo_favorito: user.equipo_favorito || null,
        ligas_favoritas: sliceEnd(user.ligas_favoritas, 80),
        role: user.role || 'usuario',
        isMainAdmin: user.isMainAdmin || false,
        premium: user.premium === true,
        legalAccepted: user.legalAccepted === true,
        legalAcceptedAt: user.legalAcceptedAt || null,
        ...serializeAuthUserFields(user),
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      favorites: favoritesData,
      simulator_state: simulatorData
    });

  } catch (error) {
    logger.error('auth_me_error', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener perfil del usuario'
    });
  }
});

/**
 * PUT /api/auth/profile/photo
 * Guarda la URL del avatar (Cloudinary) del usuario autenticado.
 */
router.put('/profile/photo', authJwt, async (req, res) => {
  try {
    const { foto_perfil_url: rawUrl } = req.body || {};
    const foto_perfil_url = typeof rawUrl === 'string' ? rawUrl.trim() : '';

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (!foto_perfil_url) {
      const previousUrl = user.foto_perfil_url;
      user.foto_perfil_url = null;
      await user.save();

      if (previousUrl) {
        deleteCloudinaryImageByUrl(previousUrl).catch(() => {});
      }

      return res.json({
        success: true,
        message: 'Foto de perfil eliminada',
        foto_perfil_url: null,
      });
    }

    if (!isCloudinaryAssetUrl(foto_perfil_url)) {
      return res.status(400).json({
        success: false,
        message: 'La URL debe ser una imagen válida subida a Cloudinary.',
      });
    }

    const previousUrl = user.foto_perfil_url;
    user.foto_perfil_url = foto_perfil_url;
    await user.save();

    if (previousUrl && previousUrl !== foto_perfil_url) {
      deleteCloudinaryImageByUrl(previousUrl).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Foto de perfil actualizada',
      foto_perfil_url: user.foto_perfil_url,
    });
  } catch (error) {
    logger.error('auth_profile_photo_error', { message: error.message });
    res.status(500).json({ success: false, message: 'Error al guardar foto de perfil' });
  }
});

const GENERIC_RESET_RESPONSE = {
  success: true,
  message:
    'Si el correo existe en nuestro sistema, enviaremos instrucciones para restablecer tu contraseña.',
};

const passwordResetRequestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intenta en un minuto.',
    });
  },
});

const passwordResetActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Demasiadas solicitudes. Intenta en un minuto.',
    });
  },
});

function validateNewPassword(password) {
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return `La contraseña debe tener entre ${MIN_PASSWORD_LENGTH} y ${MAX_PASSWORD_LENGTH} caracteres`;
  }
  if (/[<>{}$]/.test(password)) {
    return 'La contraseña contiene caracteres no permitidos';
  }
  return null;
}

async function findUserByResetToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const {
    hashResetToken,
    isResetTokenExpired,
  } = require('../utils/passwordReset');
  const tokenHash = hashResetToken(rawToken.trim());
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
  }).select('+resetPasswordToken +resetPasswordExpires');

  if (!user || isResetTokenExpired(user.resetPasswordExpires)) {
    return null;
  }
  return user;
}

/**
 * POST /api/auth/request-password-reset
 */
router.post('/request-password-reset', passwordResetRequestLimiter, async (req, res) => {
  try {
    const { email: rawEmail } = req.body || {};
    let email;
    try {
      email = sanitizeEmail(rawEmail);
    } catch {
      return res.status(200).json(GENERIC_RESET_RESPONSE);
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json(GENERIC_RESET_RESPONSE);
    }

    const {
      generateResetToken,
      hashResetToken,
      getResetExpiresAt,
    } = require('../utils/passwordReset');
    const { sendPasswordResetEmail } = require('../utils/sendPasswordResetEmail');

    const rawToken = generateResetToken();
    user.resetPasswordToken = hashResetToken(rawToken);
    user.resetPasswordExpires = getResetExpiresAt();
    await user.save();

    try {
      await sendPasswordResetEmail(user, rawToken);
    } catch (mailErr) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      logger.error('password_reset_email_error', { message: mailErr.message });
    }

    return res.status(200).json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    logger.error('auth_request_password_reset_error', { message: error.message });
    return res.status(200).json(GENERIC_RESET_RESPONSE);
  }
});

/**
 * POST /api/auth/verify-reset-token
 */
router.post('/verify-reset-token', passwordResetActionLimiter, async (req, res) => {
  try {
    const { token } = req.body || {};
    const user = await findUserByResetToken(token);
    return res.json({ success: true, valid: Boolean(user) });
  } catch (error) {
    logger.error('auth_verify_reset_token_error', { message: error.message });
    return res.json({ success: true, valid: false });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', passwordResetActionLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};
    const passwordError = validateNewPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ success: false, message: passwordError });
    }

    const user = await findUserByResetToken(token);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'El enlace de recuperación no es válido o ha expirado',
      });
    }

    user.password_hash = await bcrypt.hash(newPassword, 10);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    logger.info('auth_password_reset_completed', { ip: req.ip });

    return res.json({
      success: true,
      message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.',
    });
  } catch (error) {
    logger.error('auth_reset_password_error', { message: error.message });
    return res.status(500).json({
      success: false,
      message: 'Error al restablecer la contraseña',
    });
  }
});

module.exports = router;
