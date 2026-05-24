import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserIdFromToken } from '../../services/authService';
import { useUser } from '../../context/UserContext';
import Login from './Login';
import Register from './Register';
import ProtectedView from './ProtectedView';
import ProfilePhoto from './ProfilePhoto';
import DashboardUsuario from './DashboardUsuario';
import EstadisticasApuestas from './EstadisticasApuestas';
import GraficoProfit from './GraficoProfit';
import PanelApuestas from './PanelApuestas';
import SimuladorApuestas from '../../pages/SimuladorApuestas';
import HistorialApuestas from './HistorialApuestas';
import MensajesUsuario from './MensajesUsuario';
import PremiumRequired from '../PremiumRequired';
import { GoalLogicTitle } from '../GoalLogicTitle';
import './MiCuenta.css';

/**
 * Componente principal de Mi Cuenta
 * Controla el acceso basado en autenticación
 * - Si NO hay token: muestra Login y Register
 * - Si hay token: muestra contenido protegido
 */
const MiCuenta = () => {
  const { 
    user, 
    isAuthenticated, 
    loading, 
    handleLogout, 
    loadUserProfile,
    isAdmin,
    isMainAdmin,
    showPremiumBanner
  } = useUser();
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(true); // true = login, false = register
  const [refreshHistorial, setRefreshHistorial] = useState(0);

  const paymentUserId =
    user?.user_id || user?.id || user?._id || getUserIdFromToken() || undefined;
  const mustCompletePayment =
    user &&
    !isAdmin &&
    !isMainAdmin &&
    (showPremiumBanner || user.premium !== true);

  // Redirigir administradores al panel de administración
  useEffect(() => {
    if (isAuthenticated && (isAdmin || isMainAdmin)) {
      navigate('/admin');
    }
  }, [isAuthenticated, isAdmin, isMainAdmin, navigate]);

  const handleLoginSuccess = () => {
    // El UserContext ya maneja la carga del perfil
    // Solo necesitamos esperar a que se actualice el estado
    loadUserProfile();
  };

  // Mostrar loading mientras carga el perfil
  if (loading) {
    return (
      <div className="micuenta-container">
        <div className="micuenta-loading">
          <p>Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Si NO está autenticado: mostrar Login/Register
  if (!isAuthenticated) {
    return (
      <div className="micuenta-container">
        <div className="micuenta-auth-section">
          <div className="micuenta-brand-top">
            <GoalLogicTitle as="h1" size="xl" />
          </div>
          <div className="micuenta-header">
            <p>Inicia sesión o crea una cuenta para acceder a tu panel de apuestas</p>
          </div>

          <div className="auth-tabs">
            <button
              className={`auth-tab ${showLogin ? 'active' : ''}`}
              onClick={() => setShowLogin(true)}
            >
              Iniciar Sesión
            </button>
            <button
              className={`auth-tab ${!showLogin ? 'active' : ''}`}
              onClick={() => setShowLogin(false)}
            >
              Registrarse
            </button>
          </div>

          {showLogin ? (
            <Login onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Register />
          )}
        </div>
      </div>
    );
  }

  // Si está autenticado: mostrar contenido protegido
  return (
    <div className="micuenta-container">
      <div className="micuenta-content">
        <div className="micuenta-brand-top">
          <GoalLogicTitle as="h1" size="xl" />
        </div>
        <div className="micuenta-header-authenticated">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {user && (
              <ProfilePhoto nombre={user.nombre} />
            )}
            <div>
              {user && (
                <div className="micuenta-user-info">
                  <p><strong>Nombre:</strong> {user.nombre || 'No especificado'}</p>
                  <p><strong>Email:</strong> {user.email}</p>
                  {user.telefono && <p><strong>Teléfono:</strong> {user.telefono}</p>}
                </div>
              )}
            </div>
          </div>
          <button
            className="logout-button"
            onClick={handleLogout}
            title="Cerrar sesión"
          >
            Cerrar Sesión
          </button>
        </div>

        <ProtectedView>
          {mustCompletePayment ? (
            <PremiumRequired userId={paymentUserId} />
          ) : (
            <div className="micuenta-protected-content">
              <DashboardUsuario />

              <EstadisticasApuestas refreshTrigger={refreshHistorial} />
              <GraficoProfit refreshTrigger={refreshHistorial} />
              <div id="panel-apuestas">
                <PanelApuestas onBetCreated={() => setRefreshHistorial(prev => prev + 1)} />
              </div>
              <div id="historial-apuestas">
                <HistorialApuestas refreshTrigger={refreshHistorial} />
              </div>
              <div id="simulador-apuestas">
                <SimuladorApuestas />
              </div>
              <div id="mensajes-usuario">
                <MensajesUsuario />
              </div>
            </div>
          )}
        </ProtectedView>
      </div>
    </div>
  );
};

export default MiCuenta;
