import { useState, useEffect, useCallback } from 'react';
import { getAdminLeagues } from '../../services/leaguesAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

const EMPTY_FILTERS = { domain: '', active: '', q: '' };

function healthBadge(health) {
  const label = health?.label || 'unknown';
  const map = {
    healthy: { text: 'Saludable', cls: 'league-health-ok' },
    partial: { text: 'Parcial', cls: 'league-health-partial' },
    error: { text: 'Error', cls: 'league-health-error' },
    unknown: { text: 'Sin sync', cls: 'league-health-unknown' },
  };
  return map[label] || map.unknown;
}

export default function AdminLeagueList({
  onSelectLeague,
  selectedId,
  refreshKey,
  onSyncAll,
  syncAllLoading,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAdminLeagues({ ...appliedFilters, limit: 100 });
      setItems(data.items || []);
    } catch (err) {
      setError(err.message || 'Error al cargar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = (e) => {
    e?.preventDefault();
    setAppliedFilters({ ...filters });
  };

  return (
    <div className="admin-panel-section admin-league-list">
      <div className="admin-module-toolbar">
        <button
          type="button"
          className="admin-btn-secondary"
          disabled={syncAllLoading}
          onClick={onSyncAll}
        >
          {syncAllLoading ? 'Sincronizando…' : 'Sync ligas activas'}
        </button>
      </div>

      <form className="admin-filters admin-filters-pro" onSubmit={handleApply}>
        <div className="admin-filters-row">
          <label className="admin-filter-field">
            <span>Dominio</span>
            <select
              className="admin-input"
              value={filters.domain}
              onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="club">Clubes</option>
              <option value="selection">Selecciones</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Estado</span>
            <select
              className="admin-input"
              value={filters.active}
              onChange={(e) => setFilters((f) => ({ ...f, active: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="true">Activas</option>
              <option value="false">Inactivas</option>
            </select>
          </label>
          <label className="admin-filter-field admin-filter-grow">
            <span>Buscar</span>
            <input
              type="search"
              className="admin-input"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Nombre o país"
            />
          </label>
          <button type="submit" className="admin-btn-primary">
            Filtrar
          </button>
        </div>
      </form>

      {error && (
        <div className="admin-error">
          <span>{error}</span>
          <button type="button" className="admin-btn-retry" onClick={load}>
            Reintentar
          </button>
        </div>
      )}

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table admin-table-clickable">
            <thead>
              <tr>
                <th></th>
                <th>Liga</th>
                <th>Estado</th>
                <th>Salud</th>
                <th>Última sync</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty-cell">
                    Sin ligas en catálogo
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const hb = healthBadge(item.health);
                  return (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? 'admin-row-selected' : ''}
                      onClick={() => onSelectLeague(item)}
                    >
                      <td className="admin-league-logo-cell">
                        {item.logo ? (
                          <img
                            src={item.logo}
                            alt=""
                            className="admin-league-logo-thumb"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="admin-meta-small">
                          {item.country} · ID {item.leagueId}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`admin-badge ${
                            item.active ? 'cms-status-published' : 'cms-status-archived'
                          }`}
                        >
                          {item.active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${hb.cls}`}>{hb.text}</span>
                      </td>
                      <td>
                        {item.lastSyncAt ? formatAdminDate(item.lastSyncAt, true) : '—'}
                        {item.lastSyncDurationMs != null && (
                          <span className="admin-meta-small"> · {item.lastSyncDurationMs}ms</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
