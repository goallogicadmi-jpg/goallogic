import { useState, useEffect, useCallback } from 'react';
import {
  getMessageCampaigns,
  getMessageCampaign,
  cancelMessageCampaign,
} from '../../services/messagesAdminService';
import { STATUS_LABELS } from './AdminMessagesBulk';
import './AdminPanel.css';

function statusClass(status) {
  return `admin-campaign-status admin-campaign-status--${status}`;
}

export default function AdminMessageCampaigns() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ status: '', q: '', from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMessageCampaigns(filters);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (item) => {
    setSelected(item);
    try {
      const data = await getMessageCampaign(item.id);
      setDetail(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('¿Cancelar esta campaña programada?')) return;
    try {
      await cancelMessageCampaign(id);
      load();
      if (selected?.id === id) {
        setSelected(null);
        setDetail(null);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="admin-message-campaigns">
      <div className="admin-filters-row">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar título…"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className="admin-input"
        />
        <input
          type="date"
          value={filters.from}
          onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          className="admin-input"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          className="admin-input"
        />
        <button type="button" className="admin-btn-secondary" onClick={load}>
          Filtrar
        </button>
      </div>

      {error && <p className="admin-settings-error">{error}</p>}
      {loading ? (
        <p className="admin-settings-muted">Cargando campañas…</p>
      ) : items.length === 0 ? (
        <p className="admin-empty-text">No hay campañas con estos filtros</p>
      ) : (
        <div className="admin-campaigns-layout">
          <ul className="admin-campaigns-list">
            {items.map((item) => (
              <li
                key={item.id}
                className={selected?.id === item.id ? 'is-selected' : ''}
                onClick={() => openDetail(item)}
              >
                <div className="admin-campaigns-list__head">
                  <strong>{item.titulo}</strong>
                  <span className={statusClass(item.status)}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <div className="admin-campaigns-list__meta">
                  <span>
                    {item.stats.delivered}/{item.stats.targetCount} entregados
                  </span>
                  <span>{item.stats.openRate ?? 0}% leídos</span>
                  {item.stats.errors > 0 && (
                    <span className="admin-campaign-errors">{item.stats.errors} errores</span>
                  )}
                </div>
                <div className="admin-campaigns-list__date">
                  {item.sendMode === 'scheduled' && item.scheduledAt
                    ? `Programado: ${new Date(item.scheduledAt).toLocaleString('es-ES')}`
                    : new Date(item.createdAt).toLocaleString('es-ES')}
                </div>
              </li>
            ))}
          </ul>

          {detail?.campaign && (
            <aside className="admin-campaign-detail">
              <h3>{detail.campaign.titulo}</h3>
              <span className={statusClass(detail.campaign.status)}>
                {STATUS_LABELS[detail.campaign.status]}
              </span>

              <div className="admin-campaign-stats-grid">
                <div>
                  <span className="admin-stat-label">Objetivo</span>
                  <span className="admin-stat-value-small">
                    {detail.campaign.stats.targetCount}
                  </span>
                </div>
                <div>
                  <span className="admin-stat-label">Entregados</span>
                  <span className="admin-stat-value-small">
                    {detail.campaign.stats.delivered}
                  </span>
                </div>
                <div>
                  <span className="admin-stat-label">Leídos</span>
                  <span className="admin-stat-value-small admin-stat-read">
                    {detail.campaign.stats.opened}
                  </span>
                </div>
                <div>
                  <span className="admin-stat-label">Errores</span>
                  <span className="admin-stat-value-small admin-stat-unread">
                    {detail.campaign.stats.errors}
                  </span>
                </div>
              </div>

              {detail.campaign.status === 'scheduled' && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => handleCancel(detail.campaign.id)}
                >
                  Cancelar programación
                </button>
              )}

              {detail.errorLog?.length > 0 && (
                <div className="admin-campaign-errors-log">
                  <h4>Errores</h4>
                  <ul>
                    {detail.errorLog.slice(0, 10).map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
