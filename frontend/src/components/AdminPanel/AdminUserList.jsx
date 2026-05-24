import React, { useState, useEffect } from 'react';
import { getUsers, updateUserRole, deleteUser } from '../../services/adminService';
import { useUser } from '../../context/UserContext';
import './AdminPanel.css';

/**
 * Lista de usuarios para administradores
 * Permite ver, cambiar roles y eliminar usuarios
 */
const AdminUserList = ({ onUserSelect }) => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const isMainAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    loadUsers();
  }, [filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers(filterRole || null);
      setUsers(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!isMainAdmin) {
      alert('Solo el administrador principal puede cambiar roles');
      return;
    }

    if (!window.confirm(`¿Cambiar el rol de este usuario a "${newRole}"?`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await updateUserRole(userId, newRole);
      await loadUsers(); // Recargar lista
      alert('Rol actualizado correctamente');
    } catch (err) {
      console.error('Error cambiando rol:', err);
      alert('Error al cambiar el rol: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!isMainAdmin) {
      alert('Solo el administrador principal puede eliminar usuarios');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await deleteUser(userId);
      await loadUsers(); // Recargar lista
      alert('Usuario eliminado correctamente');
    } catch (err) {
      console.error('Error eliminando usuario:', err);
      alert('Error al eliminar el usuario: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadge = (role) => {
    const badges = {
      admin: { text: 'Admin Principal', class: 'role-admin' },
      admin_secundario: { text: 'Admin Secundario', class: 'role-admin-sec' },
      usuario: { text: 'Usuario', class: 'role-usuario' }
    };
    return badges[role] || badges.usuario;
  };

  if (loading) {
    return (
      <div className="admin-panel-section">
        <div className="admin-loading">
          <div className="admin-spinner"></div>
          <p>Cargando usuarios...</p>
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
          <button onClick={loadUsers} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-section">
      <div className="admin-section-header">
        <h2>Lista de Usuarios</h2>
        <p>Gestiona usuarios del sistema</p>
      </div>

      {/* Filtros */}
      <div className="admin-filters">
        <label htmlFor="role-filter">Filtrar por rol:</label>
        <select
          id="role-filter"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="admin-select"
        >
          <option value="">Todos</option>
          <option value="usuario">Usuarios</option>
          <option value="admin_secundario">Administradores Secundarios</option>
        </select>
        <button onClick={loadUsers} className="admin-btn-secondary">
          🔄 Actualizar
        </button>
      </div>

      {/* Tabla de usuarios */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Rol</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" className="admin-empty-cell">
                  No hay usuarios
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const roleBadge = getRoleBadge(user.role);
                return (
                  <tr key={user._id}>
                    <td>{user.nombre || 'N/A'}</td>
                    <td>{user.email}</td>
                    <td>{user.telefono || 'N/A'}</td>
                    <td>
                      <span className={`role-badge ${roleBadge.class}`}>
                        {roleBadge.text}
                      </span>
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          className="admin-btn-action"
                          onClick={() => onUserSelect && onUserSelect(user._id)}
                          title="Ver perfil"
                        >
                          👁️ Ver
                        </button>
                        {isMainAdmin && user.role !== 'admin' && (
                          <>
                            <select
                              className="admin-select-small"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user._id, e.target.value)}
                              disabled={actionLoading === user._id}
                              title="Cambiar rol"
                            >
                              <option value="usuario">Usuario</option>
                              <option value="admin_secundario">Admin Secundario</option>
                            </select>
                            <button
                              className="admin-btn-danger"
                              onClick={() => handleDeleteUser(user._id, user.nombre)}
                              disabled={actionLoading === user._id}
                              title="Eliminar usuario"
                            >
                              {actionLoading === user._id ? '...' : '🗑️'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-table-footer">
        <p>Total: {users.length} usuario(s)</p>
      </div>
    </div>
  );
};

export default AdminUserList;
