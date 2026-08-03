import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserIdFromToken } from '../../services/authService';
import { useUser } from '../../context/UserContext';
import Login from './Login';
import Register from './Register';
import ProtectedView from './ProtectedView';
import ProfilePhotoSettings from './ProfilePhotoSettings';
import DashboardUsuario from './DashboardUsuario';
import EstadisticasApuestas from './EstadisticasApuestas';
import GraficoProfit from './GraficoProfit';
import PanelApuestas from './PanelApuestas';
import SimuladorApuestas from '../../pages/SimuladorApuestas';
import HistorialApuestas from './HistorialApuestas';
import MensajesUsuario from './MensajesUsuario';
import PremiumRequired from '../PremiumRequired';
import PlansPanel from '../Freemium/PlansPanel';
import PremiumTabs from '../ui/PremiumTabs';
import { GoalLogicTitle } from '../GoalLogicTitle';
import './MiCuenta.css';

const MICUENTA_TABS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'herramientas', label: 'Herramientas' },
  { id: 'actividad', label: 'Actividad' },
];

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
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(true);
  const [refreshHistorial, setRefreshHistorial] = useState(0);
  const [activeTab, setActiveTab] = useState('perfil');

  const paymentUserId =
    user?.user_id || user?.id || user?._id || getUserIdFromToken() || undefined;
  const mustCompletePayment =
    user &&
    !isAdmin &&
    !isMainAdmin &&
    !user.billingLocked &&
    user.tipo !== 'familia' &&
    user.plan !== 'free-family' &&
    user.plan !== 'free' &&
    !user.trialActive &&
    !user.hasProAccess &&
    (showPremiumBanner || user.premium !== true);

  // Redirigir administradores al panel de administración
  useEffect(() => {
    if (isAuthenticated && (isAdmin || isMainAdmin)) {
      navigate('/admin');
    }
  }, [isAuthenticated, isAdmin, isMainAdmin, navigate]);

  useEffect(() => {
    if (location.state?.showPlans) {
      setActiveTab('perfil');
      window.setTimeout(() => {
        document.getElementById('planes-usuario')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    }
  }, [location.state?.showPlans]);

  // Accesos rápidos del dashboard apuntan a secciones en Herramientas
  useEffect(() => {
    const onQuickAccess = (event) => {
      const button = event.target.closest('.quick-access-button');
      if (!button?.closest('.dashboard-usuario')) return;
      setActiveTab('herramientas');
    };
    document.addEventListener('click', onQuickAccess);
    return () => document.removeEventListener('click', onQuickAccess);
  }, []);

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
        <div className="micuenta-top-bar">
          <button
            className="logout-button gl-btn-secondary"
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
              <PremiumTabs
                tabs={MICUENTA_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Secciones de Mi Cuenta"
                wrapClassName="micuenta-tabs-wrap"
                sticky
              />

              <div className="micuenta-tabs-body">
                <div
                  className={`micuenta-tab-panel${activeTab === 'perfil' ? ' is-active' : ''}`}
                  role="tabpanel"
                  aria-hidden={activeTab !== 'perfil'}
                >
                  {user && (
                    <div className="micuenta-perfil-hero">
                      <ProfilePhotoSettings
                        user={user}
                        onUpdated={() => loadUserProfile()}
                      />
                      <div className="micuenta-perfil-info">
                        <p><strong>Nombre:</strong> {user.nombre || 'No especificado'}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                        {user.pais && <p><strong>País:</strong> {user.pais}</p>}
                        {user.telefono && <p><strong>Teléfono:</strong> {user.telefono}</p>}
                      </div>
                    </div>
                  )}
                  {user?.role === 'analista' && (
                    <div className="micuenta-analyst-profile-actions">
                      <button
                        type="button"
                        className="micuenta-analyst-profile-btn"
                        onClick={() =>
                          navigate(`/analista/${user.user_id || user.id}`, {
                            state: { analystTab: 'suscriptores' },
                          })
                        }
                      >
                        Ver mi perfil de analista
                      </button>
                    </div>
                  )}
                  <div id="planes-usuario">
                    <PlansPanel />
                  </div>
                </div>

                <div
                  className={`micuenta-tab-panel${activeTab === 'herramientas' ? ' is-active' : ''}`}
                  role="tabpanel"
                  aria-hidden={activeTab !== 'herramientas'}
                >
                  <EstadisticasApuestas refreshTrigger={refreshHistorial} />
                  <GraficoProfit refreshTrigger={refreshHistorial} />
                  <div id="historial-apuestas">
                    <HistorialApuestas refreshTrigger={refreshHistorial} />
                  </div>
                  <div id="panel-apuestas">
                    <PanelApuestas onBetCreated={() => setRefreshHistorial(prev => prev + 1)} />
                  </div>
                  <div id="simulador-apuestas">
                    <SimuladorApuestas />
                  </div>
                </div>

                <div
                  className={`micuenta-tab-panel${activeTab === 'actividad' ? ' is-active' : ''}`}
                  role="tabpanel"
                  aria-hidden={activeTab !== 'actividad'}
                >
                  <DashboardUsuario />
                  <div id="mensajes-usuario">
                    <MensajesUsuario />
                  </div>
                </div>
              </div>
            </div>
          )}
        </ProtectedView>
      </div>
    </div>
  );
};

export default MiCuenta;
