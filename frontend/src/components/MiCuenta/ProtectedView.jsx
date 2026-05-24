import React from 'react';
import { hasToken } from '../../services/authService';
import './MiCuenta.css';

/**
 * Componente que protege contenido basado en autenticación
 * Si no hay token, muestra mensaje de login
 * Si hay token, renderiza el contenido protegido
 */
const ProtectedView = ({ children }) => {
  const isAuthenticated = hasToken();

  if (!isAuthenticated) {
    return (
      <div className="protected-view-message">
        <div className="protected-message-content">
          <h2>🔒 Acceso Restringido</h2>
          <p>Debes iniciar sesión para acceder a este contenido.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedView;
