import React, { useState, useEffect, useCallback } from 'react';
import { getSentMessages } from '../../services/messageService';
import { getAdminMessageHistory } from '../../services/messagesAdminService';
import { useUser } from '../../context/UserContext';
import './Admin.css';

const AdminMensajesEnviados = () => {
  const { isMainAdmin } = useUser();

  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    leido: '',
    from: '',
    to: '',
    campaignId: '',
  });

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (isMainAdmin) {
        const data = await getAdminMessageHistory({
          q: filters.q || undefined,
          leido: filters.leido || undefined,
          from: filters.from || undefined,
          to: filters.to || undefined,
          campaignId: filters.campaignId || undefined,
          limit: 100,
        });
        setMessages(data.messages || []);
        setStats(data.stats || { total: 0, read: 0, unread: 0 });
      } else {
        const data = await getSentMessages();
        setMessages(data.messages || []);
        setStats(data.stats || { total: 0, read: 0, unread: 0 });
      }
    } catch (err) {
      console.error('Error cargando mensajes enviados:', err);
      setError(err.message || 'Error al cargar los mensajes enviados');
    } finally {
      setLoading(false);
    }
  }, [isMainAdmin, filters]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Hoy';
    if (diffDays === 2) return 'Ayer';
    if (diffDays <= 7) return `Hace ${diffDays - 1} días`;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="admin-mensajes-enviados">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Cargando mensajes enviados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-mensajes-enviados">
        <div className="admin-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button type="button" onClick={loadMessages} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-mensajes-enviados">
      {isMainAdmin && (
        <div className="admin-filters-row admin-mensajes-filters">
          <input
            type="text"
            placeholder="Buscar título o contenido…"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            className="admin-input"
          />
          <select
            value={filters.leido}
            onChange={(e) => setFilters((f) => ({ ...f, leido: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="true">Leídos</option>
            <option value="false">No leídos</option>
          </select>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            className="admin-input"
          />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            className="admin-input"
          />
          <input
            type="text"
            placeholder="ID campaña (opcional)"
            value={filters.campaignId}
            onChange={(e) => setFilters((f) => ({ ...f, campaignId: e.target.value }))}
            className="admin-input"
          />
          <button type="button" className="admin-btn-secondary" onClick={loadMessages}>
            Filtrar
          </button>
        </div>
      )}

      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{stats.total}</div>
          <div className="admin-stat-label">Total enviados</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-stat-read">{stats.read}</div>
          <div className="admin-stat-label">Leídos</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-stat-unread">{stats.unread}</div>
          <div className="admin-stat-label">No leídos</div>
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="admin-empty">
          <p>📬 No hay mensajes con estos filtros</p>
        </div>
      ) : (
        <div className="admin-mensajes-list">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`admin-mensaje-item ${selectedMessage?._id === message._id ? 'admin-mensaje-selected' : ''}`}
              onClick={() => setSelectedMessage(message)}
            >
              <div className="admin-mensaje-header">
                <h4>{message.titulo}</h4>
                <span
                  className={`admin-mensaje-status ${message.leido ? 'admin-mensaje-leido' : 'admin-mensaje-no-leido'}`}
                >
                  {message.leido ? '✓ Leído' : '● No leído'}
                </span>
              </div>
              <div className="admin-mensaje-meta">
                <span>
                  Para: <strong>{message.user_id?.nombre || 'Usuario'}</strong>
                </span>
                <span>
                  {formatDate(message.created_at)} • {formatTime(message.created_at)}
                </span>
                {message.campaign_id && (
                  <span className="admin-mensaje-campaign-tag">Campaña</span>
                )}
              </div>
              <div className="admin-mensaje-preview">
                {message.contenido.length > 150
                  ? `${message.contenido.substring(0, 150)}...`
                  : message.contenido}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMessage && (
        <div className="admin-mensaje-detail">
          <div className="admin-mensaje-detail-header">
            <button
              type="button"
              className="admin-mensaje-close-btn"
              onClick={() => setSelectedMessage(null)}
            >
              ✕
            </button>
            <h3>{selectedMessage.titulo}</h3>
            <div className="admin-mensaje-detail-meta">
              <span>
                Para: <strong>{selectedMessage.user_id?.nombre || 'Usuario'}</strong>
                {selectedMessage.user_id?.email && (
                  <span className="admin-mensaje-email"> ({selectedMessage.user_id.email})</span>
                )}
              </span>
              <span>
                {formatDate(selectedMessage.created_at)} •{' '}
                {formatTime(selectedMessage.created_at)}
              </span>
              <span
                className={`admin-mensaje-status ${selectedMessage.leido ? 'admin-mensaje-leido' : 'admin-mensaje-no-leido'}`}
              >
                {selectedMessage.leido ? '✓ Leído' : '● No leído'}
              </span>
            </div>
          </div>
          <div className="admin-mensaje-detail-content">
            <p>{selectedMessage.contenido}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMensajesEnviados;
