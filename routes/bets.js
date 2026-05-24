const express = require('express');
const { authJwt } = require('../middleware/auth');
const Bet = require('../models/Bet');

const router = express.Router();

/**
 * POST /api/bets
 * Crea una nueva apuesta para el usuario autenticado
 * Requiere: token válido en header Authorization
 * Body: { partido, mercado, seleccion, cuota, stake, modelo_analisis, confianza }
 * Retorna: apuesta creada en JSON
 */
router.post('/', authJwt, async (req, res) => {
  try {
    const { partido, mercado, seleccion, cuota, stake, modelo_analisis, confianza } = req.body;

    // Validar que todos los campos requeridos estén presentes
    if (!partido || !mercado || !seleccion || cuota === undefined || stake === undefined || !modelo_analisis || confianza === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Todos los campos son requeridos: partido, mercado, seleccion, cuota, stake, modelo_analisis, confianza'
      });
    }

    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Validar valores numéricos
    if (typeof cuota !== 'number' || cuota <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cuota debe ser un número mayor a 0'
      });
    }

    if (typeof stake !== 'number' || stake <= 0) {
      return res.status(400).json({
        success: false,
        message: 'El stake debe ser un número mayor a 0'
      });
    }

    if (typeof confianza !== 'number' || confianza < 1 || confianza > 5) {
      return res.status(400).json({
        success: false,
        message: 'La confianza debe ser un número entre 1 y 5'
      });
    }

    // Validar enum de mercado
    const mercadosValidos = ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'];
    if (!mercadosValidos.includes(mercado)) {
      return res.status(400).json({
        success: false,
        message: `Mercado inválido. Valores permitidos: ${mercadosValidos.join(', ')}`
      });
    }

    // Validar enum de modelo_analisis
    const modelosValidos = ['xG', 'Poisson', 'Mixto'];
    if (!modelosValidos.includes(modelo_analisis)) {
      return res.status(400).json({
        success: false,
        message: `Modelo de análisis inválido. Valores permitidos: ${modelosValidos.join(', ')}`
      });
    }

    // Crear nueva apuesta
    const nuevaApuesta = new Bet({
      user_id: req.user.id,
      partido: partido.trim(),
      mercado: mercado,
      seleccion: seleccion.trim(),
      cuota: cuota,
      stake: stake,
      modelo_analisis: modelo_analisis,
      confianza: confianza,
      resultado: 'pendiente' // Default según el modelo
    });

    // Guardar en la base de datos
    const apuestaGuardada = await nuevaApuesta.save();

    // Retornar apuesta creada
    res.status(201).json({
      success: true,
      message: 'Apuesta creada exitosamente',
      bet: apuestaGuardada
    });

  } catch (error) {
    console.error('❌ Error al crear apuesta:', error);

    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors
      });
    }

    // Manejar otros errores
    res.status(500).json({
      success: false,
      message: 'Error al crear apuesta'
    });
  }
});

/**
 * GET /api/bets
 * Obtiene las apuestas del usuario autenticado con paginación
 * Requiere: token válido en header Authorization
 * Query params: page (default: 1), limit (default: 20)
 * Retorna: objeto con apuestas, paginación y metadatos
 */
router.get('/', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Validar valores de paginación
    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'El número de página debe ser mayor a 0'
      });
    }

    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        message: 'El límite debe estar entre 1 y 100'
      });
    }

    // Calcular skip
    const skip = (page - 1) * limit;

    // Construir objeto de filtros dinámicamente
    const filters = { user_id: req.user.id };

    // Filtro por resultado
    if (req.query.resultado) {
      const resultadosValidos = ['pendiente', 'ganada', 'perdida', 'nula'];
      if (resultadosValidos.includes(req.query.resultado)) {
        filters.resultado = req.query.resultado;
      }
    }

    // Filtro por mercado
    if (req.query.mercado) {
      const mercadosValidos = ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'];
      if (mercadosValidos.includes(req.query.mercado)) {
        filters.mercado = req.query.mercado;
      }
    }

    // Filtro por partido (búsqueda parcial, case-insensitive)
    if (req.query.partido && req.query.partido.trim()) {
      filters.partido = {
        $regex: req.query.partido.trim(),
        $options: 'i' // Case-insensitive
      };
    }

    // Filtro por rango de fechas
    if (req.query.fechaDesde || req.query.fechaHasta) {
      filters.created_at = {};
      
      if (req.query.fechaDesde) {
        const fechaDesde = new Date(req.query.fechaDesde);
        if (!isNaN(fechaDesde.getTime())) {
          // Inicio del día
          fechaDesde.setHours(0, 0, 0, 0);
          filters.created_at.$gte = fechaDesde;
        }
      }
      
      if (req.query.fechaHasta) {
        const fechaHasta = new Date(req.query.fechaHasta);
        if (!isNaN(fechaHasta.getTime())) {
          // Fin del día
          fechaHasta.setHours(23, 59, 59, 999);
          filters.created_at.$lte = fechaHasta;
        }
      }
    }

    // Obtener total de apuestas del usuario con filtros aplicados (para calcular totalPages)
    const total = await Bet.countDocuments(filters);

    // Buscar apuestas del usuario con filtros y paginación
    // Ordenar por created_at descendente (más recientes primero)
    const apuestas = await Bet.find(filters)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Usar lean() para mejor rendimiento (retorna objetos planos)

    // Calcular total de páginas
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    // Retornar respuesta con paginación
    res.json({
      success: true,
      bets: apuestas,
      page: page,
      limit: limit,
      total: total,
      totalPages: totalPages
    });

  } catch (error) {
    console.error('❌ Error al obtener apuestas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener apuestas'
    });
  }
});

/**
 * PUT /api/bets/:id
 * Actualiza una apuesta del usuario autenticado
 * Requiere: token válido en header Authorization
 * Body: { partido, mercado, seleccion, cuota, stake, modelo_analisis, confianza, resultado }
 * Retorna: apuesta actualizada
 */
router.put('/:id', authJwt, async (req, res) => {
  try {
    const { id } = req.params;
    const { partido, mercado, seleccion, cuota, stake, modelo_analisis, confianza, resultado } = req.body;

    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Buscar la apuesta y verificar que pertenece al usuario
    const apuesta = await Bet.findOne({ _id: id, user_id: req.user.id });
    if (!apuesta) {
      return res.status(404).json({
        success: false,
        message: 'Apuesta no encontrada o no tienes permiso para editarla'
      });
    }

    // Validar campos si están presentes
    if (cuota !== undefined && (typeof cuota !== 'number' || cuota <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'La cuota debe ser un número mayor a 0'
      });
    }

    if (stake !== undefined && (typeof stake !== 'number' || stake <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'El stake debe ser un número mayor a 0'
      });
    }

    if (confianza !== undefined && (typeof confianza !== 'number' || confianza < 1 || confianza > 5)) {
      return res.status(400).json({
        success: false,
        message: 'La confianza debe ser un número entre 1 y 5'
      });
    }

    // Validar enum de mercado si está presente
    if (mercado !== undefined) {
      const mercadosValidos = ['Resultado', 'Over/Under', 'BTTS', 'Corners', 'Combinado'];
      if (!mercadosValidos.includes(mercado)) {
        return res.status(400).json({
          success: false,
          message: `Mercado inválido. Valores permitidos: ${mercadosValidos.join(', ')}`
        });
      }
    }

    // Validar enum de modelo_analisis si está presente
    if (modelo_analisis !== undefined) {
      const modelosValidos = ['xG', 'Poisson', 'Mixto'];
      if (!modelosValidos.includes(modelo_analisis)) {
        return res.status(400).json({
          success: false,
          message: `Modelo de análisis inválido. Valores permitidos: ${modelosValidos.join(', ')}`
        });
      }
    }

    // Validar enum de resultado si está presente
    if (resultado !== undefined) {
      const resultadosValidos = ['pendiente', 'ganada', 'perdida', 'nula'];
      if (!resultadosValidos.includes(resultado)) {
        return res.status(400).json({
          success: false,
          message: `Resultado inválido. Valores permitidos: ${resultadosValidos.join(', ')}`
        });
      }
    }

    // Construir objeto de actualización solo con campos presentes
    const updateData = {};
    if (partido !== undefined) updateData.partido = partido.trim();
    if (mercado !== undefined) updateData.mercado = mercado;
    if (seleccion !== undefined) updateData.seleccion = seleccion.trim();
    if (cuota !== undefined) updateData.cuota = cuota;
    if (stake !== undefined) updateData.stake = stake;
    if (modelo_analisis !== undefined) updateData.modelo_analisis = modelo_analisis;
    if (confianza !== undefined) updateData.confianza = confianza;
    if (resultado !== undefined) updateData.resultado = resultado;

    // Actualizar apuesta
    const apuestaActualizada = await Bet.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    // Retornar apuesta actualizada
    res.json({
      success: true,
      message: 'Apuesta actualizada exitosamente',
      bet: apuestaActualizada
    });

  } catch (error) {
    console.error('❌ Error al actualizar apuesta:', error);

    // Manejar errores de validación de Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Error de validación',
        errors: errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de apuesta inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar apuesta'
    });
  }
});

/**
 * DELETE /api/bets/:id
 * Elimina una apuesta del usuario autenticado
 * Requiere: token válido en header Authorization
 * Retorna: { success: true }
 */
router.delete('/:id', authJwt, async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Buscar y eliminar la apuesta (solo si pertenece al usuario)
    const apuesta = await Bet.findOneAndDelete({ _id: id, user_id: req.user.id });

    if (!apuesta) {
      return res.status(404).json({
        success: false,
        message: 'Apuesta no encontrada o no tienes permiso para eliminarla'
      });
    }

    // Retornar éxito
    res.json({
      success: true,
      message: 'Apuesta eliminada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error al eliminar apuesta:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de apuesta inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al eliminar apuesta'
    });
  }
});

/**
 * GET /api/bets/stats
 * Obtiene estadísticas de rendimiento del usuario autenticado
 * Requiere: token válido en header Authorization
 * Retorna: objeto con estadísticas (profitTotal, totalApuestas, winRate, roi, etc.)
 */
router.get('/stats', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener todas las apuestas del usuario
    const apuestas = await Bet.find({ user_id: req.user.id }).lean();

    // Inicializar contadores
    let profitTotal = 0;
    let totalApuestas = apuestas.length;
    let totalGanadas = 0;
    let totalPerdidas = 0;
    let totalNulas = 0;
    let totalPendientes = 0;
    let totalStake = 0;

    // Calcular estadísticas
    apuestas.forEach((apuesta) => {
      // Sumar stake total
      totalStake += apuesta.stake || 0;

      // Contar por resultado
      switch (apuesta.resultado) {
        case 'ganada':
          totalGanadas++;
          profitTotal += (apuesta.cuota - 1) * apuesta.stake;
          break;
        case 'perdida':
          totalPerdidas++;
          profitTotal -= apuesta.stake;
          break;
        case 'nula':
          totalNulas++;
          // profitTotal no cambia (0)
          break;
        case 'pendiente':
        default:
          totalPendientes++;
          // profitTotal no cambia (0)
          break;
      }
    });

    // Calcular Win Rate
    // Solo considerar apuestas con resultado (ganadas + perdidas)
    const apuestasConResultado = totalGanadas + totalPerdidas;
    const winRate = apuestasConResultado > 0 
      ? (totalGanadas / apuestasConResultado) * 100 
      : 0;

    // Calcular ROI
    // ROI = (profitTotal / totalStake) * 100
    const roi = totalStake > 0 
      ? (profitTotal / totalStake) * 100 
      : 0;

    // Retornar estadísticas
    res.json({
      success: true,
      profitTotal: parseFloat(profitTotal.toFixed(2)),
      totalApuestas: totalApuestas,
      totalGanadas: totalGanadas,
      totalPerdidas: totalPerdidas,
      totalNulas: totalNulas,
      totalPendientes: totalPendientes,
      winRate: parseFloat(winRate.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      totalStake: parseFloat(totalStake.toFixed(2))
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
});

/**
 * GET /api/bets/profit-timeline
 * Obtiene la evolución del profit del usuario agrupado por día
 * Requiere: token válido en header Authorization
 * Retorna: array de objetos con fecha, profitDiario y profitAcumulado
 */
router.get('/profit-timeline', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente (debe venir del middleware authJwt)
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    // Obtener todas las apuestas del usuario (solo resueltas: ganadas, perdidas, nulas)
    const apuestas = await Bet.find({
      user_id: req.user.id,
      resultado: { $in: ['ganada', 'perdida', 'nula'] }
    })
      .sort({ created_at: 1 }) // Ordenar por fecha ascendente
      .lean();

    // Agrupar por día y calcular profit
    const profitPorDia = {};
    let profitAcumulado = 0;

    apuestas.forEach((apuesta) => {
      // Obtener fecha en formato YYYY-MM-DD
      const fecha = new Date(apuesta.created_at);
      const fechaStr = fecha.toISOString().split('T')[0];

      // Inicializar día si no existe
      if (!profitPorDia[fechaStr]) {
        profitPorDia[fechaStr] = {
          fecha: fechaStr,
          profitDiario: 0,
          profitAcumulado: 0
        };
      }

      // Calcular profit del día
      let profitDiario = 0;
      switch (apuesta.resultado) {
        case 'ganada':
          profitDiario = (apuesta.cuota - 1) * apuesta.stake;
          break;
        case 'perdida':
          profitDiario = -apuesta.stake;
          break;
        case 'nula':
          profitDiario = 0;
          break;
      }

      // Sumar al profit del día
      profitPorDia[fechaStr].profitDiario += profitDiario;
    });

    // Convertir a array y calcular profit acumulado
    const timeline = Object.values(profitPorDia)
      .sort((a, b) => a.fecha.localeCompare(b.fecha)) // Ordenar por fecha ascendente
      .map((dia) => {
        profitAcumulado += dia.profitDiario;
        return {
          fecha: dia.fecha,
          profitDiario: parseFloat(dia.profitDiario.toFixed(2)),
          profitAcumulado: parseFloat(profitAcumulado.toFixed(2))
        };
      });

    // Retornar timeline
    res.json({
      success: true,
      timeline: timeline
    });

  } catch (error) {
    console.error('❌ Error al obtener timeline de profit:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener timeline de profit'
    });
  }
});

module.exports = router;
