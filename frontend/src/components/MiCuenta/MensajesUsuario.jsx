import React, { useState, useEffect } from 'react';
import { getInbox, markAsRead } from '../../services/messageService';
import CuentaSectionTitle from './CuentaSectionTitle';
import { IconMensajes } from './CuentaIcons';
import './cuentaSections.css';
import './MiCuenta.css';

/**
 * Componente para mostrar los mensajes del usuario
 * Permite ver, leer y marcar mensajes como leídos
 */
const MensajesUsuario = () => {
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [markingAsRead, setMarkingAsRead] = useState(null);

  // Cargar mensajes al montar
  useEffect(() => {
    loadMessages();
  }, []);

  // Función para cargar mensajes
  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInbox();
      setMessages(data.messages || []);
      setUnreadCount(data.unread_count || 0);
    } catch (err) {
      console.error('Error cargando mensajes:', err);
      setError(err.message || 'Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir un mensaje
  const handleOpenMessage = async (message) => {
    setSelectedMessage(message);
    
    // Si el mensaje no está leído, marcarlo como leído automáticamente
    if (!message.leido) {
      await handleMarkAsRead(message._id);
    }
  };

  // Función para marcar un mensaje como leído
  const handleMarkAsRead = async (messageId) => {
    try {
      setMarkingAsRead(messageId);
      await markAsRead(messageId);
      
      // Actualizar el estado local
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, leido: true } : msg
        )
      );
      
      // Actualizar contador de no leídos
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Si el mensaje seleccionado es el que se marcó, actualizarlo
      if (selectedMessage && selectedMessage._id === messageId) {
        setSelectedMessage(prev => ({ ...prev, leido: true }));
      }
    } catch (err) {
      console.error('Error marcando mensaje como leído:', err);
      alert('Error al marcar el mensaje como leído: ' + err.message);
    } finally {
      setMarkingAsRead(null);
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
      <div className="mensajes-container">
        <div className="mensajes-loading">
          <div className="mensajes-spinner"></div>
          <p>Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mensajes-container">
        <div className="mensajes-error">
          <span>⚠️</span>
          <span>{error}</span>
          <button onClick={loadMessages} className="btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mensajes-container" id="mensajes-usuario">
      <div className="mensajes-header">
        <CuentaSectionTitle as="h3" icon={IconMensajes} size="md">
          Mis Mensajes
        </CuentaSectionTitle>
        {unreadCount > 0 && (
          <span className="mensajes-badge">{unreadCount} no leídos</span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="mensajes-empty">
          <p>📬 No tienes mensajes aún</p>
          <p className="mensajes-empty-subtitle">
            Los administradores te enviarán mensajes importantes aquí
          </p>
        </div>
      ) : (
        <div className="mensajes-content">
          {/* Lista de mensajes */}
          <div className="mensajes-list">
            {messages.map((message) => (
              <div
                key={message._id}
                className={`mensaje-item ${!message.leido ? 'mensaje-no-leido' : ''} ${selectedMessage?._id === message._id ? 'mensaje-selected' : ''}`}
                onClick={() => handleOpenMessage(message)}
              >
                <div className="mensaje-item-header">
                  <h4 className="mensaje-titulo">{message.titulo}</h4>
                  {!message.leido && (
                    <span className="mensaje-badge-new">Nuevo</span>
                  )}
                </div>
                <div className="mensaje-item-meta">
                  <span className="mensaje-admin">
                    De: {message.admin_id?.nombre || 'Administrador'}
                  </span>
                  <span className="mensaje-fecha">
                    {formatDate(message.created_at)} • {formatTime(message.created_at)}
                  </span>
                </div>
                <div className="mensaje-preview">
                  {message.contenido.length > 100
                    ? `${message.contenido.substring(0, 100)}...`
                    : message.contenido}
                </div>
              </div>
            ))}
          </div>

          {/* Vista detallada del mensaje seleccionado */}
          {selectedMessage && (
            <div className="mensaje-detail">
              <div className="mensaje-detail-header">
                <button
                  className="mensaje-close-btn"
                  onClick={() => setSelectedMessage(null)}
                >
                  ✕
                </button>
                <h3>{selectedMessage.titulo}</h3>
                <div className="mensaje-detail-meta">
                  <span>
                    De: <strong>{selectedMessage.admin_id?.nombre || 'Administrador'}</strong>
                  </span>
                  <span>
                    {formatDate(selectedMessage.created_at)} • {formatTime(selectedMessage.created_at)}
                  </span>
                </div>
              </div>
              <div className="mensaje-detail-content">
                <p>{selectedMessage.contenido}</p>
              </div>
              {!selectedMessage.leido && (
                <div className="mensaje-detail-actions">
                  <button
                    className="btn-mark-read"
                    onClick={() => handleMarkAsRead(selectedMessage._id)}
                    disabled={markingAsRead === selectedMessage._id}
                  >
                    {markingAsRead === selectedMessage._id ? 'Marcando...' : '✓ Marcar como leído'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MensajesUsuario;
