/**
 * Utilidades para renderizar gráficas con Chart.js
 * Funciones helper para crear gráficas del dashboard de estadísticas
 */

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend
);

/**
 * Renderiza gráfica de profit mensual
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} profitPorMes - Array de { mes, mes_corto, profit }
 * @returns {Chart} Instancia de Chart.js
 */
export const renderProfitChart = (canvas, profitPorMes) => {
  if (!canvas || !profitPorMes || profitPorMes.length === 0) {
    return null;
  }

  // Obtener últimos 6 meses
  const ultimosMeses = profitPorMes.slice(-6);
  const labels = ultimosMeses.map(mes => mes.mes_corto);
  const profits = ultimosMeses.map(mes => mes.profit);

  // Colores según profit positivo/negativo
  const backgroundColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'
  );
  const borderColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
  );

  return new ChartJS(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Profit (€)',
        data: profits,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.y;
              return `${value >= 0 ? '+' : ''}${value.toFixed(2)}€`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)',
            display: false
          }
        },
        y: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            },
            callback: function(value) {
              return `${value >= 0 ? '+' : ''}${value.toFixed(0)}€`;
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)'
          },
          beginAtZero: true
        }
      }
    }
  });
};

/**
 * Renderiza gráfica de rendimiento por liga
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} ligas - Array de { liga, total_apuestas, ganadas, perdidas, profit }
 * @returns {Chart} Instancia de Chart.js
 */
export const renderLigaChart = (canvas, ligas) => {
  if (!canvas || !ligas || ligas.length === 0) {
    return null;
  }

  // Obtener top 5 ligas
  const topLigas = ligas.slice(0, 5);
  const labels = topLigas.map(liga => liga.liga.length > 20 ? liga.liga.substring(0, 20) + '...' : liga.liga);
  const profits = topLigas.map(liga => liga.profit);

  // Colores según profit
  const backgroundColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'
  );
  const borderColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
  );

  return new ChartJS(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Profit (€)',
        data: profits,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y', // Gráfica horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.x;
              const liga = topLigas[context.dataIndex];
              return [
                `Profit: ${value >= 0 ? '+' : ''}${value.toFixed(2)}€`,
                `Total: ${liga.total_apuestas} apuestas`,
                `Ganadas: ${liga.ganadas} | Perdidas: ${liga.perdidas}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            },
            callback: function(value) {
              return `${value >= 0 ? '+' : ''}${value.toFixed(0)}€`;
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)'
          },
          beginAtZero: true
        },
        y: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)',
            display: false
          }
        }
      }
    }
  });
};

/**
 * Renderiza gráfica de rendimiento por equipo
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Array} equipos - Array de { equipo, total_apuestas, ganadas, perdidas, profit }
 * @returns {Chart} Instancia de Chart.js
 */
export const renderEquipoChart = (canvas, equipos) => {
  if (!canvas || !equipos || equipos.length === 0) {
    return null;
  }

  // Obtener top 5 equipos
  const topEquipos = equipos.slice(0, 5);
  const labels = topEquipos.map(equipo => equipo.equipo.length > 20 ? equipo.equipo.substring(0, 20) + '...' : equipo.equipo);
  const profits = topEquipos.map(equipo => equipo.profit);

  // Colores según profit
  const backgroundColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 0.8)' : 'rgba(244, 67, 54, 0.8)'
  );
  const borderColors = profits.map(profit => 
    profit >= 0 ? 'rgba(76, 175, 80, 1)' : 'rgba(244, 67, 54, 1)'
  );

  return new ChartJS(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Profit (€)',
        data: profits,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 2,
        borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y', // Gráfica horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#FFFFFF',
          bodyColor: '#FFFFFF',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          callbacks: {
            label: function(context) {
              const value = context.parsed.x;
              const equipo = topEquipos[context.dataIndex];
              return [
                `Profit: ${value >= 0 ? '+' : ''}${value.toFixed(2)}€`,
                `Total: ${equipo.total_apuestas} apuestas`,
                `Ganadas: ${equipo.ganadas} | Perdidas: ${equipo.perdidas}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            },
            callback: function(value) {
              return `${value >= 0 ? '+' : ''}${value.toFixed(0)}€`;
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)'
          },
          beginAtZero: true
        },
        y: {
          ticks: {
            color: '#B3B8C2',
            font: {
              size: 11
            }
          },
          grid: {
            color: 'rgba(31, 38, 48, 0.5)',
            display: false
          }
        }
      }
    }
  });
};

/**
 * Destruye una gráfica de Chart.js si existe
 * @param {Chart} chart - Instancia de Chart.js a destruir
 */
export const destroyChart = (chart) => {
  if (chart && typeof chart.destroy === 'function') {
    chart.destroy();
  }
};
