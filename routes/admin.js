const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const Favorites = require('../models/Favorites');
const SimulatorState = require('../models/SimulatorState');
const Bet = require('../models/Bet');
const CommunityPost = require('../models/CommunityPost');
const PostComment = require('../models/PostComment');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const logger = require('../utils/logger');
const { logAnalystAudit } = require('../utils/analystAudit');

/**
 * Middleware para verificar que el usuario es admin principal (no admin_secundario)
 * Valida tanto role === 'admin' como isMainAdmin === true
 */
const checkMainAdmin = async (req, res, next) => {
  try {
    // Obtener el usuario completo desde la base de datos para verificar isMainAdmin
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Verificar que sea admin principal
    if (user.role !== 'admin' || !user.isMainAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Solo el administrador principal puede realizar esta acción.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error en checkMainAdmin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos de administrador'
    });
  }
};

function parseDateStart(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDateEnd(iso) {
  const d = parseDateStart(iso);
  if (!d) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function buildAdminUsersFilter(query) {
  const { role, email, premium, q, createdFrom, createdTo } = query;
  const filter = {};

  if (role && ['usuario', 'admin_secundario', 'admin'].includes(role)) {
    filter.role = role;
  }

  if (email && typeof email === 'string' && email.trim()) {
    filter.email = { $regex: email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }

  if (q && typeof q === 'string' && q.trim()) {
    const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [
      { email: { $regex: escaped, $options: 'i' } },
      { nombre: { $regex: escaped, $options: 'i' } },
      { apellido: { $regex: escaped, $options: 'i' } },
    ];
  }

  if (premium === 'true') filter.premium = true;
  else if (premium === 'false') filter.premium = { $ne: true };

  const from = parseDateStart(createdFrom);
  const to = parseDateEnd(createdTo);
  if (from || to) {
    filter.created_at = {};
    if (from) filter.created_at.$gte = from;
    if (to) filter.created_at.$lte = to;
  }

  return filter;
}

const USER_LIST_SELECT =
  '_id nombre apellido email telefono role isMainAdmin premium premium_since stripe_customer_id stripe_subscription_id tipo plan billingLocked welcomeShown created_at updated_at';

/**
 * GET /api/admin/users
 * Filtros: role, email, premium (true|false), q, createdFrom, createdTo (ISO date)
 */
router.get('/users', auth, checkAdmin, async (req, res) => {
  try {
    const filter = buildAdminUsersFilter(req.query);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 200, 1), 500);

    const users = await User.find(filter)
      .select(USER_LIST_SELECT)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error) {
    logger.error('admin_users_list_error', { message: error.message });
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: error.message,
    });
  }
});

/**
 * GET /api/admin/user/:id
 * Obtener perfil completo de un usuario
 * Solo administradores
 */
router.get('/user/:id', auth, checkAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Obtener datos del usuario
    const user = await User.findById(userId)
      .select('-password_hash')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const userOid = user._id;

    const [favorites, simulatorState, messages, bets, postsCount, commentsCount, lastPost, lastBet] =
      await Promise.all([
        Favorites.findOne({ user_id: userId }).lean(),
        SimulatorState.findOne({ user_id: userId }).lean(),
        Message.find({ user_id: userId })
          .populate('admin_id', 'nombre email')
          .sort({ created_at: -1 })
          .limit(50)
          .lean(),
        Bet.find({ user_id: userId }).sort({ created_at: -1 }).limit(50).lean(),
        CommunityPost.countDocuments({ user: userOid }),
        PostComment.countDocuments({ user: userOid }),
        CommunityPost.findOne({ user: userOid }).sort({ createdAt: -1 }).select('createdAt text').lean(),
        Bet.findOne({ user_id: userId }).sort({ created_at: -1 }).select('created_at').lean(),
      ]);

    const simulatorBets = simulatorState?.apuestas?.length || 0;

    const activity = [];

    activity.push({
      type: 'register',
      label: 'Registro en la plataforma',
      date: user.created_at,
    });

    if (user.premium_since) {
      activity.push({
        type: 'premium',
        label: 'Premium activado',
        date: user.premium_since,
        detail: user.stripe_subscription_id ? 'Stripe' : 'Manual / admin',
      });
    }

    if (user.updated_at && String(user.updated_at) !== String(user.created_at)) {
      activity.push({
        type: 'profile',
        label: 'Última actualización de perfil',
        date: user.updated_at,
      });
    }

    if (lastPost?.createdAt) {
      activity.push({
        type: 'community',
        label: 'Última publicación en comunidad',
        date: lastPost.createdAt,
        detail: (lastPost.text || '').slice(0, 80),
      });
    }

    if (lastBet?.created_at) {
      activity.push({
        type: 'bet',
        label: 'Última apuesta registrada',
        date: lastBet.created_at,
      });
    }

    const recentMessages = (messages || []).slice(0, 5);
    recentMessages.forEach((m) => {
      activity.push({
        type: 'message',
        label: `Mensaje: ${m.titulo}`,
        date: m.created_at,
        detail: m.leido ? 'Leído' : 'No leído',
      });
    });

    activity.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      data: {
        user,
        favorites: favorites || { equipos: [], ligas: [] },
        simulatorState: simulatorState || null,
        messages: messages || [],
        bets: bets || [],
        activity,
        stats: {
          total_messages: messages?.length || 0,
          unread_messages: messages?.filter((m) => !m.leido).length || 0,
          total_bets: bets?.length || 0,
          simulator_bets: simulatorBets,
          community_posts: postsCount,
          community_comments: commentsCount,
        },
      },
    });
  } catch (error) {
    console.error('Error en GET /api/admin/user/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el perfil del usuario',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/user/:id/role
 * Cambiar el rol de un usuario
 * Solo admin principal
 */
router.put('/user/:id/role', auth, checkAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Validar rol
    if (!role || !['usuario', 'admin_secundario', 'analista'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Solo se permiten: usuario, admin_secundario, analista'
      });
    }

    const actor = await User.findById(req.user.id).select('role isMainAdmin');
    if (!actor) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const actorIsMainAdmin = actor.role === 'admin' && actor.isMainAdmin === true;
    if (!actorIsMainAdmin && actor.role === 'admin_secundario') {
      if (!['usuario', 'analista'].includes(role)) {
        return res.status(403).json({
          success: false,
          message: 'Como admin secundario solo puedes asignar rol usuario o analista deportivo.',
        });
      }
    }

    // No permitir cambiar el rol del admin principal
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    if (user.role === 'admin' && userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'No se puede cambiar el rol del administrador principal'
      });
    }

    // No permitir cambiar tu propio rol
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol'
      });
    }

    const previousRole = user.role;

    user.role = role;
    if (role === 'analista') {
      if (!user.analystVerifiedAt) user.analystVerifiedAt = new Date();
      if (!user.analystStatus || user.analystStatus === 'none' || user.analystStatus === 'pending') {
        user.analystStatus = 'active';
      }
    }
    if (role !== 'analista') {
      user.analystVerifiedAt = null;
      user.analystStatus = 'none';
    }
    await user.save();

    await logAnalystAudit({
      action: 'role_changed',
      analystId: role === 'analista' ? user._id : null,
      actorId: req.user.id,
      targetUserId: user._id,
      details: { previousRole, newRole: role },
      ip: req.ip,
    }).catch(() => {});

    logger.info('admin_role_changed', {
      targetUserId: String(userId),
      previousRole,
      newRole: role,
      actorId: String(req.user.id),
      ip: req.ip,
      endpoint: `${req.method} ${req.baseUrl}${req.path}`,
    });

    res.json({
      success: true,
      message: `Rol del usuario actualizado a ${role}`,
      data: {
        user_id: user._id,
        nombre: user.nombre,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('admin_role_update_error', { message: error.message, userId: req.params?.id });
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el rol del usuario',
      error: error.message
    });
  }
});

/**
 * PUT /api/admin/user/:id/premium
 * Activar o desactivar premium manualmente (solo admin principal).
 */
router.put('/user/:id/premium', auth, checkMainAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { premium } = req.body;

    if (typeof premium !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'El campo premium debe ser true o false',
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }

    if (user.isMainAdmin && user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'No se puede modificar el premium del administrador principal',
      });
    }

    if (user.billingLocked === true || user.tipo === 'familia' || user.plan === 'free-family') {
      return res.status(403).json({
        success: false,
        message: 'No se puede modificar el premium de una cuenta familiar con facturación bloqueada',
      });
    }

    const wasPremium = user.premium === true;

    if (premium) {
      const set = { premium: true, updated_at: new Date() };
      if (!user.premium_since) set.premium_since = new Date();
      await User.updateOne({ _id: userId }, { $set: set });
    } else {
      await User.updateOne(
        { _id: userId },
        {
          $set: { premium: false, updated_at: new Date() },
          $unset: { stripe_subscription_id: '' },
        }
      );
    }

    logger.info('admin_premium_toggled', {
      targetUserId: String(userId),
      email: user.email,
      previousPremium: wasPremium,
      newPremium: premium,
      actorId: String(req.user.id),
      ip: req.ip,
    });

    const updated = await User.findById(userId)
      .select(USER_LIST_SELECT)
      .lean();

    res.json({
      success: true,
      message: premium ? 'Premium activado manualmente' : 'Premium desactivado',
      data: updated,
    });
  } catch (error) {
    logger.error('admin_premium_toggle_error', { message: error.message, userId: req.params?.id });
    res.status(500).json({
      success: false,
      message: 'Error al actualizar premium',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/admin/user/:id
 * Eliminar un usuario
 * Solo admin principal
 */
router.delete('/user/:id', auth, checkMainAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // No permitir eliminar al admin principal
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes eliminar tu propia cuenta'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    // Eliminar datos relacionados
    await Promise.all([
      Favorites.deleteMany({ user_id: userId }),
      SimulatorState.deleteMany({ user_id: userId }),
      Message.deleteMany({ user_id: userId }),
      Message.deleteMany({ admin_id: userId }),
      Bet.deleteMany({ user_id: userId })
    ]);

    // Eliminar usuario
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    console.error('Error en DELETE /api/admin/user/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar el usuario',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/messages/bulk
 * Enviar mensaje a múltiples usuarios
 * Solo admin principal
 */
router.post('/messages/bulk', auth, checkMainAdmin, async (req, res) => {
  try {
    const { user_ids, titulo, contenido } = req.body;

    // Validar campos
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debes proporcionar una lista de user_ids'
      });
    }

    if (!titulo || !titulo.trim() || !contenido || !contenido.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El título y el contenido son requeridos'
      });
    }

    const adminId = req.user.id;

    // Verificar que todos los usuarios existen
    const users = await User.find({ _id: { $in: user_ids } });
    if (users.length !== user_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Algunos usuarios no existen'
      });
    }

    // Crear mensajes
    const messages = user_ids.map(userId => ({
      user_id: userId,
      admin_id: adminId,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      leido: false
    }));

    await Message.insertMany(messages);

    res.json({
      success: true,
      message: `Mensaje enviado a ${messages.length} usuario(s)`,
      data: {
        sent_count: messages.length,
        user_ids: user_ids
      }
    });
  } catch (error) {
    console.error('Error en POST /api/admin/messages/bulk:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensajes masivos',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/messages/broadcast
 * Enviar mensaje a TODOS los usuarios
 * Solo admin principal
 * USAR CON CUIDADO
 */
router.post('/messages/broadcast', auth, checkMainAdmin, async (req, res) => {
  try {
    const { titulo, contenido } = req.body;

    if (!titulo || !titulo.trim() || !contenido || !contenido.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El título y el contenido son requeridos'
      });
    }

    const adminId = req.user.id;

    // Obtener todos los usuarios (excepto administradores)
    const users = await User.find({ role: 'usuario' }).select('_id');

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay usuarios para enviar el mensaje'
      });
    }

    // Crear mensajes
    const messages = users.map(user => ({
      user_id: user._id,
      admin_id: adminId,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      leido: false
    }));

    await Message.insertMany(messages);

    res.json({
      success: true,
      message: `Mensaje broadcast enviado a ${messages.length} usuario(s)`,
      data: {
        sent_count: messages.length
      }
    });
  } catch (error) {
    console.error('Error en POST /api/admin/messages/broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar mensaje broadcast',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/stats
 * Obtener estadísticas globales del sistema
 * Solo administradores
 */
router.get('/stats', auth, checkAdmin, async (req, res) => {
  try {
    const [totalUsers, totalAdmins, totalMessages, unreadMessages, totalBets] = await Promise.all([
      User.countDocuments({ role: 'usuario' }),
      User.countDocuments({ role: { $in: ['admin', 'admin_secundario'] } }),
      Message.countDocuments(),
      Message.countDocuments({ leido: false }),
      Bet.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        total_admins: totalAdmins,
        total_messages: totalMessages,
        unread_messages: unreadMessages,
        total_bets: totalBets
      }
    });
  } catch (error) {
    console.error('Error en GET /api/admin/stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

module.exports = router;
