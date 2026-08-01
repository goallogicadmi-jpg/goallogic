const express = require('express');
const { authJwt } = require('../middleware/auth');
const { createUsageLimiter } = require('../middleware/planUsageLimit');
const SimulatorState = require('../models/SimulatorState');

const router = express.Router();
const simulationLimit = createUsageLimiter('simulations');

/**
 * GET /api/simulator
 * Obtiene el estado del simulador del usuario autenticado
 * Requiere: token válido en header Authorization
 * Retorna: { success, simulator_state }
 */
router.get('/', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    // Buscar estado del simulador usando lean() para obtener objeto plano
    // Esto asegura que los campos Mixed se serialicen correctamente
    const simulatorState = await SimulatorState.findOne({ user_id: userId }).lean();

    console.log('📥 [SIMULADOR] Recuperando estado para usuario:', userId);

    // Si no existe, devolver estado vacío (NO crear datos automáticamente)
    // El frontend manejará la generación de datos iniciales si es necesario
    if (!simulatorState) {
      console.log('ℹ️ [SIMULADOR] No existe estado para este usuario, devolviendo vacío');
      return res.json({
        success: true,
        simulator_state: {
          capital_inicial: 1000,
          capital_actual: 1000,
          apuestas: [],
          updated_at: null
        }
      });
    }

    // Si existe pero no tiene apuestas, devolver estado vacío
    // NO generar apuestas automáticamente
    if (!simulatorState.apuestas || simulatorState.apuestas.length === 0) {
      console.log('ℹ️ [SIMULADOR] Estado existe pero no tiene apuestas, devolviendo vacío');
      return res.json({
        success: true,
        simulator_state: {
          capital_inicial: simulatorState.capital_inicial || 1000,
          capital_actual: simulatorState.capital_actual || 1000,
          apuestas: [],
          updated_at: simulatorState.updated_at
        }
      });
    }

    console.log('✅ [SIMULADOR] Estado encontrado con', simulatorState.apuestas.length, 'apuestas');
    if (simulatorState.apuestas.length > 0) {
      const primeraApuesta = simulatorState.apuestas[0];
      console.log('✅ [SIMULADOR] Primera apuesta tiene table_row?', !!primeraApuesta.table_row);
      console.log('✅ [SIMULADOR] Primera apuesta keys:', Object.keys(primeraApuesta));
      if (primeraApuesta.table_row) {
        console.log('✅ [SIMULADOR] Primera apuesta table_row tiene capital?', !!primeraApuesta.table_row.capital);
        console.log('✅ [SIMULADOR] Primera apuesta table_row sample:', JSON.stringify(primeraApuesta.table_row, null, 2).substring(0, 300));
      } else {
        console.warn('⚠️ [SIMULADOR] Primera apuesta NO tiene table_row!');
        console.warn('⚠️ [SIMULADOR] Primera apuesta completa:', JSON.stringify(primeraApuesta, null, 2).substring(0, 500));
      }
    }

    // Devolver exactamente lo que está guardado, sin modificaciones
    // Con lean() ya tenemos un objeto plano, así que table_row debería estar disponible
    res.json({
      success: true,
      simulator_state: {
        capital_inicial: simulatorState.capital_inicial,
        capital_actual: simulatorState.capital_actual,
        apuestas: simulatorState.apuestas, // Ya es un objeto plano con table_row incluido
        updated_at: simulatorState.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener estado del simulador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estado del simulador'
    });
  }
});

/**
 * POST /api/simulator
 * Crea o actualiza el estado completo del simulador
 * Requiere: token válido en header Authorization
 * Body: { capital_inicial, capital_actual, apuestas }
 * Retorna: { success, simulator_state }
 */
router.post('/', authJwt, simulationLimit, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const { capital_inicial, capital_actual, apuestas } = req.body;

    // Validar campos requeridos
    if (capital_inicial === undefined || capital_actual === undefined) {
      return res.status(400).json({
        success: false,
        message: 'capital_inicial y capital_actual son requeridos'
      });
    }

    // Validar que sean números
    if (typeof capital_inicial !== 'number' || typeof capital_actual !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'capital_inicial y capital_actual deben ser números'
      });
    }

    // Validar que capital_inicial y capital_actual sean positivos
    if (capital_inicial < 0 || capital_actual < 0) {
      return res.status(400).json({
        success: false,
        message: 'capital_inicial y capital_actual deben ser números positivos'
      });
    }

    // Validar estructura de apuestas si se proporcionan
    if (apuestas && Array.isArray(apuestas)) {
      for (const apuesta of apuestas) {
        if (!apuesta.partido || apuesta.cuota === undefined || apuesta.stake === undefined) {
          return res.status(400).json({
            success: false,
            message: 'Cada apuesta debe tener: partido, cuota y stake'
          });
        }
      }
    }

    // Buscar o crear estado del simulador
    let simulatorState = await SimulatorState.findOne({ user_id: userId });

    console.log('💾 [SIMULADOR] Guardando estado para usuario:', userId);
    console.log('💾 [SIMULADOR] Apuestas recibidas:', apuestas?.length || 0);
    if (apuestas && apuestas.length > 0) {
      console.log('💾 [SIMULADOR] Primera apuesta sample:', JSON.stringify(apuestas[0], null, 2));
      console.log('💾 [SIMULADOR] Primera apuesta tiene table_row?', !!apuestas[0].table_row);
    }

    if (simulatorState) {
      // Actualizar estado existente
      simulatorState.capital_inicial = capital_inicial;
      simulatorState.capital_actual = capital_actual;
      if (apuestas !== undefined) {
        simulatorState.apuestas = apuestas;
      }
      await simulatorState.save();
      console.log('✅ [SIMULADOR] Estado actualizado correctamente');
    } else {
      // Crear nuevo estado
      simulatorState = new SimulatorState({
        user_id: userId,
        capital_inicial: capital_inicial,
        capital_actual: capital_actual,
        apuestas: apuestas || []
      });
      await simulatorState.save();
      console.log('✅ [SIMULADOR] Nuevo estado creado correctamente');
    }

    // Verificar que las apuestas se guardaron correctamente
    const estadoGuardado = await SimulatorState.findOne({ user_id: userId });
    console.log('✅ [SIMULADOR] Estado guardado verificado:', estadoGuardado.apuestas?.length || 0, 'apuestas');
    if (estadoGuardado.apuestas && estadoGuardado.apuestas.length > 0) {
      console.log('✅ [SIMULADOR] Primera apuesta guardada tiene table_row?', !!estadoGuardado.apuestas[0].table_row);
    }

    res.json({
      success: true,
      simulator_state: {
        capital_inicial: simulatorState.capital_inicial,
        capital_actual: simulatorState.capital_actual,
        apuestas: simulatorState.apuestas,
        updated_at: simulatorState.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al guardar estado del simulador:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar estado del simulador'
    });
  }
});

/**
 * PUT /api/simulator/apuesta
 * Agrega una nueva apuesta simulada al estado del simulador
 * Requiere: token válido en header Authorization
 * Body: { partido, cuota, stake, resultado?, ganancia? }
 * Retorna: { success, simulator_state }
 */
router.put('/apuesta', authJwt, simulationLimit, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const { partido, cuota, stake, resultado, ganancia } = req.body;

    // Validar campos requeridos
    if (!partido || cuota === undefined || stake === undefined) {
      return res.status(400).json({
        success: false,
        message: 'partido, cuota y stake son requeridos'
      });
    }

    // Validar tipos
    if (typeof cuota !== 'number' || typeof stake !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'cuota y stake deben ser números'
      });
    }

    // Validar valores positivos
    if (cuota <= 0 || stake <= 0) {
      return res.status(400).json({
        success: false,
        message: 'cuota y stake deben ser números positivos'
      });
    }

    // Validar resultado si se proporciona
    if (resultado && !['ganada', 'perdida', 'nula', 'pendiente'].includes(resultado)) {
      return res.status(400).json({
        success: false,
        message: 'resultado debe ser: ganada, perdida, nula o pendiente'
      });
    }

    // Buscar o crear estado del simulador
    let simulatorState = await SimulatorState.findOne({ user_id: userId });

    if (!simulatorState) {
      simulatorState = new SimulatorState({
        user_id: userId,
        capital_inicial: 1000,
        capital_actual: 1000,
        apuestas: []
      });
    }

    // Crear nueva apuesta
    const nuevaApuesta = {
      partido: partido.trim(),
      cuota: cuota,
      stake: stake,
      resultado: resultado || 'pendiente',
      ganancia: ganancia || 0,
      created_at: new Date()
    };

    // Agregar apuesta al array
    simulatorState.apuestas.push(nuevaApuesta);

    // Actualizar capital_actual si la apuesta tiene resultado
    if (nuevaApuesta.resultado === 'ganada') {
      simulatorState.capital_actual += nuevaApuesta.ganancia;
    } else if (nuevaApuesta.resultado === 'perdida') {
      simulatorState.capital_actual -= nuevaApuesta.stake;
    }

    await simulatorState.save();

    res.json({
      success: true,
      simulator_state: {
        capital_inicial: simulatorState.capital_inicial,
        capital_actual: simulatorState.capital_actual,
        apuestas: simulatorState.apuestas,
        updated_at: simulatorState.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al agregar apuesta simulada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar apuesta simulada'
    });
  }
});

/**
 * DELETE /api/simulator/apuesta/:id
 * Elimina una apuesta simulada del estado del simulador
 * Requiere: token válido en header Authorization
 * Params: id (ID de la apuesta dentro del array)
 * Retorna: { success, simulator_state }
 */
router.delete('/apuesta/:id', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;
    const apuestaId = req.params.id;

    // Buscar estado del simulador
    const simulatorState = await SimulatorState.findOne({ user_id: userId });

    if (!simulatorState) {
      return res.status(404).json({
        success: false,
        message: 'Estado del simulador no encontrado'
      });
    }

    // Buscar la apuesta por _id dentro del array
    const apuestaIndex = simulatorState.apuestas.findIndex(
      apuesta => apuesta._id.toString() === apuestaId
    );

    if (apuestaIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Apuesta no encontrada'
      });
    }

    // Obtener la apuesta antes de eliminarla para ajustar capital si es necesario
    const apuestaEliminada = simulatorState.apuestas[apuestaIndex];

    // Si la apuesta estaba ganada, restar la ganancia del capital
    // Si estaba perdida, sumar el stake de vuelta
    if (apuestaEliminada.resultado === 'ganada') {
      simulatorState.capital_actual -= apuestaEliminada.ganancia;
    } else if (apuestaEliminada.resultado === 'perdida') {
      simulatorState.capital_actual += apuestaEliminada.stake;
    }

    // Eliminar la apuesta del array
    simulatorState.apuestas.splice(apuestaIndex, 1);
    await simulatorState.save();

    res.json({
      success: true,
      simulator_state: {
        capital_inicial: simulatorState.capital_inicial,
        capital_actual: simulatorState.capital_actual,
        apuestas: simulatorState.apuestas,
        updated_at: simulatorState.updated_at
      }
    });

  } catch (error) {
    console.error('❌ Error al eliminar apuesta simulada:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar apuesta simulada'
    });
  }
});

module.exports = router;
