import { useState, useEffect, useCallback } from 'react';
import { getAuditLogs, getAuditLogStats } from '../../services/auditLogsAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

const MODULE_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'auth', label: 'Auth' },
  { id: 'premium', label: 'Premium' },
  { id: 'moderation', label: 'Moderación' },
  { id: 'admin', label: 'Admin' },
  { id: 'error', label: 'Errores' },
];

const EMPTY_FILTERS = {
  module: 'all',
  level: '',
  actorId: '',
  userId: '',
  q: '',
  createdFrom: '',
  createdTo: '',
  last24h: '',
};

function moduleBadgeClass(module) {
  return `log-badge log-badge-${module || 'system'}`;
}

function levelBadgeClass(level) {
  if (level === 'critical' || level === 'error') return 'log-level-error';
  if (level === 'security') return 'log-level-security';
  if (level === 'webhook') return 'log-level-webhook';
  if (level === 'warn') return 'log-level-warn';
  return 'log-level-info';
}

export default function AdminAuditLogList({
  onSelectLog,
  selectedId,
  refreshKey,
  onExport,
  onImport,
}) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const query = {
        ...appliedFilters,
        module: appliedFilters.module === 'all' ? '' : appliedFilters.module,
        page,
        limit: 50,
      };
      const [data, statsData] = await Promise.all([
        getAuditLogs(query),
        getAuditLogStats().catch(() => null),
      ]);
      setItems(data.items || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Error al cargar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = (e) => {
    e?.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleTab = (moduleId) => {
    const next = { ...filters, module: moduleId, last24h: '' };
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  };

  const handleLast24h = () => {
    const next = { ...EMPTY_FILTERS, module: filters.module, last24h: 'true' };
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
  };

  return (
    <div className="admin-panel-section admin-audit-list">
      <div className="admin-pro-subnav admin-audit-tabs">
        {MODULE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`admin-nav-btn ${appliedFilters.module === tab.id ? 'active' : ''}`}
            onClick={() => handleTab(tab.id)}
          >
            {tab.label}
            {stats?.last24h?.[tab.id] != null && tab.id !== 'all' && (
              <span className="admin-tab-count">{stats.last24h[tab.id]}</span>
            )}
          </button>
        ))}
        <button type="button" className="admin-nav-btn admin-nav-btn-accent" onClick={handleLast24h}>
          Últimas 24h
        </button>
      </div>

      <form className="admin-filters admin-filters-pro" onSubmit={handleApply}>
        <div className="admin-filters-row">
          <label className="admin-filter-field admin-filter-grow">
            <span>Buscar</span>
            <input
              type="search"
              className="admin-input"
              placeholder="Mensaje, email, endpoint…"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </label>
          <label className="admin-filter-field">
            <span>Nivel</span>
            <select
              className="admin-input"
              value={filters.level}
              onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="security">Security</option>
              <option value="webhook">Webhook</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Actor (ID)</span>
            <input
              className="admin-input"
              value={filters.actorId}
              onChange={(e) => setFilters((f) => ({ ...f, actorId: e.target.value }))}
            />
          </label>
          <label className="admin-filter-field">
            <span>Desde</span>
            <input
              type="date"
              className="admin-input"
              value={filters.createdFrom}
              onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value, last24h: '' }))}
            />
          </label>
          <label className="admin-filter-field">
            <span>Hasta</span>
            <input
              type="date"
              className="admin-input"
              value={filters.createdTo}
              onChange={(e) => setFilters((f) => ({ ...f, createdTo: e.target.value, last24h: '' }))}
            />
          </label>
        </div>
        <div className="admin-filters-row admin-filter-actions-row">
          <button type="submit" className="admin-btn-primary">
            Filtrar
          </button>
          <button type="button" className="admin-btn-secondary" onClick={onExport}>
            Exportar CSV
          </button>
          <button type="button" className="admin-btn-ghost" onClick={onImport}>
            Importar Winston
          </button>
          <span className="admin-audit-total">{total} eventos</span>
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
        <>
          <div className="admin-table-container">
            <table className="admin-table admin-table-clickable">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Módulo</th>
                  <th>Nivel</th>
                  <th>Evento</th>
                  <th>Resumen</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="admin-empty-cell">
                      Sin logs. Usa «Importar Winston» para cargar histórico local.
                    </td>
                  </tr>
                ) : (
                  items.map((row) => (
                    <tr
                      key={row.id}
                      className={selectedId === row.id ? 'admin-row-selected' : ''}
                      onClick={() => onSelectLog(row)}
                    >
                      <td>{formatAdminDate(row.timestamp, true)}</td>
                      <td>
                        <span className={moduleBadgeClass(row.module)}>{row.moduleLabel}</span>
                      </td>
                      <td>
                        <span className={`log-level-pill ${levelBadgeClass(row.level)}`}>
                          {row.level}
                        </span>
                      </td>
                      <td>
                        <code className="admin-log-message">{row.message}</code>
                      </td>
                      <td className="admin-preview-cell">{row.preview || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="admin-pagination">
              <button
                type="button"
                className="admin-btn-ghost"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span>
                Página {page} / {pages}
              </span>
              <button
                type="button"
                className="admin-btn-ghost"
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
