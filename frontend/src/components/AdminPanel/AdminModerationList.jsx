import { useState, useEffect, useCallback } from 'react';
import {
  getModerationContent,
  getModerationReports,
} from '../../services/moderationAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

const EMPTY_FILTERS = {
  contentType: 'all',
  userId: '',
  createdFrom: '',
  createdTo: '',
  reported: '',
  publicationType: '',
  q: '',
  includeDeleted: '',
};

function contentTypeLabel(type) {
  return type === 'post' ? 'Publicación' : 'Comentario';
}

function reportBadge(item) {
  if (!item.isReported) return null;
  const status = item.reportStatus || 'open';
  const cls =
    status === 'open' ? 'badge-report-open' : status === 'resolved' ? 'badge-report-resolved' : 'badge-report-dismissed';
  return (
    <span className={`admin-badge ${cls}`}>
      {status === 'open' ? 'Reportado' : status === 'resolved' ? 'Resuelto' : 'Descartado'}
    </span>
  );
}

export default function AdminModerationList({
  viewMode,
  onSelectItem,
  selectedKey,
  refreshKey,
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
      if (viewMode === 'reports') {
        const data = await getModerationReports({ status: 'open' });
        setItems(data.items || []);
      } else {
        const data = await getModerationContent({ ...appliedFilters, page: 1, limit: 80 });
        setItems(data.items || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, appliedFilters, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApply = (e) => {
    e?.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const itemKey = (item) => `${item.contentType}:${item.id}`;

  return (
    <div className="admin-panel-section admin-moderation-list">
      {viewMode === 'content' && (
        <form className="admin-filters admin-filters-pro" onSubmit={handleApply}>
          <div className="admin-filters-row">
            <label className="admin-filter-field">
              <span>Tipo</span>
              <select
                className="admin-input"
                value={filters.contentType}
                onChange={(e) => setFilters((f) => ({ ...f, contentType: e.target.value }))}
              >
                <option value="all">Todo</option>
                <option value="post">Publicaciones</option>
                <option value="comment">Comentarios</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>Reportes</span>
              <select
                className="admin-input"
                value={filters.reported}
                onChange={(e) => setFilters((f) => ({ ...f, reported: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="true">Solo reportados</option>
                <option value="false">Sin reportar</option>
              </select>
            </label>
            <label className="admin-filter-field">
              <span>Usuario (ID)</span>
              <input
                className="admin-input"
                placeholder="ObjectId"
                value={filters.userId}
                onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              />
            </label>
            <label className="admin-filter-field">
              <span>Desde</span>
              <input
                type="date"
                className="admin-input"
                value={filters.createdFrom}
                onChange={(e) => setFilters((f) => ({ ...f, createdFrom: e.target.value }))}
              />
            </label>
            <label className="admin-filter-field">
              <span>Hasta</span>
              <input
                type="date"
                className="admin-input"
                value={filters.createdTo}
                onChange={(e) => setFilters((f) => ({ ...f, createdTo: e.target.value }))}
              />
            </label>
          </div>
          <div className="admin-filters-row">
            <label className="admin-filter-field admin-filter-grow">
              <span>Texto</span>
              <input
                type="search"
                className="admin-input"
                placeholder="Buscar en contenido"
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              />
            </label>
            <button type="submit" className="admin-btn-primary">
              Filtrar
            </button>
          </div>
        </form>
      )}

      {viewMode === 'reports' && (
        <p className="admin-moderation-hint">Cola de reportes abiertos de la comunidad.</p>
      )}

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
                <th>Tipo</th>
                <th>Autor</th>
                <th>Vista previa</th>
                <th>Fecha</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty-cell">
                    Sin resultados
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const key = itemKey(item);
                  const author = item.user;
                  return (
                    <tr
                      key={key}
                      className={selectedKey === key ? 'admin-row-selected' : ''}
                      onClick={() => onSelectItem(item)}
                    >
                      <td>
                        <span className="admin-badge badge-type">
                          {contentTypeLabel(item.contentType)}
                        </span>
                        {item.publicationType && (
                          <span className="admin-meta-small">{item.publicationType}</span>
                        )}
                      </td>
                      <td>
                        {author?.nombre || '—'}
                        <br />
                        <span className="admin-meta-small">{author?.email || ''}</span>
                      </td>
                      <td className="admin-preview-cell">{item.text?.slice(0, 80)}…</td>
                      <td>{formatAdminDate(item.createdAt)}</td>
                      <td>
                        {item.deletedAt && (
                          <span className="admin-badge badge-deleted">Eliminado</span>
                        )}
                        {reportBadge(item)}
                        {author?.communityBlocked && (
                          <span className="admin-badge badge-blocked">Bloqueado</span>
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
