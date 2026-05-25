const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { authJwt } = require('../middleware/auth');
const checkAdmin = require('../middleware/checkAdmin');

/**
 * POST /api/messages/send
 * Enviar un mensaje a un usuario
 * Solo administradores pueden enviar mensajes
 */
router.post('/send', auth, checkAdmin, async (req, res) => {
  try {
    const { user_id, titulo, contenido } = req.body;
    const admin_id = req.user.id; // ID del administrador autenticado

    // Validar campos requeridos
    if (!user_id || !titulo || !contenido) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: user_id, titulo, contenido'
      });
    }

    // Validar que el título y contenido no estén vacíos
    if (!titulo.trim() || !contenido.trim()) {
      return res.status(400).json({
        success: false,
        message: 'El título y el contenido no pueden estar vacíos'
      });
    }

    // Verificar que el usuario receptor existe
    const userExists = await User.findById(user_id);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'Usuario receptor no encontrado'
      });
    }

    // Verificar que no se está enviando un mensaje a sí mismo
    if (user_id === admin_id) {
      return res.status(400).json({
        success: false,
        message: 'No puedes enviarte un mensaje a ti mismo'
      });
    }

    // Crear el mensaje
    const newMessage = new Message({
      user_id,
      admin_id,
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      leido: false
    });

    await newMessage.save();

    // Poblar datos del administrador para la respuesta
    await newMessage.populate('admin_id', 'nombre email');

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: newMessage
    });
  } catch (error) {
    console.error('Error en POST /api/messages/send:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/inbox
 * Obtener todos los mensajes del usuario autenticado
 * Ordenados por fecha descendente (más recientes primero)
 */
router.get('/inbox', authJwt, async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener todos los mensajes del usuario, ordenados por fecha descendente
    const messages = await Message.find({ user_id: userId })
      .populate('admin_id', 'nombre email')
      .sort({ created_at: -1 })
      .lean();

    // Contar mensajes no leídos
    const unreadCount = await Message.countDocuments({
      user_id: userId,
      leido: false
    });

    res.json({
      success: true,
      data: {
        messages,
        unread_count: unreadCount,
        total: messages.length
      }
    });
  } catch (error) {
    console.error('Error en GET /api/messages/inbox:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los mensajes',
      error: error.message
    });
  }
});

/**
 * PUT /api/messages/mark-read/:id
 * Marcar un mensaje como leído
 * Solo el usuario receptor puede marcar como leído
 */
router.put('/mark-read/:id', auth, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Buscar el mensaje
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensaje no encontrado'
      });
    }

    // Verificar que el mensaje pertenece al usuario autenticado
    if (message.user_id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para marcar este mensaje como leído'
      });
    }

    // Marcar como leído
    message.leido = true;
    await message.save();

    res.json({
      success: true,
      message: 'Mensaje marcado como leído',
      data: message
    });
  } catch (error) {
    console.error('Error en PUT /api/messages/mark-read/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar el mensaje como leído',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/admin/sent
 * Obtener todos los mensajes enviados por el administrador autenticado
 * Útil para el panel de administradores
 */
router.get('/admin/sent', auth, checkAdmin, async (req, res) => {
  try {
    const adminId = req.user.id;

    // Obtener todos los mensajes enviados por el administrador
    const messages = await Message.find({ admin_id: adminId })
      .populate('user_id', 'nombre email')
      .sort({ created_at: -1 })
      .lean();

    // Estadísticas
    const totalSent = messages.length;
    const readCount = messages.filter(m => m.leido).length;
    const unreadCount = totalSent - readCount;

    res.json({
      success: true,
      data: {
        messages,
        stats: {
          total: totalSent,
          read: readCount,
          unread: unreadCount
        }
      }
    });
  } catch (error) {
    console.error('Error en GET /api/messages/admin/sent:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los mensajes enviados',
      error: error.message
    });
  }
});

module.exports = router;
