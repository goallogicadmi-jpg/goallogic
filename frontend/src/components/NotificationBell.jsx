import React, { useState, useEffect, useRef } from 'react';
import { getUnreadCount, getInbox } from '../services/messageService';
import { useUser } from '../context/UserContext';
import { usePlanAccess } from '../context/PlanAccessContext';
import { FEATURES } from '../utils/planAccess';
import './NotificationBell.css';

/**
 * Componente de campana de notificaciones
 * Muestra el número de mensajes no leídos y un dropdown con los últimos mensajes
 */
const NotificationBell = () => {
  const { isAuthenticated } = useUser();
  const { canAccessFeature, openUpgradeModal } = usePlanAccess();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Cargar mensajes no leídos al montar y cuando cambie la autenticación
  useEffect(() => {
    if (isAuthenticated) {
      loadUnreadCount();
      // Recargar cada 30 segundos
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setRecentMessages([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const openInbox = () => {
      if (!isAuthenticated) return;
      loadUnreadCount();
      loadRecentMessages();
      setShowDropdown(true);
    };

    window.addEventListener('goal-logic:open-inbox', openInbox);
    return () => window.removeEventListener('goal-logic:open-inbox', openInbox);
  }, [isAuthenticated]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Función para cargar contador de no leídos
  const loadUnreadCount = async () => {
    if (!isAuthenticated) return;

    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error cargando contador de mensajes:', error);
    }
  };

  // Función para cargar mensajes recientes
  const loadRecentMessages = async () => {
    if (!isAuthenticated || loading) return;

    try {
      setLoading(true);
      const data = await getInbox();
      // Obtener últimos 5 mensajes no leídos
      const unread = (data.messages || [])
        .filter(msg => !msg.leido)
        .slice(0, 5);
      setRecentMessages(unread);
    } catch (error) {
      console.error('Error cargando mensajes recientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para abrir/cerrar dropdown
  const toggleDropdown = () => {
    if (!canAccessFeature(FEATURES.ALERTS_NOTIFICATIONS)) {
      openUpgradeModal();
      return;
    }
    if (!showDropdown && isAuthenticated) {
      loadRecentMessages();
    }
    setShowDropdown(!showDropdown);
  };

  // Función para formatear fecha relativa
  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Ahora';
    } else if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays === 1) {
      return 'Ayer';
    } else {
      return `Hace ${diffDays} días`;
    }
  };

  // Función para navegar a mensajes
  const handleGoToMessages = () => {
    setShowDropdown(false);
    // Scroll a la sección de mensajes
    const mensajesSection = document.getElementById('mensajes-usuario');
    if (mensajesSection) {
      mensajesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={toggleDropdown}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} no leídos)` : ''}`}
      >
        <span className="notification-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Mensajes no leídos</h4>
            {unreadCount > 0 && (
              <button
                className="notification-view-all"
                onClick={handleGoToMessages}
              >
                Ver todos
              </button>
            )}
          </div>

          {loading ? (
            <div className="notification-loading">
              <div className="notification-spinner"></div>
              <span>Cargando...</span>
            </div>
          ) : recentMessages.length === 0 ? (
            <div className="notification-empty">
              <p>No tienes mensajes nuevos</p>
            </div>
          ) : (
            <div className="notification-list">
              {recentMessages.map((message) => (
                <div
                  key={message._id}
                  className="notification-item"
                  onClick={handleGoToMessages}
                >
                  <div className="notification-item-header">
                    <h5>{message.titulo}</h5>
                    <span className="notification-time">
                      {formatRelativeDate(message.created_at)}
                    </span>
                  </div>
                  <p className="notification-preview">
                    {message.contenido.length > 80
                      ? `${message.contenido.substring(0, 80)}...`
                      : message.contenido}
                  </p>
                  <span className="notification-from">
                    De: {message.admin_id?.nombre || 'Administrador'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
