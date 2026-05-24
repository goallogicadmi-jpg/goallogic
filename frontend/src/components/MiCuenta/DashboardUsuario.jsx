import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../../context/UserContext';
import { getProfitStats, getEquipoStats } from '../../services/statsService';
import { renderProfitChart, renderEquipoChart, destroyChart } from '../../utils/chartUtils';
import CuentaSectionTitle from './CuentaSectionTitle';
import {
  IconDashboard,
  IconFavoritos,
  IconSimulador,
  IconApuestas,
  IconEvolucionProfit,
  IconRendimiento,
} from './CuentaIcons';
import './cuentaSections.css';
import './MiCuenta.css';

/**
 * Dashboard del usuario
 * Muestra un resumen rápido de la actividad del usuario:
 * - Total de apuestas
 * - Total de favoritos
 * - Capital actual del simulador
 * - Estadísticas avanzadas (profit, rendimiento por equipo)
 * - Accesos rápidos
 */
const DashboardUsuario = () => {
  const { user, favorites, simulatorState } = useUser();
  
  // Estados para estadísticas
  const [profitStats, setProfitStats] = useState(null);
  const [equipoStats, setEquipoStats] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState(null);
  const [renderingCharts, setRenderingCharts] = useState(false);

  // Refs para los canvas de las gráficas
  const profitChartRef = useRef(null);
  const equipoChartRef = useRef(null);

  // Refs para las instancias de Chart.js (para cleanup)
  const profitChartInstance = useRef(null);
  const equipoChartInstance = useRef(null);

  // Calcular totales
  const totalEquiposFavoritos = favorites?.equipos?.length || 0;
  const totalLigasFavoritas = favorites?.ligas?.length || 0;
  const totalFavoritos = totalEquiposFavoritos + totalLigasFavoritas;
  
  const capitalActual = simulatorState?.capital_actual || 0;
  const capitalInicial = simulatorState?.capital_inicial || 1000;
  const profitSimulador = capitalActual - capitalInicial;

  // Función para formatear números
  const formatNumber = (num) => {
    return new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  // Cargar estadísticas al montar
  useEffect(() => {
    loadStats();
  }, []);

  // Renderizar gráficas cuando cambien los datos
  useEffect(() => {
    if (!loadingStats && !errorStats) {
      renderAllCharts();
    }

    // Cleanup: destruir gráficas al desmontar o cuando cambien los datos
    return () => {
      destroyChart(profitChartInstance.current);
      destroyChart(equipoChartInstance.current);
    };
  }, [profitStats, equipoStats, loadingStats, errorStats]);

  // Función para cargar todas las estadísticas
  const loadStats = async () => {
    try {
      setLoadingStats(true);
      setErrorStats(null);

      const [profitData, equipoData] = await Promise.all([
        getProfitStats(),
        getEquipoStats()
      ]);

      setProfitStats(profitData);
      setEquipoStats(equipoData.equipos || []);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
      setErrorStats(error.message || 'Error al cargar estadísticas');
      setProfitStats({ profit_total: 0, profit_por_mes: [], total_apuestas: 0 });
      setEquipoStats([]);
    } finally {
      setLoadingStats(false);
    }
  };

  // Función para renderizar todas las gráficas
  const renderAllCharts = () => {
    try {
      setRenderingCharts(true);

      destroyChart(profitChartInstance.current);
      destroyChart(equipoChartInstance.current);

      if (profitChartRef.current && profitStats?.profit_por_mes && profitStats.profit_por_mes.length > 0) {
        profitChartInstance.current = renderProfitChart(
          profitChartRef.current,
          profitStats.profit_por_mes
        );
      }

      if (equipoChartRef.current && equipoStats.length > 0) {
        equipoChartInstance.current = renderEquipoChart(
          equipoChartRef.current,
          equipoStats
        );
      }
    } catch (error) {
      console.error('Error renderizando gráficas:', error);
    } finally {
      setRenderingCharts(false);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="dashboard-usuario">
      <div className="cuenta-section-header cuenta-section-header--stacked dashboard-header">
        <CuentaSectionTitle icon={IconDashboard} size="lg">
          Bienvenido, {user?.nombre || 'Usuario'}
        </CuentaSectionTitle>
        <p className="cuenta-section-desc">Resumen de tu actividad</p>
      </div>

      <div className="dashboard-cards">
        <div className="dashboard-card">
          <div className="dashboard-card-icon" aria-hidden="true">
            <IconFavoritos size={20} />
          </div>
          <div className="dashboard-card-content">
            <h3>Favoritos</h3>
            <p className="dashboard-card-value">{totalFavoritos}</p>
            <p className="dashboard-card-detail">
              {totalEquiposFavoritos} equipos • {totalLigasFavoritas} ligas
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon" aria-hidden="true">
            <IconSimulador size={20} />
          </div>
          <div className="dashboard-card-content">
            <h3>Simulador</h3>
            <p className="dashboard-card-value">{formatNumber(capitalActual)}€</p>
            <p className={`dashboard-card-detail ${profitSimulador >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {profitSimulador >= 0 ? '+' : ''}{formatNumber(profitSimulador)}€
            </p>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-icon" aria-hidden="true">
            <IconApuestas size={20} />
          </div>
          <div className="dashboard-card-content">
            <h3>Apuestas</h3>
            <p className="dashboard-card-value">
              {loadingStats ? '...' : (profitStats?.total_apuestas || 0)}
            </p>
            <p className={`dashboard-card-detail ${profitStats?.profit_total >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {loadingStats ? 'Cargando...' : (
                profitStats?.profit_total !== undefined 
                  ? `${profitStats.profit_total >= 0 ? '+' : ''}${formatNumber(profitStats.profit_total)}€`
                  : 'Sin datos'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="dashboard-quick-access">
        <CuentaSectionTitle as="h3" size="sm">
          Accesos rápidos
        </CuentaSectionTitle>
        <div className="quick-access-buttons">
          <button
            className="quick-access-button"
            onClick={() => scrollToSection('simulador-apuestas')}
          >
            Simulador
          </button>
          <button
            className="quick-access-button"
            onClick={() => scrollToSection('historial-apuestas')}
          >
            Historial
          </button>
          <button
            className="quick-access-button"
            onClick={() => scrollToSection('panel-apuestas')}
          >
            Nueva Apuesta
          </button>
        </div>
      </div>

      <div className="dashboard-stats-advanced">
        <CuentaSectionTitle as="h3" icon={IconRendimiento} size="sm" className="dashboard-stats-advanced__title">
          Estadísticas Avanzadas
        </CuentaSectionTitle>
        
        {loadingStats && (
          <div className="stats-loading">
            <div className="stats-spinner"></div>
            <p>Cargando estadísticas...</p>
          </div>
        )}

        {errorStats && !loadingStats && (
          <div className="stats-error">
            <span>⚠️</span>
            <span>{errorStats}</span>
          </div>
        )}

        {!loadingStats && !errorStats && (
          <>
            <div className="stats-section">
              <CuentaSectionTitle as="h4" size="sm">Profit Total</CuentaSectionTitle>
              <div className="stats-profit-total">
                <span className={`stats-profit-value ${profitStats?.profit_total >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  {profitStats?.profit_total !== undefined 
                    ? `${profitStats.profit_total >= 0 ? '+' : ''}${formatNumber(profitStats.profit_total)}€`
                    : '0.00€'}
                </span>
                <span className="stats-profit-label">
                  {profitStats?.total_apuestas || 0} apuestas totales
                </span>
              </div>
            </div>

            {profitStats?.profit_por_mes && profitStats.profit_por_mes.length > 0 && (
              <div className="stats-section" id="grafica-profit">
                <CuentaSectionTitle as="h4" icon={IconEvolucionProfit} size="sm">
                  Profit por Mes (Últimos 6 meses)
                </CuentaSectionTitle>
                {renderingCharts && (
                  <div className="chart-loading">
                    <div className="chart-spinner"></div>
                    <span>Generando gráfica...</span>
                  </div>
                )}
                <div className="chart-container">
                  <canvas ref={profitChartRef}></canvas>
                </div>
              </div>
            )}

            {equipoStats.length > 0 && (
              <div className="stats-section" id="grafica-equipos">
                <CuentaSectionTitle as="h4" icon={IconRendimiento} size="sm">
                  Rendimiento por Equipo (Top 5)
                </CuentaSectionTitle>
                {renderingCharts && (
                  <div className="chart-loading">
                    <div className="chart-spinner"></div>
                    <span>Generando gráfica...</span>
                  </div>
                )}
                <div className="chart-container">
                  <canvas ref={equipoChartRef}></canvas>
                </div>
                <div className="stats-table-container" style={{ marginTop: '20px' }}>
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Equipo</th>
                        <th>Total</th>
                        <th>Ganadas</th>
                        <th>Perdidas</th>
                        <th>Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipoStats.slice(0, 10).map((equipo, index) => (
                        <tr key={index}>
                          <td>{equipo.equipo}</td>
                          <td>{equipo.total_apuestas}</td>
                          <td className="stat-ganada">{equipo.ganadas}</td>
                          <td className="stat-perdida">{equipo.perdidas}</td>
                          <td className={equipo.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                            {equipo.profit >= 0 ? '+' : ''}{formatNumber(equipo.profit)}€
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!profitStats || profitStats.total_apuestas === 0) && equipoStats.length === 0 && (
              <div className="stats-no-data">
                <p>📊 No hay suficientes datos para mostrar estadísticas</p>
                <p className="stats-no-data-subtitle">Crea algunas apuestas para ver tus estadísticas aquí</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardUsuario;
