import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminUserList from '../AdminUserList';
import AdminUserProfile from '../AdminUserProfile';
import AdminModuleShell from '../AdminModuleShell';

export default function UsersModule() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState(userId || null);
  const [listKey, setListKey] = useState(0);

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

  const handleUserUpdated = useCallback(() => {
    setListKey((k) => k + 1);
  }, []);

  return (
    <AdminModuleShell
      title="Gestión de usuarios"
      description="Filtros, premium, Stripe y actividad reciente."
      badge={null}
    >
      <div className="admin-panel-grid admin-users-module-grid">
        <div className="admin-panel-col-1">
          <AdminUserList
            key={listKey}
            onUserSelect={handleUserSelect}
            selectedUserId={selectedUserId}
          />
        </div>
        <div className="admin-panel-col-2">
          <AdminUserProfile
            userId={selectedUserId}
            onClose={selectedUserId ? handleCloseProfile : undefined}
            onUserUpdated={handleUserUpdated}
          />
        </div>
      </div>
    </AdminModuleShell>
  );
}
