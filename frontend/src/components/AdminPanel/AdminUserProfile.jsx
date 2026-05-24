import React, { useState, useEffect } from 'react';
import { getUserProfile } from '../../services/adminService';
import { sendMessage } from '../../services/messageService';
import './AdminPanel.css';

/**
 * Vista completa del perfil de un usuario
 * Muestra datos personales, favoritos, simulador, mensajes y apuestas
 */
const AdminUserProfile = ({ userId, onClose, onSendMessage }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageTitulo, setMessageTitulo] = useState('');
  const [messageContenido, setMessageContenido] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (err) {
      console.error('Error cargando perfil:', err);
      setError(err.message || 'Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageTitulo.trim() || !messageContenido.trim()) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      setSendingMessage(true);
      await sendMessage(userId, messageTitulo.trim(), messageContenido.trim());
      alert('Mensaje enviado correctamente');
      setMessageTitulo('');
      setMessageContenido('');
      setShowMessageForm(false);
      if (onSendMessage) {
        onSendMessage();
      }
      await loadProfile(); // Recargar para actualizar mensajes
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      alert('Error al enviar el mensaje: ' + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!userId) {
    return (
      <div className="admin-panel-section">
        <div className="admin-empty">
          <p>Selecciona un usuario para ver su perfil</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-panel-section">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-panel-section">
        <div className="admin-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={loadProfile} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const { user, favorites, simulatorState, messages, bets, stats } = profile;

  return (
    <div className="admin-panel-section">
      <div className="admin-section-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Perfil de Usuario</h2>
            <p>{user.nombre} ({user.email})</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="admin-btn-close">
              ✕ Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <div className="admin-profile-section">
        <h3>📋 Datos Personales</h3>
        <div className="admin-profile-grid">
          <div className="admin-profile-item">
            <label>Nombre:</label>
            <span>{user.nombre || 'N/A'}</span>
          </div>
          <div className="admin-profile-item">
            <label>Email:</label>
            <span>{user.email}</span>
          </div>
          <div className="admin-profile-item">
            <label>Teléfono:</label>
            <span>{user.telefono || 'N/A'}</span>
          </div>
          <div className="admin-profile-item">
            <label>Rol:</label>
            <span className={`role-badge role-${user.role}`}>
              {user.role === 'admin' ? 'Admin Principal' : 
               user.role === 'admin_secundario' ? 'Admin Secundario' : 'Usuario'}
            </span>
          </div>
          <div className="admin-profile-item">
            <label>Fecha Registro:</label>
            <span>{formatDate(user.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="admin-profile-section">
        <h3>📊 Estadísticas</h3>
        <div className="admin-stats-grid">
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.total_messages || 0}</div>
            <div className="admin-stat-label-small">Mensajes</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.unread_messages || 0}</div>
            <div className="admin-stat-label-small">No Leídos</div>
          </div>
          <div className="admin-stat-card-small">
            <div className="admin-stat-value-small">{stats?.total_bets || 0}</div>
            <div className="admin-stat-label-small">Apuestas</div>
          </div>
        </div>
      </div>

      {/* Favoritos */}
      <div className="admin-profile-section">
        <h3>⭐ Favoritos</h3>
        <div className="admin-profile-grid">
          <div className="admin-profile-item">
            <label>Equipos:</label>
            <span>{favorites?.equipos?.length || 0}</span>
            {favorites?.equipos?.length > 0 && (
              <div className="admin-tags">
                {favorites.equipos.map((equipo, idx) => (
                  <span key={idx} className="admin-tag">{equipo}</span>
                ))}
              </div>
            )}
          </div>
          <div className="admin-profile-item">
            <label>Ligas:</label>
            <span>{favorites?.ligas?.length || 0}</span>
            {favorites?.ligas?.length > 0 && (
              <div className="admin-tags">
                {favorites.ligas.map((liga, idx) => (
                  <span key={idx} className="admin-tag">{liga}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Simulador */}
      {simulatorState && (
        <div className="admin-profile-section">
          <h3>💰 Simulador</h3>
          <div className="admin-profile-grid">
            <div className="admin-profile-item">
              <label>Capital Inicial:</label>
              <span>{simulatorState.capital_inicial?.toFixed(2) || '0.00'}€</span>
            </div>
            <div className="admin-profile-item">
              <label>Capital Actual:</label>
              <span>{simulatorState.capital_actual?.toFixed(2) || '0.00'}€</span>
            </div>
            <div className="admin-profile-item">
              <label>Apuestas Simuladas:</label>
              <span>{simulatorState.apuestas?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div className="admin-profile-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3>📬 Mensajes ({messages?.length || 0})</h3>
          <button
            onClick={() => setShowMessageForm(!showMessageForm)}
            className="admin-btn-primary"
          >
            {showMessageForm ? '✕ Cancelar' : '✉️ Enviar Mensaje'}
          </button>
        </div>

        {showMessageForm && (
          <form onSubmit={handleSendMessage} className="admin-message-form">
            <div className="admin-form-group">
              <label>Título:</label>
              <input
                type="text"
                value={messageTitulo}
                onChange={(e) => setMessageTitulo(e.target.value)}
                required
                maxLength={200}
                className="admin-input"
              />
            </div>
            <div className="admin-form-group">
              <label>Contenido:</label>
              <textarea
                value={messageContenido}
                onChange={(e) => setMessageContenido(e.target.value)}
                required
                maxLength={5000}
                rows={5}
                className="admin-textarea"
              />
            </div>
            <button
              type="submit"
              disabled={sendingMessage}
              className="admin-btn-primary"
            >
              {sendingMessage ? 'Enviando...' : 'Enviar Mensaje'}
            </button>
          </form>
        )}

        {messages && messages.length > 0 ? (
          <div className="admin-messages-list">
            {messages.slice(0, 10).map((message) => (
              <div key={message._id} className={`admin-message-item ${!message.leido ? 'admin-message-unread' : ''}`}>
                <div className="admin-message-header">
                  <strong>{message.titulo}</strong>
                  <span className={message.leido ? 'admin-message-read' : 'admin-message-unread-badge'}>
                    {message.leido ? '✓ Leído' : '● No leído'}
                  </span>
                </div>
                <p className="admin-message-content">{message.contenido}</p>
                <div className="admin-message-meta">
                  {formatDate(message.created_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="admin-empty-text">No hay mensajes</p>
        )}
      </div>
    </div>
  );
};

export default AdminUserProfile;
