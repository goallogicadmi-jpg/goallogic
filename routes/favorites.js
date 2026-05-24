const express = require('express');
const auth = require('../middleware/auth');
const Favorites = require('../models/Favorites');

const router = express.Router();

/**
 * GET /api/favorites
 * Obtiene los favoritos del usuario autenticado
 * Requiere: token válido en header Authorization
 * Retorna: { success, favorites }
 */
router.get('/', auth, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    // Buscar favoritos
    let favorites = await Favorites.findOne({ user_id: userId });

    // Si no existe, crear uno con valores por defecto
    if (!favorites) {
      favorites = new Favorites({
        user_id: userId,
        equipos: [],
        ligas: []
      });
      await favorites.save();
    }

    res.json({
      success: true,
      favorites: {
        equipos: favorites.equipos || [],
        ligas: favorites.ligas || [],
        updated_at: favorites.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener favoritos'
    });
  }
});

/**
 * POST /api/favorites
 * Reemplaza los favoritos completos del usuario
 * Requiere: token válido en header Authorization
 * Body: { equipos: [], ligas: [] }
 * Retorna: { success, favorites }
 */
router.post('/', auth, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const { equipos, ligas } = req.body;

    // Validar que equipos y ligas sean arrays
    if (equipos !== undefined && !Array.isArray(equipos)) {
      return res.status(400).json({
        success: false,
        message: 'equipos debe ser un array'
      });
    }

    if (ligas !== undefined && !Array.isArray(ligas)) {
      return res.status(400).json({
        success: false,
        message: 'ligas debe ser un array'
      });
    }

    // Buscar o crear favoritos
    let favorites = await Favorites.findOne({ user_id: userId });

    if (favorites) {
      // Actualizar favoritos existentes
      if (equipos !== undefined) {
        favorites.equipos = equipos;
      }
      if (ligas !== undefined) {
        favorites.ligas = ligas;
      }
      await favorites.save();
    } else {
      // Crear nuevos favoritos
      favorites = new Favorites({
        user_id: userId,
        equipos: equipos || [],
        ligas: ligas || []
      });
      await favorites.save();
    }

    res.json({
      success: true,
      favorites: {
        equipos: favorites.equipos || [],
        ligas: favorites.ligas || [],
        updated_at: favorites.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al guardar favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar favoritos'
    });
  }
});

/**
 * PUT /api/favorites/equipos
 * Agrega o quita un equipo de favoritos
 * Requiere: token válido en header Authorization
 * Body: { equipoId: String, action: 'add' | 'remove' }
 * Retorna: { success, favorites }
 */
router.put('/equipos', auth, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const { equipoId, action } = req.body;

    // Validar campos requeridos
    if (!equipoId) {
      return res.status(400).json({
        success: false,
        message: 'equipoId es requerido'
      });
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action debe ser "add" o "remove"'
      });
    }

    // Buscar o crear favoritos
    let favorites = await Favorites.findOne({ user_id: userId });

    if (!favorites) {
      favorites = new Favorites({
        user_id: userId,
        equipos: [],
        ligas: []
      });
    }

    // Agregar o quitar equipo
    if (action === 'add') {
      if (!favorites.equipos.includes(equipoId)) {
        favorites.equipos.push(equipoId);
      }
    } else if (action === 'remove') {
      favorites.equipos = favorites.equipos.filter(id => id !== equipoId);
    }

    await favorites.save();

    res.json({
      success: true,
      favorites: {
        equipos: favorites.equipos || [],
        ligas: favorites.ligas || [],
        updated_at: favorites.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar equipos favoritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar equipos favoritos'
    });
  }
});

/**
 * PUT /api/favorites/ligas
 * Agrega o quita una liga de favoritos
 * Requiere: token válido en header Authorization
 * Body: { ligaId: String, action: 'add' | 'remove' }
 * Retorna: { success, favorites }
 */
router.put('/ligas', auth, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const { ligaId, action } = req.body;

    // Validar campos requeridos
    if (!ligaId) {
      return res.status(400).json({
        success: false,
        message: 'ligaId es requerido'
      });
    }

    if (!action || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'action debe ser "add" o "remove"'
      });
    }

    // Buscar o crear favoritos
    let favorites = await Favorites.findOne({ user_id: userId });

    if (!favorites) {
      favorites = new Favorites({
        user_id: userId,
        equipos: [],
        ligas: []
      });
    }

    // Agregar o quitar liga
    if (action === 'add') {
      if (!favorites.ligas.includes(ligaId)) {
        favorites.ligas.push(ligaId);
      }
    } else if (action === 'remove') {
      favorites.ligas = favorites.ligas.filter(id => id !== ligaId);
    }

    await favorites.save();

    res.json({
      success: true,
      favorites: {
        equipos: favorites.equipos || [],
        ligas: favorites.ligas || [],
        updated_at: favorites.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al actualizar ligas favoritas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar ligas favoritas'
    });
  }
});

module.exports = router;
