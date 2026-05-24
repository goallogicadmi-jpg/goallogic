import React, { useState, useEffect } from 'react';
import { getAdminStats } from '../../services/adminService';
import './AdminPanel.css';

/**
 * Dashboard principal del panel de administración
 * Muestra estadísticas globales del sistema
 */
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas:', err);
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-panel-section">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-section">
        <div className="admin-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={loadStats} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-section">
      <div className="admin-section-header">
        <h2>Panel de Administración</h2>
        <p>Vista general del sistema</p>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon">👥</div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.total_users || 0}</div>
            <div className="admin-stat-label">Usuarios</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">🛡️</div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.total_admins || 0}</div>
            <div className="admin-stat-label">Administradores</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">📬</div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.total_messages || 0}</div>
            <div className="admin-stat-label">Mensajes Totales</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">🔔</div>
          <div className="admin-stat-content">
            <div className="admin-stat-value admin-stat-unread">{stats?.unread_messages || 0}</div>
            <div className="admin-stat-label">Mensajes No Leídos</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">📊</div>
          <div className="admin-stat-content">
            <div className="admin-stat-value">{stats?.total_bets || 0}</div>
            <div className="admin-stat-label">Apuestas Totales</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
