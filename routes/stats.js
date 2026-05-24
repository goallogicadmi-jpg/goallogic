const express = require('express');
const { authJwt } = require('../middleware/auth');
const Bet = require('../models/Bet');
const mongoose = require('mongoose');

const router = express.Router();

/**
 * GET /api/stats/profit
 * Calcula el profit total del usuario y profit por mes
 * Requiere: token válido en header Authorization
 * Retorna: { profit_total, profit_por_mes: [{ mes, profit }] }
 */
router.get('/profit', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    // Obtener todas las apuestas del usuario con resultado definido (no pendientes)
    const apuestas = await Bet.find({
      user_id: userId,
      resultado: { $in: ['ganada', 'perdida', 'nula'] }
    }).lean();

    // Calcular profit total
    let profitTotal = 0;
    apuestas.forEach(apuesta => {
      if (apuesta.resultado === 'ganada') {
        // Profit = (stake * cuota) - stake = stake * (cuota - 1)
        profitTotal += apuesta.stake * (apuesta.cuota - 1);
      } else if (apuesta.resultado === 'perdida') {
        // Profit = -stake
        profitTotal -= apuesta.stake;
      }
      // Si es 'nula', profit = 0 (no se suma ni resta)
    });

    // Calcular profit por mes (últimos 12 meses)
    const profitPorMes = [];
    const ahora = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesInicio = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
      const mesFin = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59);

      const apuestasMes = apuestas.filter(apuesta => {
        const fechaApuesta = new Date(apuesta.created_at);
        return fechaApuesta >= mesInicio && fechaApuesta <= mesFin;
      });

      let profitMes = 0;
      apuestasMes.forEach(apuesta => {
        if (apuesta.resultado === 'ganada') {
          profitMes += apuesta.stake * (apuesta.cuota - 1);
        } else if (apuesta.resultado === 'perdida') {
          profitMes -= apuesta.stake;
        }
      });

      profitPorMes.push({
        mes: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' }),
        mes_corto: fecha.toLocaleDateString('es-ES', { year: 'numeric', month: 'short' }),
        fecha: fecha.toISOString(),
        profit: profitMes,
        total_apuestas: apuestasMes.length
      });
    }

    res.json({
      success: true,
      profit_total: profitTotal,
      profit_por_mes: profitPorMes,
      total_apuestas: apuestas.length
    });

  } catch (error) {
    console.error('❌ Error al calcular estadísticas de profit:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular estadísticas de profit'
    });
  }
});

/**
 * GET /api/stats/ligas
 * Calcula rendimiento por liga
 * Requiere: token válido en header Authorization
 * Retorna: { ligas: [{ liga, total_apuestas, ganadas, perdidas, nulas, profit }] }
 */
router.get('/ligas', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    // Obtener todas las apuestas del usuario
    const apuestas = await Bet.find({ user_id: userId }).lean();

    // Agrupar por liga (extraer liga del campo partido)
    // Asumimos que el formato del partido puede ser: "Liga: Equipo1 vs Equipo2" o similar
    // Si no hay formato claro, usamos "Sin liga especificada"
    const ligasMap = {};

    apuestas.forEach(apuesta => {
      // Intentar extraer liga del campo partido
      // Formatos posibles: "Liga - Equipo1 vs Equipo2", "Equipo1 vs Equipo2 (Liga)", etc.
      let liga = 'Sin liga especificada';
      
      // Buscar patrones comunes
      const separadores = [' - ', ' | ', ' (', ' ['];
      for (const sep of separadores) {
        if (apuesta.partido.includes(sep)) {
          liga = apuesta.partido.split(sep)[0].trim();
          break;
        }
      }

      // Si no encontramos separador, usar las primeras palabras como liga
      if (liga === 'Sin liga especificada') {
        const palabras = apuesta.partido.split(' ');
        if (palabras.length > 2) {
          liga = palabras.slice(0, 2).join(' ');
        } else {
          liga = apuesta.partido;
        }
      }

      if (!ligasMap[liga]) {
        ligasMap[liga] = {
          liga: liga,
          total_apuestas: 0,
          ganadas: 0,
          perdidas: 0,
          nulas: 0,
          pendientes: 0,
          profit: 0
        };
      }

      ligasMap[liga].total_apuestas++;

      if (apuesta.resultado === 'ganada') {
        ligasMap[liga].ganadas++;
        ligasMap[liga].profit += apuesta.stake * (apuesta.cuota - 1);
      } else if (apuesta.resultado === 'perdida') {
        ligasMap[liga].perdidas++;
        ligasMap[liga].profit -= apuesta.stake;
      } else if (apuesta.resultado === 'nula') {
        ligasMap[liga].nulas++;
      } else {
        ligasMap[liga].pendientes++;
      }
    });

    // Convertir a array y ordenar por total de apuestas
    const ligas = Object.values(ligasMap).sort((a, b) => b.total_apuestas - a.total_apuestas);

    res.json({
      success: true,
      ligas: ligas
    });

  } catch (error) {
    console.error('❌ Error al calcular estadísticas por liga:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular estadísticas por liga'
    });
  }
});

/**
 * GET /api/stats/equipos
 * Calcula rendimiento por equipo
 * Requiere: token válido en header Authorization
 * Retorna: { equipos: [{ equipo, total_apuestas, ganadas, perdidas, nulas, profit }] }
 */
router.get('/equipos', authJwt, async (req, res) => {
  try {
    // Validar que user_id esté presente
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }

    const userId = req.user.id;

    // Obtener todas las apuestas del usuario
    const apuestas = await Bet.find({ user_id: userId }).lean();

    // Agrupar por equipo (extraer equipos del campo partido)
    const equiposMap = {};

    apuestas.forEach(apuesta => {
      // Intentar extraer equipos del campo partido
      // Formatos comunes: "Equipo1 vs Equipo2", "Equipo1 - Equipo2", etc.
      let equipos = [];
      
      // Buscar patrones comunes
      const separadores = [' vs ', ' VS ', ' - ', ' | '];
      for (const sep of separadores) {
        if (apuesta.partido.includes(sep)) {
          equipos = apuesta.partido.split(sep).map(eq => eq.trim());
          break;
        }
      }

      // Si no encontramos separador, intentar extraer de otra forma
      if (equipos.length === 0) {
        // Buscar "vs" en minúsculas o mayúsculas
        const vsMatch = apuesta.partido.match(/(.+?)\s+(?:vs|VS|v|V)\s+(.+)/i);
        if (vsMatch) {
          equipos = [vsMatch[1].trim(), vsMatch[2].trim()];
        }
      }

      // Si aún no tenemos equipos, usar el partido completo como un solo "equipo"
      if (equipos.length === 0) {
        equipos = [apuesta.partido];
      }

      // Procesar cada equipo encontrado
      equipos.forEach(equipo => {
        // Limpiar nombre del equipo (quitar liga si está incluida)
        let nombreEquipo = equipo;
        const separadoresLiga = [' - ', ' | ', ' (', ' ['];
        for (const sep of separadoresLiga) {
          if (nombreEquipo.includes(sep)) {
            nombreEquipo = nombreEquipo.split(sep)[0].trim();
            break;
          }
        }

        if (!equiposMap[nombreEquipo]) {
          equiposMap[nombreEquipo] = {
            equipo: nombreEquipo,
            total_apuestas: 0,
            ganadas: 0,
            perdidas: 0,
            nulas: 0,
            pendientes: 0,
            profit: 0
          };
        }

        equiposMap[nombreEquipo].total_apuestas++;

        if (apuesta.resultado === 'ganada') {
          equiposMap[nombreEquipo].ganadas++;
          // Solo contar profit una vez por apuesta, dividirlo entre equipos
          equiposMap[nombreEquipo].profit += (apuesta.stake * (apuesta.cuota - 1)) / equipos.length;
        } else if (apuesta.resultado === 'perdida') {
          equiposMap[nombreEquipo].perdidas++;
          equiposMap[nombreEquipo].profit -= apuesta.stake / equipos.length;
        } else if (apuesta.resultado === 'nula') {
          equiposMap[nombreEquipo].nulas++;
        } else {
          equiposMap[nombreEquipo].pendientes++;
        }
      });
    });

    // Convertir a array y ordenar por total de apuestas
    const equipos = Object.values(equiposMap).sort((a, b) => b.total_apuestas - a.total_apuestas);

    res.json({
      success: true,
      equipos: equipos
    });

  } catch (error) {
    console.error('❌ Error al calcular estadísticas por equipo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al calcular estadísticas por equipo'
    });
  }
});

module.exports = router;
