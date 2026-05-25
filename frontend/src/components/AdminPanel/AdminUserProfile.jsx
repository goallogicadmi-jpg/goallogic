import { useState, useEffect } from 'react';
import { getUserProfile, setUserPremium } from '../../services/adminService';
import { sendMessage } from '../../services/messageService';
import { useUser } from '../../context/UserContext';
import { getRoleBadge, getPremiumBadge, formatAdminDate, stripeIdShort } from './adminUserUtils';
import './AdminPanel.css';

export default function AdminUserProfile({ userId, onClose, onUserUpdated }) {
  const { isMainAdmin } = useUser();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageTitulo, setMessageTitulo] = useState('');
  const [messageContenido, setMessageContenido] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(false);

  useEffect(() => {
    if (userId) loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(err.message || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePremium = async () => {
    if (!isMainAdmin) {
      alert('Solo el administrador principal puede cambiar premium');
      return;
    }
    const user = profile?.user;
    if (!user) return;
    if (user.role === 'admin' && user.isMainAdmin) {
      alert('No se puede modificar el premium del admin principal');
      return;
    }

    const next = !user.premium;
    const msg = next
      ? '¿Activar premium manualmente para este usuario?'
      : '¿Desactivar premium? La suscripción Stripe no se cancela automáticamente.';
    if (!window.confirm(msg)) return;

    try {
      setPremiumLoading(true);
      await setUserPremium(userId, next);
      await loadProfile();
      onUserUpdated?.();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setPremiumLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageTitulo.trim() || !messageContenido.trim()) {
      alert('Completa título y contenido');
      return;
    }
    try {
      setSendingMessage(true);
      await sendMessage(userId, messageTitulo.trim(), messageContenido.trim());
      setMessageTitulo('');
      setMessageContenido('');
      setShowMessageForm(false);
      await loadProfile();
    } catch (err) {
      alert('Error al enviar: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  if (!userId) {
    return (
      <div className="admin-panel-section admin-user-profile-empty">
        <p className="admin-empty-text">Selecciona un usuario de la lista para ver su detalle.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel-section">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Cargando perfil…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-section">
        <div className="admin-error">
          <span>{error}</span>
          <button type="button" onClick={loadProfile} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const { user, favorites, simulatorState, messages, activity, stats } = profile;
  const roleBadge = getRoleBadge(user);
  const premiumBadge = getPremiumBadge(user);
  const canTogglePremium = isMainAdmin && !(user.role === 'admin' && user.isMainAdmin);

  return (
    <div className="admin-panel-section admin-user-profile">
      <div className="admin-section-header">
        <div className="admin-profile-header-row">
          <div>
            <h2>{user.nombre || 'Usuario'}</h2>
            <p className="admin-user-email">{user.email}</p>
            <div className="admin-badge-stack admin-badge-stack-inline">
              <span className={`role-badge ${roleBadge.className}`}>{roleBadge.text}</span>
              <span className={`status-badge ${premiumBadge.className}`}>{premiumBadge.text}</span>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="admin-btn-close">
              Cerrar
            </button>
          )}
        </div>
      </div>

      <div className="admin-profile-section admin-stripe-block">
        <h3>Suscripción y Stripe</h3>
        <div className="admin-profile-grid">
          <div className="admin-profile-item">
            <label>Premium</label>
            <span>{user.premium ? 'Activo' : 'Inactivo'}</span>
          </div>
          <div className="admin-profile-item">
            <label>Premium desde</label>
            <span>{formatAdminDate(user.premium_since, true)}</span>
          </div>
          <div className="admin-profile-item admin-profile-item-full">
            <label>Customer ID</label>
            <code className="admin-code">{user.stripe_customer_id || '—'}</code>
          </div>
          <div className="admin-profile-item admin-profile-item-full">
            <label>Subscription ID</label>
            <code className="admin-code">{user.stripe_subscription_id || '—'}</code>
          </div>
        </div>
        {canTogglePremium && (
          <button
            type="button"
            className={user.premium ? 'admin-btn-danger' : 'admin-btn-primary'}
            onClick={handleTogglePremium}
            disabled={premiumLoading}
          >
            {premiumLoading
              ? 'Guardando…'
              : user.premium
                ? 'Desactivar premium manualmente'
                : 'Activar premium manualmente'}
          </button>
        )}
      </div>

      <div className="admin-profile-section">
        <h3>Datos personales</h3>
        <div className="admin-profile-grid">
          <div className="admin-profile-item">
            <label>Teléfono</label>
            <span>{user.telefono || '—'}</span>
          </div>
          <div className="admin-profile-item">
            <label>Registro</label>
            <span>{formatAdminDate(user.created_at, true)}</span>
          </div>
          <div className="admin-profile-item">
            <label>Última actualización</label>
            <span>{formatAdminDate(user.updated_at, true)}</span>
          </div>
        </div>
      </div>

      <div className="admin-profile-section">
        <h3>Actividad</h3>
        <div className="admin-stats-grid admin-stats-grid-compact">
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.community_posts ?? 0}</div>
            <div className="admin-stat-label-small">Posts comunidad</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.community_comments ?? 0}</div>
            <div className="admin-stat-label-small">Comentarios</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.total_bets ?? 0}</div>
            <div className="admin-stat-label-small">Apuestas</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.simulator_bets ?? 0}</div>
            <div className="admin-stat-label-small">Simulador</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.total_messages ?? 0}</div>
            <div className="admin-stat-label-small">Mensajes</div>
          </div>
        </div>

        {activity?.length > 0 ? (
          <ul className="admin-activity-timeline">
            {activity.slice(0, 12).map((item, idx) => (
              <li key={`${item.type}-${item.date}-${idx}`} className={`admin-activity-item admin-activity-${item.type}`}>
                <div className="admin-activity-dot" />
                <div className="admin-activity-body">
                  <strong>{item.label}</strong>
                  {item.detail && <span className="admin-activity-detail">{item.detail}</span>}
                  <time>{formatAdminDate(item.date, true)}</time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-empty-text">Sin actividad registrada</p>
        )}
      </div>

      <div className="admin-profile-section">
        <h3>Favoritos</h3>
        <p>
          {favorites?.equipos?.length ?? 0} equipos · {favorites?.ligas?.length ?? 0} ligas
        </p>
      </div>

      {simulatorState && (
        <div className="admin-profile-section">
          <h3>Simulador</h3>
          <p>
            Capital: {simulatorState.capital_actual?.toFixed(2) ?? '0'}€ ·{' '}
            {simulatorState.apuestas?.length ?? 0} apuestas simuladas
          </p>
        </div>
      )}

      <div className="admin-profile-section">
        <div className="admin-profile-header-row">
          <h3>Mensajes ({messages?.length ?? 0})</h3>
          <button
            type="button"
            className="admin-btn-secondary"
            onClick={() => setShowMessageForm(!showMessageForm)}
          >
            {showMessageForm ? 'Cancelar' : 'Enviar mensaje'}
          </button>
        </div>
        {showMessageForm && (
          <form onSubmit={handleSendMessage} className="admin-message-form">
            <div className="admin-form-group">
              <label>Título</label>
              <input
                type="text"
                className="admin-input"
                value={messageTitulo}
                onChange={(e) => setMessageTitulo(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="admin-form-group">
              <label>Contenido</label>
              <textarea
                className="admin-textarea"
                value={messageContenido}
                onChange={(e) => setMessageContenido(e.target.value)}
                required
                rows={4}
                maxLength={5000}
              />
            </div>
            <button type="submit" className="admin-btn-primary" disabled={sendingMessage}>
              {sendingMessage ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
