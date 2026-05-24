import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getProfitTimeline } from '../../services/betService';
import CuentaSectionTitle from './CuentaSectionTitle';
import { IconEvolucionProfit } from './CuentaIcons';
import './cuentaSections.css';
import './PanelApuestas.css';

function GraficoHeader({ subtitle }) {
  return (
    <div className="cuenta-section-header">
      <CuentaSectionTitle icon={IconEvolucionProfit} size="md">
        Evolución del Profit
      </CuentaSectionTitle>
      {subtitle ? <span className="cuenta-section-subtitle">{subtitle}</span> : null}
    </div>
  );
}

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Componente de Gráfico de Evolución de Profit
 * Muestra la evolución del profit acumulado a lo largo del tiempo
 */
const GraficoProfit = ({ refreshTrigger }) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cargar timeline
  const cargarTimeline = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await getProfitTimeline();
      setTimeline(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el gráfico');
      setTimeline([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y cuando cambia refreshTrigger
  useEffect(() => {
    cargarTimeline();
  }, [refreshTrigger]);

  // Preparar datos para el gráfico
  const chartData = {
    labels: timeline.map(item => {
      const fecha = new Date(item.fecha);
      return fecha.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
    }),
    datasets: [
      {
        label: 'Profit Acumulado',
        data: timeline.map(item => item.profitAcumulado),
        borderColor: 'rgba(242, 138, 0, 1)',
        backgroundColor: 'rgba(242, 138, 0, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4, // Línea suave (curva)
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(242, 138, 0, 1)',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointHoverBackgroundColor: 'rgba(242, 138, 0, 1)',
        pointHoverBorderColor: '#FFFFFF',
        pointHoverBorderWidth: 3
      }
    ]
  };

  // Opciones del gráfico
  const chartOptions = {
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
        backgroundColor: 'rgba(26, 26, 26, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: 'rgba(242, 138, 0, 0.5)',
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: (tooltipItems) => {
            const index = tooltipItems[0].dataIndex;
            const item = timeline[index];
            const fecha = new Date(item.fecha);
            return fecha.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          },
          label: (context) => {
            const index = context.dataIndex;
            const item = timeline[index];
            return [
              `Profit Acumulado: ${item.profitAcumulado >= 0 ? '+' : ''}$${item.profitAcumulado.toFixed(2)}`,
              `Profit Diario: ${item.profitDiario >= 0 ? '+' : ''}$${item.profitDiario.toFixed(2)}`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(31, 38, 48, 0.5)',
          drawBorder: false
        },
        ticks: {
          color: '#B3B8C2',
          font: {
            size: 12
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(31, 38, 48, 0.5)',
          drawBorder: false
        },
        ticks: {
          color: '#B3B8C2',
          font: {
            size: 12
          },
          callback: function(value) {
            return (value >= 0 ? '+' : '') + '$' + value.toFixed(0);
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="grafico-profit">
        <GraficoHeader />
        <div className="grafico-loading">
          <p>Cargando gráfico...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grafico-profit">
        <GraficoHeader />
        <div className="grafico-error">
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div className="grafico-profit">
        <GraficoHeader />
        <div className="grafico-empty">
          <p>No hay datos suficientes para mostrar el gráfico.</p>
          <p className="grafico-empty-subtitle">Necesitas apuestas resueltas (ganadas, perdidas o nulas) para ver la evolución.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grafico-profit">
      <GraficoHeader
        subtitle={`${timeline.length} ${timeline.length === 1 ? 'día' : 'días'} de actividad`}
      />

      <div className="grafico-container">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default GraficoProfit;
