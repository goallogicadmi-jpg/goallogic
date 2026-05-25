import { useState, useEffect, useCallback } from 'react';
import { getUsers, updateUserRole, deleteUser } from '../../services/adminService';
import { useUser } from '../../context/UserContext';
import { getRoleBadge, getPremiumBadge, formatAdminDate, stripeIdShort } from './adminUserUtils';
import './AdminPanel.css';

const EMPTY_FILTERS = {
  q: '',
  email: '',
  role: '',
  premium: '',
  createdFrom: '',
  createdTo: '',
};

export default function AdminUserList({ onUserSelect, selectedUserId }) {
  const { isMainAdmin } = useUser();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers(appliedFilters);
      setUsers(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError(err.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleApplyFilters = (e) => {
    e?.preventDefault();
    setAppliedFilters({ ...filters });
  };

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleRoleChange = async (userId, newRole) => {
    if (!isMainAdmin) {
      alert('Solo el administrador principal puede cambiar roles');
      return;
    }
    if (!window.confirm(`¿Cambiar el rol de este usuario a "${newRole}"?`)) return;

    try {
      setActionLoading(userId);
      await updateUserRole(userId, newRole);
      await loadUsers();
    } catch (err) {
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
    if (!window.confirm(`¿Eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) return;

    try {
      setActionLoading(userId);
      await deleteUser(userId);
      await loadUsers();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="admin-panel-section admin-users-list">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Cargando usuarios…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-section admin-users-list">
      <form className="admin-filters admin-filters-pro" onSubmit={handleApplyFilters}>
        <div className="admin-filters-row">
          <label className="admin-filter-field">
            <span>Buscar</span>
            <input
              type="search"
              className="admin-input"
              placeholder="Nombre o email"
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
            />
          </label>
          <label className="admin-filter-field">
            <span>Email</span>
            <input
              type="text"
              className="admin-input"
              placeholder="contiene…"
              value={filters.email}
              onChange={(e) => handleFilterChange('email', e.target.value)}
            />
          </label>
          <label className="admin-filter-field">
            <span>Premium</span>
            <select
              className="admin-select"
              value={filters.premium}
              onChange={(e) => handleFilterChange('premium', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Premium</option>
              <option value="false">Free</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span>Rol</span>
            <select
              className="admin-select"
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">Todos</option>
              <option value="usuario">Usuario</option>
              <option value="admin_secundario">Admin secundario</option>
              <option value="admin">Admin principal</option>
            </select>
          </label>
        </div>
        <div className="admin-filters-row">
          <label className="admin-filter-field">
            <span>Registro desde</span>
            <input
              type="date"
              className="admin-input"
              value={filters.createdFrom}
              onChange={(e) => handleFilterChange('createdFrom', e.target.value)}
            />
          </label>
          <label className="admin-filter-field">
            <span>Registro hasta</span>
            <input
              type="date"
              className="admin-input"
              value={filters.createdTo}
              onChange={(e) => handleFilterChange('createdTo', e.target.value)}
            />
          </label>
          <div className="admin-filter-actions">
            <button type="submit" className="admin-btn-primary">
              Filtrar
            </button>
            <button type="button" className="admin-btn-secondary" onClick={handleClearFilters}>
              Limpiar
            </button>
            <button type="button" className="admin-btn-secondary" onClick={loadUsers}>
              Actualizar
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="admin-error">
          <span>{error}</span>
          <button type="button" onClick={loadUsers} className="admin-btn-retry">
            Reintentar
          </button>
        </div>
      )}

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Stripe</th>
              <th>Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="5" className="admin-empty-cell">
                  No hay usuarios con estos filtros
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const roleBadge = getRoleBadge(user);
                const premiumBadge = getPremiumBadge(user);
                const isSelected = selectedUserId === user._id;
                const canManage = isMainAdmin && user.role !== 'admin';

                return (
                  <tr key={user._id} className={isSelected ? 'admin-row-selected' : ''}>
                    <td>
                      <div className="admin-user-cell">
                        <strong>{user.nombre || 'Sin nombre'}</strong>
                        <span className="admin-user-email">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-badge-stack">
                        <span className={`role-badge ${roleBadge.className}`}>{roleBadge.text}</span>
                        <span className={`status-badge ${premiumBadge.className}`}>
                          {premiumBadge.text}
                        </span>
                      </div>
                    </td>
                    <td>
                      {user.stripe_customer_id ? (
                        <span className="admin-stripe-chip" title={user.stripe_customer_id}>
                          {stripeIdShort(user.stripe_customer_id)}
                        </span>
                      ) : (
                        <span className="admin-text-muted">—</span>
                      )}
                    </td>
                    <td>{formatAdminDate(user.created_at)}</td>
                    <td>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-btn-action"
                          onClick={() => onUserSelect?.(user._id)}
                        >
                          Ver
                        </button>
                        {canManage && (
                          <>
                            <select
                              className="admin-select-small"
                              value={user.role}
                              onChange={(e) => handleRoleChange(user._id, e.target.value)}
                              disabled={actionLoading === user._id}
                              aria-label="Cambiar rol"
                            >
                              <option value="usuario">Usuario</option>
                              <option value="admin_secundario">Admin sec.</option>
                            </select>
                            <button
                              type="button"
                              className="admin-btn-danger"
                              onClick={() => handleDeleteUser(user._id, user.nombre)}
                              disabled={actionLoading === user._id}
                              title="Eliminar"
                            >
                              {actionLoading === user._id ? '…' : 'Eliminar'}
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
        <p>
          {users.length} usuario(s)
          {loading ? ' · actualizando…' : ''}
        </p>
      </div>
    </div>
  );
}
