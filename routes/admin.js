const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const Favorites = require('../models/Favorites');
const SimulatorState = require('../models/SimulatorState');
const Bet = require('../models/Bet');
const auth = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');
const logger = require('../utils/logger');

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

/**
 * GET /api/admin/users
 * Obtener lista de usuarios
 * Solo administradores
 */
router.get('/users', auth, checkAdmin, async (req, res) => {
  try {
    const { role } = req.query;
    
    // Construir filtro
    const filter = {};
    if (role && (role === 'usuario' || role === 'admin_secundario')) {
      filter.role = role;
    }

    // Obtener usuarios con campos específicos
    const users = await User.find(filter)
      .select('_id nombre email telefono role created_at')
      .sort({ created_at: -1 })
      .lean();

    res.json({
      success: true,
      data: users,
      total: users.length
    });
  } catch (error) {
    console.error('Error en GET /api/admin/users:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de usuarios',
      error: error.message
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

    // Obtener datos relacionados en paralelo
    const [favorites, simulatorState, messages, bets] = await Promise.all([
      Favorites.findOne({ user_id: userId }).lean(),
      SimulatorState.findOne({ user_id: userId }).lean(),
      Message.find({ user_id: userId })
        .populate('admin_id', 'nombre email')
        .sort({ created_at: -1 })
        .limit(50)
        .lean(),
      Bet.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(50)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        user,
        favorites: favorites || { equipos: [], ligas: [] },
        simulatorState: simulatorState || null,
        messages: messages || [],
        bets: bets || [],
        stats: {
          total_messages: messages?.length || 0,
          unread_messages: messages?.filter(m => !m.leido).length || 0,
          total_bets: bets?.length || 0
        }
      }
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
router.put('/user/:id/role', auth, checkMainAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    // Validar rol
    if (!role || (role !== 'usuario' && role !== 'admin_secundario')) {
      return res.status(400).json({
        success: false,
        message: 'Rol inválido. Solo se permiten: usuario, admin_secundario'
      });
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

    // Actualizar rol
    user.role = role;
    await user.save();

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
