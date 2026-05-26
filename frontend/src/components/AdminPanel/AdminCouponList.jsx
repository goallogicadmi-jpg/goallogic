import { useState, useEffect, useCallback } from 'react';
import { getAdminCoupons } from '../../services/couponsAdminService';
import './AdminPanel.css';

const EMPTY_FILTERS = { status: '', type: '', q: '' };

function statusClass(status) {
  const map = {
    active: 'coupon-status-active',
    inactive: 'coupon-status-inactive',
    expired: 'coupon-status-expired',
    exhausted: 'coupon-status-exhausted',
    scheduled: 'coupon-status-scheduled',
  };
  return map[status] || 'coupon-status-inactive';
}

export default function AdminCouponList({
  onSelectCoupon,
  selectedId,
  refreshKey,
  onCreateNew,
  envCouponId,
  onEnvLoaded,
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
      const data = await getAdminCoupons(appliedFilters);
      setItems(data.items || []);
      onEnvLoaded?.(data.envCouponId);
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
    <div className="admin-panel-section admin-coupon-list">
      <div className="admin-module-toolbar">
        <button type="button" className="admin-btn-primary" onClick={onCreateNew}>
          + Crear cupón
        </button>
      </div>

      {envCouponId && (
        <p className="admin-coupon-env-hint">
          Checkout env: <code>{envCouponId}</code> (si no hay auto-aplicar en panel)
        </p>
      )}

      <form className="admin-filters admin-filters-pro" onSubmit={handleApply}>
        <div className="admin-filters-row">
          <label className="admin-filter-field">
            <span>Estado</span>
            <select
              className="admin-input"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="expired">Expirado</option>
              <option value="exhausted">Agotado</option>
              <option value="scheduled">Programado</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Tipo</span>
            <select
              className="admin-input"
              value={filters.type}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="percent">Porcentaje</option>
              <option value="amount">Monto fijo</option>
            </select>
          </label>
          <label className="admin-filter-field admin-filter-grow">
            <span>Buscar</span>
            <input
              type="search"
              className="admin-input"
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
              placeholder="Código o nombre"
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
                <th>Código</th>
                <th>Descuento</th>
                <th>Usos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan="4" className="admin-empty-cell">
                    Sin cupones en Stripe. Crea uno nuevo.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={`${item.stripeCouponId}-${item.stripePromotionCodeId || ''}`}
                    className={selectedId === item.stripeCouponId ? 'admin-row-selected' : ''}
                    onClick={() => onSelectCoupon(item)}
                  >
                    <td>
                      <code>{item.promoCode || '—'}</code>
                      {item.autoApplyCheckout && (
                        <span className="admin-badge coupon-auto-badge">Auto checkout</span>
                      )}
                    </td>
                    <td>{item.discountLabel}</td>
                    <td>
                      {item.timesRedeemed ?? 0}
                      {item.maxRedemptions ? ` / ${item.maxRedemptions}` : ' / ∞'}
                    </td>
                    <td>
                      <span className={`admin-badge ${statusClass(item.status)}`}>
                        {item.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
