import { useState, useEffect, useCallback } from 'react';
import {
  getModerationContentDetail,
  deleteModerationPost,
  deleteModerationComment,
  restoreModerationPost,
  restoreModerationComment,
  blockCommunityUser,
  unblockCommunityUser,
  muteCommunityUser,
  unmuteCommunityUser,
  resolveModerationReport,
} from '../../services/moderationAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

export default function AdminModerationDetail({ item, onClose, onActionDone }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [muteDays, setMuteDays] = useState(7);

  const loadDetail = useCallback(async () => {
    if (!item?.contentType || !item?.id) {
      setDetail(null);
      return;
    }
    try {
      setLoading(true);
      const data = await getModerationContentDetail(item.contentType, item.id);
      setDetail(data);
    } catch (err) {
      alert(err.message || 'Error al cargar detalle');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [item?.contentType, item?.id]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const runAction = async (fn, confirmMsg) => {
    if (!window.confirm(confirmMsg)) return;
    try {
      setActionLoading(true);
      await fn();
      await loadDetail();
      onActionDone?.();
    } catch (err) {
      alert(err.message || 'Error en la acción');
    } finally {
      setActionLoading(false);
    }
  };

  if (!item) {
    return (
      <div className="admin-moderation-detail admin-moderation-detail-empty">
        <p>Selecciona un elemento de la tabla para ver el detalle y actuar.</p>
      </div>
    );
  }

  const userId = detail?.user?._id || detail?.user?.id || item?.user?._id;
  const userEmail = detail?.user?.email || item?.user?.email;
  const isDeleted = Boolean(detail?.deletedAt || item?.deletedAt);
  const isPost = item.contentType === 'post';

  return (
    <div className="admin-moderation-detail">
      <div className="admin-moderation-detail-header">
        <h3>
          {isPost ? 'Publicación' : 'Comentario'}
          {item.isReported && <span className="admin-badge badge-report-open">Reportado</span>}
        </h3>
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
        <>
          <div className="admin-moderation-content-preview">
            <p>{detail?.text || item.text}</p>
            <div className="admin-moderation-meta">
              <span>{formatAdminDate(detail?.createdAt || item.createdAt)}</span>
              {detail?.publicationType && <span> · {detail.publicationType}</span>}
              {isDeleted && <span className="admin-badge badge-deleted">Eliminado</span>}
            </div>
            {userEmail && (
              <p className="admin-moderation-author">
                <strong>Autor:</strong> {detail?.user?.nombre} ({userEmail})
              </p>
            )}
          </div>

          {detail?.reports?.length > 0 && (
            <div className="admin-moderation-reports">
              <h4>Reportes ({detail.reports.length})</h4>
              <ul>
                {detail.reports.map((r, i) => (
                  <li key={i}>
                    <strong>{r.user?.nombre || r.user?.email || 'Usuario'}</strong>
                    <p>{r.reason || 'Sin motivo'}</p>
                    <time>{formatAdminDate(r.createdAt)}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {detail?.moderationHistory?.length > 0 && (
            <div className="admin-moderation-history">
              <h4>Historial de moderación</h4>
              <ul>
                {[...detail.moderationHistory].reverse().slice(0, 8).map((h, i) => (
                  <li key={i}>
                    <code>{h.action}</code>
                    {h.actor?.nombre && ` · ${h.actor.nombre}`}
                    {h.note && ` — ${h.note}`}
                    <time>{formatAdminDate(h.at)}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="admin-moderation-actions">
            <h4>Acciones</h4>
            <div className="admin-moderation-actions-grid">
              {isDeleted ? (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      () =>
                        isPost
                          ? restoreModerationPost(item.id)
                          : restoreModerationComment(item.id),
                      '¿Restaurar este contenido?'
                    )
                  }
                >
                  Restaurar
                </button>
              ) : (
                <button
                  type="button"
                  className="admin-btn-danger"
                  disabled={actionLoading}
                  onClick={() =>
                    runAction(
                      () =>
                        isPost
                          ? deleteModerationPost(item.id)
                          : deleteModerationComment(item.id),
                      `¿Eliminar este ${isPost ? 'publicación' : 'comentario'}?`
                    )
                  }
                >
                  Eliminar
                </button>
              )}

              {item.isReported && item.reportStatus === 'open' && (
                <>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(
                        () => resolveModerationReport(item.contentType, item.id, 'dismiss'),
                        '¿Descartar reporte sin eliminar contenido?'
                      )
                    }
                  >
                    Descartar reporte
                  </button>
                  <button
                    type="button"
                    className="admin-btn-danger"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(
                        () => resolveModerationReport(item.contentType, item.id, 'delete_content'),
                        '¿Resolver eliminando el contenido?'
                      )
                    }
                  >
                    Resolver y eliminar
                  </button>
                </>
              )}
            </div>

            {userId && (
              <div className="admin-moderation-user-actions">
                <h4>Usuario</h4>
                <div className="admin-moderation-actions-grid">
                  <button
                    type="button"
                    className="admin-btn-danger"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(
                        () => blockCommunityUser(userId),
                        `¿Bloquear a ${userEmail} en la comunidad?`
                      )
                    }
                  >
                    Bloquear
                  </button>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(() => unblockCommunityUser(userId), '¿Quitar bloqueo?')
                    }
                  >
                    Desbloquear
                  </button>
                </div>
                <div className="admin-mute-row">
                  <label>
                    Silenciar (días)
                    <input
                      type="number"
                      min={1}
                      max={365}
                      className="admin-input admin-input-narrow"
                      value={muteDays}
                      onChange={(e) => setMuteDays(Number(e.target.value) || 7)}
                    />
                  </label>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(
                        () => muteCommunityUser(userId, muteDays),
                        `¿Silenciar ${muteDays} días a ${userEmail}?`
                      )
                    }
                  >
                    Silenciar
                  </button>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    disabled={actionLoading}
                    onClick={() =>
                      runAction(() => unmuteCommunityUser(userId), '¿Quitar silencio?')
                    }
                  >
                    Quitar silencio
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
