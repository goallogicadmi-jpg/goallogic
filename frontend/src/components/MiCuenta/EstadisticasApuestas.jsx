import React, { useState, useEffect } from 'react';
import { getBetStats } from '../../services/betService';
import CuentaSectionTitle from './CuentaSectionTitle';
import { IconRendimiento } from './CuentaIcons';
import './cuentaSections.css';
import './PanelApuestas.css';

function EstadisticasHeader() {
  return (
    <div className="cuenta-section-header">
      <CuentaSectionTitle icon={IconRendimiento} size="md">
        Estadísticas de Rendimiento
      </CuentaSectionTitle>
    </div>
  );
}

/**
 * Componente de Estadísticas Premium
 * Muestra ROI, Win Rate, Profit Total y otras métricas
 */
const EstadisticasApuestas = ({ refreshTrigger }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarEstadisticas = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getBetStats();
      if (data.success) {
        setStats(data);
      } else {
        setError(data.message || 'Error al cargar estadísticas');
      }
    } catch (err) {
      setError(err.message || 'Error al cargar estadísticas');
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarEstadisticas();
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="estadisticas-apuestas">
        <EstadisticasHeader />
        <div className="estadisticas-loading">
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="estadisticas-apuestas">
        <EstadisticasHeader />
        <div className="estadisticas-error">
          <span>⚠️</span> {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const getProfitColor = (value) => {
    if (value > 0) return 'stat-positive';
    if (value < 0) return 'stat-negative';
    return 'stat-neutral';
  };

  return (
    <div className="estadisticas-apuestas">
      <EstadisticasHeader />

      <div className="estadisticas-grid">
        <div className="stat-card stat-card-featured">
          <div className="stat-label">Profit Total</div>
          <div className={`stat-value ${getProfitColor(stats.profitTotal)}`}>
            {stats.profitTotal >= 0 ? '+' : ''}${stats.profitTotal.toFixed(2)}
          </div>
          <div className="stat-subtitle">Ganancia/Pérdida Total</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">ROI</div>
          <div className={`stat-value ${getProfitColor(stats.roi)}`}>
            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
          </div>
          <div className="stat-subtitle">Return on Investment</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value stat-neutral">{stats.winRate.toFixed(2)}%</div>
          <div className="stat-subtitle">
            {stats.totalGanadas} de {stats.totalGanadas + stats.totalPerdidas} resueltas
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total Apuestas</div>
          <div className="stat-value stat-neutral">{stats.totalApuestas}</div>
          <div className="stat-subtitle">Apuestas registradas</div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-label">Ganadas</div>
          <div className="stat-value stat-positive">{stats.totalGanadas}</div>
          <div className="stat-subtitle">
            {stats.totalApuestas > 0
              ? ((stats.totalGanadas / stats.totalApuestas) * 100).toFixed(1)
              : 0}
            % del total
          </div>
        </div>

        <div className="stat-card stat-card-danger">
          <div className="stat-label">Perdidas</div>
          <div className="stat-value stat-negative">{stats.totalPerdidas}</div>
          <div className="stat-subtitle">
            {stats.totalApuestas > 0
              ? ((stats.totalPerdidas / stats.totalApuestas) * 100).toFixed(1)
              : 0}
            % del total
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-label">Pendientes</div>
          <div className="stat-value stat-neutral">{stats.totalPendientes}</div>
          <div className="stat-subtitle">
            {stats.totalApuestas > 0
              ? ((stats.totalPendientes / stats.totalApuestas) * 100).toFixed(1)
              : 0}
            % del total
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Nulas</div>
          <div className="stat-value stat-neutral">{stats.totalNulas}</div>
          <div className="stat-subtitle">
            {stats.totalApuestas > 0
              ? ((stats.totalNulas / stats.totalApuestas) * 100).toFixed(1)
              : 0}
            % del total
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstadisticasApuestas;
