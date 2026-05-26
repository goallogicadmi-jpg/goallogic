import { useState, useEffect, useCallback } from 'react';
import { getAuditLogDetail } from '../../services/auditLogsAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

function moduleBadgeClass(module) {
  return `log-badge log-badge-${module || 'system'}`;
}

export default function AdminAuditLogDetail({ logItem, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!logItem?.id) {
      setDetail(null);
      return;
    }
    try {
      setLoading(true);
      const data = await getAuditLogDetail(logItem.id);
      setDetail(data);
    } catch (err) {
      alert(err.message || 'Error al cargar detalle');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [logItem?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!logItem) {
    return (
      <div className="admin-audit-detail admin-audit-detail-empty">
        <p>Selecciona un evento para ver timestamp, actor y payload completo.</p>
      </div>
    );
  }

  const payload = detail?.payload || {};
  const payloadKeys = Object.keys(payload).filter(
    (k) => !['level', 'message', 'timestamp'].includes(k)
  );

  return (
    <div className="admin-audit-detail">
      <div className="admin-audit-detail-header">
        <h3>Detalle del log</h3>
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
            <div className="admin-audit-detail-meta">
              <span className={moduleBadgeClass(detail.module)}>{detail.moduleLabel}</span>
              <span className={`log-level-pill log-level-${detail.level}`}>{detail.level}</span>
            </div>

            <dl className="admin-audit-dl">
              <dt>Evento</dt>
              <dd>
                <code>{detail.message}</code>
              </dd>
              <dt>Timestamp</dt>
              <dd>{formatAdminDate(detail.timestamp, true)}</dd>
              {detail.actorId && (
                <>
                  <dt>Actor (admin/usuario)</dt>
                  <dd>
                    <code>{detail.actorId}</code>
                  </dd>
                </>
              )}
              {detail.targetUserId && (
                <>
                  <dt>Usuario objetivo</dt>
                  <dd>
                    <code>{detail.targetUserId}</code>
                  </dd>
                </>
              )}
              {detail.email && (
                <>
                  <dt>Email</dt>
                  <dd>{detail.email}</dd>
                </>
              )}
              {detail.ip && (
                <>
                  <dt>IP</dt>
                  <dd>{detail.ip}</dd>
                </>
              )}
              {detail.endpoint && (
                <>
                  <dt>Endpoint</dt>
                  <dd>
                    <code>{detail.endpoint}</code>
                  </dd>
                </>
              )}
            </dl>

            <div className="admin-audit-payload">
              <h4>Payload</h4>
              {payloadKeys.length === 0 ? (
                <p className="admin-meta-small">Sin campos adicionales</p>
              ) : (
                <ul className="admin-audit-payload-list">
                  {payloadKeys.map((key) => (
                    <li key={key}>
                      <strong>{key}</strong>
                      <pre>{formatPayloadValue(payload[key])}</pre>
                    </li>
                  ))}
                </ul>
              )}
              <details className="admin-audit-raw">
                <summary>JSON completo</summary>
                <pre>{JSON.stringify(payload, null, 2)}</pre>
              </details>
            </div>
          </>
        )
      )}
    </div>
  );
}

function formatPayloadValue(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
