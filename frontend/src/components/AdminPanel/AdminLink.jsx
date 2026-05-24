import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';

/**
 * Componente para mostrar el enlace al panel de administración
 * Solo visible para administradores
 */
const AdminLink = () => {
  const { isAdmin } = useUser();
  const navigate = useNavigate();

  if (!isAdmin) {
    return null;
  }

  return (
    <button
      className="nav-button admin-link-btn"
      onClick={() => navigate('/admin')}
      title="Panel de Administración"
      style={{
        background: 'rgba(242, 138, 0, 0.1)',
        border: '1px solid rgba(242, 138, 0, 0.3)',
        color: '#F28A00'
      }}
    >
      🛡️ Admin
    </button>
  );
};

export default AdminLink;
