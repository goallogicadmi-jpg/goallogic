import React, { useState, useEffect } from 'react';
import { getSentMessages } from '../../services/messageService';
import './Admin.css';

/**
 * Componente para mostrar los mensajes enviados por el administrador
 */
const AdminMensajesEnviados = () => {
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState({ total: 0, read: 0, unread: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Cargar mensajes al montar
  useEffect(() => {
    loadMessages();
  }, []);

  // Función para cargar mensajes enviados
  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSentMessages();
      setMessages(data.messages || []);
      setStats(data.stats || { total: 0, read: 0, unread: 0 });
    } catch (err) {
      console.error('Error cargando mensajes enviados:', err);
      setError(err.message || 'Error al cargar los mensajes enviados');
    } finally {
      setLoading(false);
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Hoy';
    } else if (diffDays === 2) {
      return 'Ayer';
    } else if (diffDays <= 7) {
      return `Hace ${diffDays - 1} días`;
    } else {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Función para formatear hora
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
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
          <button onClick={loadMessages} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-mensajes-enviados">
      <div className="admin-section-header">
        <h2>Mensajes Enviados</h2>
        <p>Historial de mensajes que has enviado a los usuarios</p>
      </div>

      {/* Estadísticas */}
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
          <p>📬 No has enviado ningún mensaje aún</p>
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
                <span className={`admin-mensaje-status ${message.leido ? 'admin-mensaje-leido' : 'admin-mensaje-no-leido'}`}>
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

      {/* Vista detallada del mensaje seleccionado */}
      {selectedMessage && (
        <div className="admin-mensaje-detail">
          <div className="admin-mensaje-detail-header">
            <button
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
                {formatDate(selectedMessage.created_at)} • {formatTime(selectedMessage.created_at)}
              </span>
              <span className={`admin-mensaje-status ${selectedMessage.leido ? 'admin-mensaje-leido' : 'admin-mensaje-no-leido'}`}>
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
