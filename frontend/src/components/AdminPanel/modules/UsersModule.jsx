import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminUserList from '../AdminUserList';
import AdminUserProfile from '../AdminUserProfile';
import AdminModuleShell from '../AdminModuleShell';

/**
 * Gestión de usuarios — integra listado y perfil existentes.
 * Próximo: filtros avanzados, toggle premium manual, actividad reciente.
 */
export default function UsersModule() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(userId || null);

  useEffect(() => {
    setSelectedUserId(userId || null);
  }, [userId]);

  const handleUserSelect = (id) => {
    setSelectedUserId(id);
    navigate(`/admin/users/${id}`);
  };

  const handleCloseProfile = () => {
    setSelectedUserId(null);
    navigate('/admin/users');
  };

  return (
    <AdminModuleShell
      title="Gestión de usuarios"
      description="Listado, detalles Stripe/premium, roles y eliminación."
      badge={null}
    >
      <div className="admin-panel-grid">
        <div className="admin-panel-col-1">
          <AdminUserList onUserSelect={handleUserSelect} />
        </div>
        {selectedUserId && (
          <div className="admin-panel-col-2">
            <AdminUserProfile userId={selectedUserId} onClose={handleCloseProfile} />
          </div>
        )}
      </div>
      <div className="admin-module-placeholder">
        <h3>Próximamente</h3>
        <ul>
          <li>Filtros por email, fecha, premium y rol</li>
          <li>Activar / desactivar premium manualmente</li>
          <li>Último login y actividad (predicciones, apuestas)</li>
        </ul>
      </div>
    </AdminModuleShell>
  );
}
