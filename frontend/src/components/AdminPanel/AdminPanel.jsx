import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import AdminDashboard from './AdminDashboard';
import AdminUserList from './AdminUserList';
import AdminUserProfile from './AdminUserProfile';
import AdminSendBulkMessage from './AdminSendBulkMessage';
import AdminEnviarMensaje from '../Admin/AdminEnviarMensaje';
import AdminMensajesEnviados from '../Admin/AdminMensajesEnviados';
import './AdminPanel.css';

/**
 * Panel principal de administración
 * Integra todos los componentes del panel de admin
 */
const AdminPanel = () => {
  const { isAdmin, isMainAdmin, user, handleLogout, loading } = useUser();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Función para cerrar sesión
  const handleLogoutClick = () => {
    handleLogout();
    navigate('/ligas'); // Redirigir a la página principal
  };

  // Mostrar loading mientras se carga el perfil
  if (loading) {
    return (
      <div className="admin-panel-container">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Si no es administrador, mostrar mensaje de acceso denegado
  if (!isAdmin) {
    return (
      <div className="admin-panel-container">
        <div className="admin-access-denied">
          <h2>⚠️ Acceso Denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
          <p>Solo los administradores pueden acceder a esta sección.</p>
          {user && (
            <p style={{ marginTop: '16px', fontSize: '14px', color: 'var(--text-secondary, #B3B8C2)' }}>
              Tu rol actual: <strong>{user.role || 'usuario'}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    setActiveSection('user-profile');
  };

  const handleCloseProfile = () => {
    setSelectedUserId(null);
    setActiveSection('users');
  };

  return (
    <div className="admin-panel-container">
      <div className="admin-panel-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div>
            <h1>Panel de Administración</h1>
            <p>Gestiona usuarios, mensajes y configuración del sistema</p>
            {user && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary, #B3B8C2)', marginTop: '8px' }}>
                Conectado como: <strong>{user.nombre || user.email}</strong> ({user.role === 'admin' ? 'Admin Principal' : 'Admin Secundario'})
              </p>
            )}
          </div>
          <button
            onClick={handleLogoutClick}
            className="admin-btn-logout"
            title="Cerrar sesión"
          >
            🚪 Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Navegación */}
      <div className="admin-panel-nav">
        <button
          className={`admin-nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSection('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`admin-nav-btn ${activeSection === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('users');
            setSelectedUserId(null);
          }}
        >
          👥 Usuarios
        </button>
        {isMainAdmin && (
          <button
            className={`admin-nav-btn ${activeSection === 'bulk-messages' ? 'active' : ''}`}
            onClick={() => setActiveSection('bulk-messages')}
          >
            📢 Mensajes Masivos
          </button>
        )}
        <button
          className={`admin-nav-btn ${activeSection === 'send-message' ? 'active' : ''}`}
          onClick={() => setActiveSection('send-message')}
        >
          ✉️ Enviar Mensaje
        </button>
        <button
          className={`admin-nav-btn ${activeSection === 'sent-messages' ? 'active' : ''}`}
          onClick={() => setActiveSection('sent-messages')}
        >
          📬 Mensajes Enviados
        </button>
      </div>

      {/* Contenido */}
      <div className="admin-panel-content">
        {activeSection === 'dashboard' && <AdminDashboard />}
        
        {activeSection === 'users' && (
          <div className="admin-panel-grid">
            <div className="admin-panel-col-1">
              <AdminUserList onUserSelect={handleUserSelect} />
            </div>
            {selectedUserId && (
              <div className="admin-panel-col-2">
                <AdminUserProfile
                  userId={selectedUserId}
                  onClose={handleCloseProfile}
                />
              </div>
            )}
          </div>
        )}
        
        {activeSection === 'bulk-messages' && isMainAdmin && (
          <AdminSendBulkMessage />
        )}
        
        {activeSection === 'send-message' && (
          <AdminEnviarMensaje />
        )}
        
        {activeSection === 'sent-messages' && (
          <AdminMensajesEnviados />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
