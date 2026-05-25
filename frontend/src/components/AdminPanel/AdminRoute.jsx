import { useUser } from '../../context/UserContext';
import './AdminPanel.css';

export default function AdminRoute({ children }) {
  const { isAdmin, user, loading } = useUser();

  if (loading) {
    return (
      <div className="admin-panel-container admin-pro-layout">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Cargando perfil…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-panel-container admin-pro-layout">
        <div className="admin-access-denied">
          <h2>Acceso denegado</h2>
          <p>No tienes permisos para acceder al panel de administración.</p>
          {user && (
            <p className="admin-access-denied-role">
              Rol actual: <strong>{user.role || 'usuario'}</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  return children;
}
