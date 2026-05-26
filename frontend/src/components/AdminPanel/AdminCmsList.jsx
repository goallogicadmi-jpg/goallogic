import { useState, useEffect, useCallback } from 'react';
import { getCmsItems } from '../../services/cmsAdminService';
import {
  CMS_TYPE_LABELS,
  getCmsStatusBadge,
  formatCmsDate,
} from './adminCmsUtils';
import './AdminPanel.css';

const EMPTY_FILTERS = { type: '', status: '', q: '', createdFrom: '', createdTo: '' };

export default function AdminCmsList({ onSelectItem, selectedId, refreshKey, onNewItem }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCmsItems({ ...appliedFilters, page: 1, limit: 60 });
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
    <div className="admin-panel-section admin-cms-list">
      <div className="admin-module-toolbar">
        <button type="button" className="admin-btn-primary" onClick={onNewItem}>
          + Nuevo contenido
        </button>
      </div>

      <form className="admin-filters admin-filters-pro" onSubmit={handleApply}>
        <div className="admin-filters-row">
          <label className="admin-filter-field">
            <span>Tipo</span>
            <select
              className="admin-input"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="news">Noticias</option>
              <option value="announcement">Comunicados</option>
              <option value="banner">Banners</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Estado</span>
            <select
              className="admin-input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="draft">Borrador</option>
              <option value="scheduled">Programado</option>
              <option value="published">Publicado</option>
              <option value="archived">Archivado</option>
            </select>
          </label>
          <label className="admin-filter-field admin-filter-grow">
            <span>Buscar</span>
            <input
              type="search"
              className="admin-input"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Título o contenido"
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
                <th>Título</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="admin-empty-cell">
                    Sin contenido. Crea una noticia, comunicado o banner.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const badge = getCmsStatusBadge(item);
                  return (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? 'admin-row-selected' : ''}
                      onClick={() => onSelectItem(item)}
                    >
                      <td>{item.title}</td>
                      <td>
                        <span className="admin-badge badge-type">
                          {CMS_TYPE_LABELS[item.type] || item.type}
                        </span>
                      </td>
                      <td>
                        <span className={`admin-badge ${badge.className}`}>{badge.text}</span>
                      </td>
                      <td>{formatCmsDate(item.updatedAt)}</td>
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
