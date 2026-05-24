import React, { useState, useEffect } from 'react';
import { sendMessage } from '../../services/messageService';
import { getUsers } from '../../services/adminService';
import './Admin.css';

/**
 * Componente para que los administradores envíen mensajes a usuarios
 */
const AdminEnviarMensaje = () => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Cargar lista de usuarios al montar
  useEffect(() => {
    loadUsers();
  }, []);

  // Función para cargar usuarios
  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      setError(null);
      const usersList = await getUsers('usuario'); // Solo usuarios normales
      setUsers(usersList);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al cargar la lista de usuarios: ' + err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Función para enviar mensaje
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedUserId || !titulo.trim() || !contenido.trim()) {
      setError('Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      await sendMessage(selectedUserId, titulo.trim(), contenido.trim());
      
      setSuccess(true);
      setTitulo('');
      setContenido('');
      setSelectedUserId('');
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      setError(err.message || 'Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-enviar-mensaje">
      <div className="admin-section-header">
        <h2>Enviar Mensaje</h2>
        <p>Envía un mensaje a un usuario específico</p>
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

      <form onSubmit={handleSubmit} className="admin-form">
        <div className="admin-form-group">
          <label htmlFor="user-select">Usuario destinatario *</label>
          {loadingUsers ? (
            <div className="admin-loading">Cargando usuarios...</div>
          ) : users.length === 0 ? (
            <div className="admin-error">
              <span>⚠️</span>
              <span>No hay usuarios disponibles</span>
            </div>
          ) : (
            <>
              <select
                id="user-select"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="admin-select"
              >
                <option value="">Selecciona un usuario</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.nombre} ({user.email})
                  </option>
                ))}
              </select>
              <small className="admin-hint">
                Selecciona el usuario al que deseas enviar el mensaje
              </small>
            </>
          )}
        </div>

        <div className="admin-form-group">
          <label htmlFor="titulo">Título *</label>
          <input
            type="text"
            id="titulo"
            placeholder="Ej: Actualización importante"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            maxLength={200}
            className="admin-input"
          />
          <small className="admin-hint">
            {titulo.length}/200 caracteres
          </small>
        </div>

        <div className="admin-form-group">
          <label htmlFor="contenido">Contenido *</label>
          <textarea
            id="contenido"
            placeholder="Escribe el contenido del mensaje aquí..."
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            required
            maxLength={5000}
            rows={8}
            className="admin-textarea"
          />
          <small className="admin-hint">
            {contenido.length}/5000 caracteres
          </small>
        </div>

        <div className="admin-form-actions">
          <button
            type="submit"
            disabled={loading || !selectedUserId || !titulo.trim() || !contenido.trim()}
            className="admin-btn-primary"
          >
            {loading ? 'Enviando...' : 'Enviar Mensaje'}
          </button>
          <button
            type="button"
            onClick={() => {
              setTitulo('');
              setContenido('');
              setSelectedUserId('');
              setError(null);
              setSuccess(false);
            }}
            className="admin-btn-secondary"
            disabled={loading}
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminEnviarMensaje;
