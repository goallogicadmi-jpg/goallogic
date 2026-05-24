import React, { useState, useEffect } from 'react';
import { getUsers, sendBulkMessage, sendBroadcastMessage } from '../../services/adminService';
import { useUser } from '../../context/UserContext';
import './AdminPanel.css';

/**
 * Componente para enviar mensajes masivos
 * Solo disponible para admin principal
 */
const AdminSendBulkMessage = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const isMainAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isMainAdmin) {
      loadUsers();
    }
  }, [isMainAdmin]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const data = await getUsers('usuario'); // Solo usuarios normales
      setUsers(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === users.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(users.map(u => u._id));
    }
  };

  const handleSendBulk = async (e) => {
    e.preventDefault();

    if (selectedUserIds.length === 0) {
      alert('Selecciona al menos un usuario');
      return;
    }

    if (!titulo.trim() || !contenido.trim()) {
      alert('Completa el título y el contenido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await sendBulkMessage(selectedUserIds, titulo.trim(), contenido.trim());
      
      setSuccess(true);
      setTitulo('');
      setContenido('');
      setSelectedUserIds([]);
      
      alert(`Mensaje enviado a ${result.sent_count} usuario(s)`);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error enviando mensaje masivo:', err);
      setError(err.message || 'Error al enviar mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();

    if (!titulo.trim() || !contenido.trim()) {
      alert('Completa el título y el contenido');
      return;
    }

    if (!window.confirm('¿Estás seguro de enviar este mensaje a TODOS los usuarios? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const result = await sendBroadcastMessage(titulo.trim(), contenido.trim());
      
      setSuccess(true);
      setTitulo('');
      setContenido('');
      setSelectedUserIds([]);
      
      alert(`Mensaje broadcast enviado a ${result.sent_count} usuario(s)`);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error enviando broadcast:', err);
      setError(err.message || 'Error al enviar broadcast');
    } finally {
      setLoading(false);
    }
  };

  if (!isMainAdmin) {
    return (
      <div className="admin-panel-section">
        <div className="admin-error">
          <span>⚠️</span>
          <span>Solo el administrador principal puede enviar mensajes masivos</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-section">
      <div className="admin-section-header">
        <h2>Mensajes Masivos</h2>
        <p>Envía mensajes a múltiples usuarios o a todos</p>
      </div>

      {success && (
        <div className="admin-success">
          <span>✓</span>
          <span>Mensaje enviado correctamente</span>
        </div>
      )}

      {error && (
        <div className="admin-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSendBulk} className="admin-form">
        {/* Selección de usuarios */}
        <div className="admin-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label>Seleccionar usuarios ({selectedUserIds.length} seleccionados):</label>
            <button
              type="button"
              onClick={handleSelectAll}
              className="admin-btn-secondary"
            >
              {selectedUserIds.length === users.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </button>
          </div>
          
          {loadingUsers ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <span>Cargando usuarios...</span>
            </div>
          ) : (
            <div className="admin-users-selector">
              {users.length === 0 ? (
                <p className="admin-empty-text">No hay usuarios disponibles</p>
              ) : (
                users.map((user) => (
                  <label key={user._id} className="admin-user-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(user._id)}
                      onChange={() => handleUserToggle(user._id)}
                    />
                    <span>{user.nombre} ({user.email})</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Título y contenido */}
        <div className="admin-form-group">
          <label htmlFor="bulk-titulo">Título *</label>
          <input
            type="text"
            id="bulk-titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            maxLength={200}
            className="admin-input"
            placeholder="Ej: Actualización importante"
          />
          <small className="admin-hint">{titulo.length}/200 caracteres</small>
        </div>

        <div className="admin-form-group">
          <label htmlFor="bulk-contenido">Contenido *</label>
          <textarea
            id="bulk-contenido"
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            required
            maxLength={5000}
            rows={8}
            className="admin-textarea"
            placeholder="Escribe el contenido del mensaje aquí..."
          />
          <small className="admin-hint">{contenido.length}/5000 caracteres</small>
        </div>

        {/* Botones de acción */}
        <div className="admin-form-actions">
          <button
            type="submit"
            disabled={loading || selectedUserIds.length === 0 || !titulo.trim() || !contenido.trim()}
            className="admin-btn-primary"
          >
            {loading ? 'Enviando...' : `Enviar a ${selectedUserIds.length} seleccionado(s)`}
          </button>
          <button
            type="button"
            onClick={handleSendBroadcast}
            disabled={loading || !titulo.trim() || !contenido.trim()}
            className="admin-btn-broadcast"
          >
            {loading ? 'Enviando...' : '📢 Enviar a TODOS los usuarios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminSendBulkMessage;
