import { useState, useEffect, useCallback } from 'react';
import {
  getAdminCoupon,
  deactivateCoupon,
  activateCoupon,
  setCheckoutDefaultCoupon,
  getCouponStats,
} from '../../services/couponsAdminService';
import './AdminPanel.css';

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

export default function AdminCouponDetail({ couponItem, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!couponItem?.stripeCouponId) {
      setDetail(null);
      return;
    }
    try {
      setLoading(true);
      const [data, statsData] = await Promise.all([
        getAdminCoupon(couponItem.stripeCouponId),
        getCouponStats(couponItem.stripeCouponId).catch(() => null),
      ]);
      setDetail(data);
      setStats(statsData);
    } catch (err) {
      alert(err.message || 'Error al cargar');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [couponItem?.stripeCouponId]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, msg) => {
    if (msg && !window.confirm(msg)) return;
    try {
      setActionLoading(true);
      await fn();
      await load();
      onUpdated?.();
    } catch (err) {
      alert(err.message || 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  if (!couponItem) {
    return (
      <div className="admin-coupon-detail admin-coupon-detail-empty">
        <p>Selecciona un cupón o crea uno nuevo.</p>
      </div>
    );
  }

  return (
    <div className="admin-coupon-detail">
      <div className="admin-coupon-detail-header">
        <h3>{detail?.promoCode || couponItem.promoCode || 'Cupón'}</h3>
        {onClose && (
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
        </div>
      ) : (
        detail && (
          <>
            <div className="admin-coupon-detail-meta">
              <span className={`admin-badge ${statusClass(detail.status)}`}>
                {detail.statusLabel}
              </span>
              <span className="admin-badge badge-type">{detail.discountLabel}</span>
              {detail.livemode === false && (
                <span className="admin-badge coupon-status-inactive">TEST</span>
              )}
            </div>

            <dl className="admin-audit-dl">
              <dt>ID cupón Stripe</dt>
              <dd>
                <code>{detail.stripeCouponId}</code>
              </dd>
              {detail.stripePromotionCodeId && (
                <>
                  <dt>Promotion code</dt>
                  <dd>
                    <code>{detail.stripePromotionCodeId}</code>
                  </dd>
                </>
              )}
              <dt>Duración</dt>
              <dd>{detail.duration}</dd>
              <dt>Usos</dt>
              <dd>
                {detail.timesRedeemed ?? 0}
                {detail.maxRedemptions ? ` / ${detail.maxRedemptions}` : ' (ilimitado)'}
              </dd>
              {detail.expiresAt && (
                <>
                  <dt>Expira</dt>
                  <dd>{new Date(detail.expiresAt).toLocaleString('es-ES')}</dd>
                </>
              )}
            </dl>

            {stats && (
              <div className="admin-coupon-stats">
                <h4>Estadísticas</h4>
                <p>Redenciones Stripe: {stats.timesRedeemed ?? 0}</p>
                <p className="admin-meta-small">{stats.note}</p>
              </div>
            )}

            <div className="admin-league-actions">
              {detail.status === 'active' ? (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={actionLoading}
                  onClick={() =>
                    run(
                      () => deactivateCoupon(detail.stripeCouponId),
                      '¿Desactivar este cupón?'
                    )
                  }
                >
                  Desactivar
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={actionLoading}
                  onClick={() =>
                    run(() => activateCoupon(detail.stripeCouponId), '¿Activar este cupón?')
                  }
                >
                  Activar
                </button>
              )}
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={actionLoading}
                onClick={() =>
                  run(
                    () => setCheckoutDefaultCoupon(detail.stripeCouponId),
                    '¿Aplicar automáticamente en checkout?'
                  )
                }
              >
                Auto checkout
              </button>
            </div>
          </>
        )
      )}
    </div>
  );
}
