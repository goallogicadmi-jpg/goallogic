const Bet = require('../models/Bet');

function computeBetStatsFromList(apuestas) {
  let profitTotal = 0;
  let totalGanadas = 0;
  let totalPerdidas = 0;
  let totalNulas = 0;
  let totalPendientes = 0;
  let totalStake = 0;

  apuestas.forEach((apuesta) => {
    totalStake += apuesta.stake || 0;
    switch (apuesta.resultado) {
      case 'ganada':
        totalGanadas += 1;
        profitTotal += (apuesta.cuota - 1) * apuesta.stake;
        break;
      case 'perdida':
        totalPerdidas += 1;
        profitTotal -= apuesta.stake;
        break;
      case 'nula':
        totalNulas += 1;
        break;
      default:
        totalPendientes += 1;
        break;
    }
  });

  const settled = totalGanadas + totalPerdidas;
  const winRate = settled > 0 ? (totalGanadas / settled) * 100 : 0;
  const roi = totalStake > 0 ? (profitTotal / totalStake) * 100 : 0;

  return {
    profitTotal: parseFloat(profitTotal.toFixed(2)),
    totalApuestas: apuestas.length,
    totalGanadas,
    totalPerdidas,
    totalNulas,
    totalPendientes,
    winRate: parseFloat(winRate.toFixed(2)),
    roi: parseFloat(roi.toFixed(2)),
    totalStake: parseFloat(totalStake.toFixed(2)),
  };
}

function computeCurrentWinStreak(apuestas) {
  const settled = apuestas
    .filter((b) => b.resultado === 'ganada' || b.resultado === 'perdida')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  let streak = 0;
  for (const bet of settled) {
    if (bet.resultado === 'ganada') streak += 1;
    else break;
  }
  return streak;
}

function buildPerformanceTimeline(apuestas) {
  const settled = apuestas
    .filter((b) => b.resultado === 'ganada' || b.resultado === 'perdida')
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  let cumulative = 0;
  return settled.map((bet) => {
    if (bet.resultado === 'ganada') {
      cumulative += (bet.cuota - 1) * bet.stake;
    } else {
      cumulative -= bet.stake;
    }
    return {
      date: bet.created_at,
      profit: parseFloat(cumulative.toFixed(2)),
      resultado: bet.resultado,
      partido: bet.partido,
    };
  });
}

function buildHistorySummary(apuestas, limit = 5) {
  const recent = [...apuestas]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, limit)
    .map((bet) => ({
      id: bet._id,
      partido: bet.partido,
      mercado: bet.mercado,
      seleccion: bet.seleccion,
      cuota: bet.cuota,
      stake: bet.stake,
      resultado: bet.resultado,
      created_at: bet.created_at,
    }));

  return recent;
}

async function getAnalystBetStats(userId) {
  const apuestas = await Bet.find({ user_id: String(userId) })
    .sort({ created_at: -1 })
    .lean();

  const stats = computeBetStatsFromList(apuestas);
  const currentStreak = computeCurrentWinStreak(apuestas);

  return {
    ...stats,
    currentStreak,
    historySummary: buildHistorySummary(apuestas, 5),
    performanceTimeline: buildPerformanceTimeline(apuestas),
  };
}

function isSportsAnalyst(user) {
  return user?.role === 'analista';
}

module.exports = {
  computeBetStatsFromList,
  computeCurrentWinStreak,
  buildPerformanceTimeline,
  buildHistorySummary,
  getAnalystBetStats,
  isSportsAnalyst,
};
