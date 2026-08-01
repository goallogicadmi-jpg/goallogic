import { useEffect, useState } from 'react';
import {
  getAdminAnalystDetail,
  applyAnalystSanctions,
  forceCancelSubscription,
  suspendAnalystMessage,
  suspendAnalyst,
  removeAnalyst,
  grantAnalystVerification,
  formatDate,
  formatPriceCents,
  analystStatusLabel,
} from '../../../../services/analystAdminService';
import { AnalystAdminMiniChart } from './AnalystAdminDashboard';

export default function AnalystAdminDetail({ analystId, onBack, isMainAdmin = false, initialTab = 'overview' }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab, analystId]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminAnalystDetail(analystId);
      setDetail(data);
    } catch (err) {
      setError(err.message || 'Error al cargar analista');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [analystId]);

  const handleSanction = async (payload) => {
    try {
      await applyAnalystSanctions(analystId, payload);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWarning = async () => {
    if (!warning.trim()) return;
    await handleSanction({ warningMessage: warning.trim() });
    setWarning('');
  };

  const handleCancelSub = async (subscriptionId) => {
    if (!window.confirm('¿Forzar cancelación de esta suscripción?')) return;
    try {
      await forceCancelSubscription(analystId, subscriptionId);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspendMessage = async (messageId) => {
    const reason = window.prompt('Motivo de suspensión del mensaje:');
    if (!reason) return;
    try {
      await suspendAnalystMessage(messageId, reason);
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspendToggle = async () => {
    const suspended = detail.analystStatus === 'suspended';
    let reason = '';
    if (!suspended) reason = window.prompt('Motivo de suspensión (opcional):') || '';
    try {
      await suspendAnalyst(analystId, { suspend: !suspended, reason });
      await load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveAnalyst = async () => {
    if (!window.confirm('¿Eliminar analista? Se revertirá su rol a usuario.')) return;
    try {
      await removeAnalyst(analystId);
      onBack?.();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Cargando detalle del analista…</p>;
  if (error || !detail) return <div className="admin-error">{error || 'No encontrado'}</div>;

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'history', label: 'Historial' },
    { id: 'posts', label: 'Publicaciones' },
    { id: 'subscribers', label: 'Suscriptores' },
    { id: 'messages', label: 'Mensajes' },
    { id: 'payments', label: 'Pagos' },
    { id: 'sanctions', label: 'Sanciones' },
  ];

  return (
    <div className="analyst-admin-detail">
      <div className="analyst-admin-detail__header analyst-admin-detail__profile">
        <button type="button" className="admin-btn-secondary" onClick={onBack}>
          ← Volver
        </button>
        <div className="analyst-admin-user-cell">
          {detail.foto_perfil_url ? (
            <img src={detail.foto_perfil_url} alt="" className="analyst-admin-avatar analyst-admin-avatar--lg" />
          ) : (
            <span className="analyst-admin-avatar analyst-admin-avatar--lg analyst-admin-avatar--placeholder">
              {(detail.nombre || '?').charAt(0)}
            </span>
          )}
          <div>
            <h3>{detail.nombre}</h3>
            <p><code>{detail.publicId}</code> · {detail.pais || '—'}</p>
            <p>
              {analystStatusLabel(detail.analystStatus)} · {detail.verified ? 'Verificado' : 'Sin verificar'} · ROI {detail.roi}% · Acierto {detail.winRate}% · Racha {detail.currentStreak ?? detail.stats?.currentStreak ?? 0}
            </p>
            {detail.analystDescription ? <p className="admin-panel-card__hint">{detail.analystDescription}</p> : null}
          </div>
        </div>
        <div className="analyst-admin-actions">
          <button type="button" className="admin-btn-secondary" onClick={() => setTab('sanctions')}>
            Editar / Sanciones
          </button>
          <button
            type="button"
            className={detail.analystStatus === 'suspended' ? 'admin-btn-primary' : 'admin-btn-danger'}
            onClick={handleSuspendToggle}
          >
            {detail.analystStatus === 'suspended' ? 'Reactivar' : 'Suspender'}
          </button>
          {!detail.verified ? (
            <button type="button" className="admin-btn-primary" onClick={() => grantAnalystVerification(analystId).then(load)}>
              Activar verificado
            </button>
          ) : (
            <button type="button" className="admin-btn-danger" onClick={() => handleSanction({ removeVerification: true })}>
              Quitar verificado
            </button>
          )}
          {isMainAdmin ? (
            <button type="button" className="admin-btn-danger" onClick={handleRemoveAnalyst}>
              Eliminar analista
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-panel-nav analyst-admin-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-nav-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <section className="admin-panel-card">
          <p>Email (admin): <strong>{detail.email}</strong></p>
          <p>Suscriptores: <strong>{detail.subscribers}</strong></p>
          <p>Ingresos: <strong>{formatPriceCents(detail.totalRevenueCents)}</strong></p>
          <p>Precio mensual: <strong>{formatPriceCents(detail.analystSubscriptionPriceCents)}</strong></p>
          <p>Stripe Price ID: <code>{detail.analystStripePriceId || '—'}</code></p>
          <p>Racha actual: <strong>{detail.stats?.currentStreak ?? 0}</strong></p>
          <AnalystAdminMiniChart timeline={detail.performanceTimeline} />
        </section>
      ) : null}

      {tab === 'history' ? (
        <section className="admin-panel-card">
          <div className="analyst-admin-summary-row">
            <span>Ganadas: {detail.stats?.totalGanadas ?? 0}</span>
            <span>Perdidas: {detail.stats?.totalPerdidas ?? 0}</span>
            <span>Racha: {detail.stats?.currentStreak ?? 0}</span>
          </div>
          <AnalystAdminMiniChart timeline={detail.performanceTimeline} />
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Partido</th>
                  <th>Mercado</th>
                  <th>Cuota</th>
                  <th>Resultado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {(detail.bets || []).map((bet) => (
                  <tr key={bet._id}>
                    <td>{bet.partido}</td>
                    <td>{bet.mercado}</td>
                    <td>{bet.cuota}</td>
                    <td>{bet.resultado}</td>
                    <td>{formatDate(bet.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'posts' ? (
        <section className="admin-panel-card">
          {(detail.posts || []).length ? (
            <ul className="analyst-admin-post-list">
              {detail.posts.map((post) => (
                <li key={post._id}>
                  <strong>{post.publicationType}</strong>
                  <p>{post.text}</p>
                  <small>{formatDate(post.createdAt)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin publicaciones.</p>
          )}
        </section>
      ) : null}

      {tab === 'subscribers' ? (
        <section className="admin-panel-card">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>publicId</th>
                  <th>Estado</th>
                  <th>Inicio</th>
                  <th>Renovación</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {(detail.subscribers || []).map((sub) => (
                  <tr key={sub.subscriptionId}>
                    <td>{sub.subscriber?.name || '—'}</td>
                    <td><code>{sub.subscriber?.publicId || '—'}</code></td>
                    <td>{sub.status}</td>
                    <td>{formatDate(sub.startedAt)}</td>
                    <td>{formatDate(sub.currentPeriodEnd)}</td>
                    <td>
                      {sub.status !== 'canceled' ? (
                        <button
                          type="button"
                          className="admin-btn-danger"
                          onClick={() => handleCancelSub(sub.subscriptionId)}
                        >
                          Forzar cancelación
                        </button>
                      ) : (
                        formatDate(sub.canceledAt)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'messages' ? (
        <section className="admin-panel-card">
          {(detail.messages || []).length ? (
            <ul className="analyst-admin-message-list">
              {detail.messages.map((msg) => (
                <li key={msg.id} className={msg.suspended ? 'is-suspended' : ''}>
                  <header>
                    <strong>{msg.title}</strong>
                    <span>{formatDate(msg.createdAt)}</span>
                  </header>
                  <p>{msg.content}</p>
                  {msg.suspended ? (
                    <small>Suspendido: {msg.suspendedReason}</small>
                  ) : (
                    <button
                      type="button"
                      className="admin-btn-danger"
                      onClick={() => handleSuspendMessage(msg.id)}
                    >
                      Suspender mensaje
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin mensajes enviados.</p>
          )}
        </section>
      ) : null}

      {tab === 'payments' ? (
        <section className="admin-panel-card">
          <p>Total ingresos: <strong>{formatPriceCents(detail.totalRevenueCents)}</strong></p>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {(detail.payments || []).map((pay) => (
                  <tr key={pay._id}>
                    <td>{formatDate(pay.paidAt)}</td>
                    <td>{formatPriceCents(pay.amountCents)}</td>
                    <td>{pay.status}</td>
                    <td><code>{pay.stripeInvoiceId || '—'}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'sanctions' ? (
        <section className="admin-panel-card analyst-admin-sanctions">
          <div className="analyst-admin-sanction-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => handleSanction({ blockPosts: !detail.analystPostsBlocked })}
            >
              {detail.analystPostsBlocked ? 'Desbloquear publicaciones' : 'Bloquear publicaciones'}
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={() => handleSanction({ blockMessages: !detail.analystMessagesBlocked })}
            >
              {detail.analystMessagesBlocked ? 'Desbloquear mensajes' : 'Bloquear mensajes'}
            </button>
            <button
              type="button"
              className="admin-btn-primary"
              onClick={() => handleSanction({ grantVerification: true })}
            >
              Activar insignia verificado
            </button>
            <button
              type="button"
              className="admin-btn-danger"
              onClick={() => {
                if (window.confirm('¿Quitar verificación a este analista?')) {
                  handleSanction({ removeVerification: true });
                }
              }}
            >
              Quitar insignia verificado
            </button>
          </div>

          <div className="analyst-admin-warning-form">
            <input
              className="admin-input"
              value={warning}
              onChange={(e) => setWarning(e.target.value)}
              placeholder="Registrar advertencia…"
            />
            <button type="button" className="admin-btn-primary" onClick={handleWarning}>
              Añadir advertencia
            </button>
          </div>

          {(detail.warnings || []).length ? (
            <ul className="analyst-admin-warning-list">
              {detail.warnings.map((w, i) => (
                <li key={i}>
                  <p>{w.message}</p>
                  <small>{formatDate(w.createdAt)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>Sin advertencias registradas.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
