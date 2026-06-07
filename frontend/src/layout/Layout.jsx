import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { useUser } from "../context/UserContext";
import NotificationBell from "../components/NotificationBell";
import UserMenuAvatar from "../components/UserMenuAvatar";
import AdminLink from "../components/AdminPanel/AdminLink";
import ComunidadButton from "../components/ComunidadButton";
import Toast from "../components/Toast";
import SiteFooter from "../components/legal/SiteFooter";
import LegalAcceptanceGate from "../components/legal/LegalAcceptanceGate";
import FamilyWelcomeGate from "../components/Familia/FamilyWelcomeGate";
import CmsGlobalBanner from "../components/Cms/CmsGlobalBanner";
import OperationalSettingsBanner from "../components/OperationalSettingsBanner";
import {
  SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from "../constants/sessionMessages";
import logoSrc from "../assets/images/goal-logic-logo.png";

export default function Layout() {
  const [logoError, setLogoError] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [internalActiveSection, setInternalActiveSection] = useState(null);
  const { isAdmin, isMainAdmin, isAuthenticated } = useUser();
  const [showPrediccionesSessionToast, setShowPrediccionesSessionToast] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Escuchar eventos de cambio de sección interna (para "Mi Cuenta" y "Comunidad")
  useEffect(() => {
    const handleSectionChange = (event) => {
      const section = event.detail;
      if (section === 'proyecto' || section === 'escuela') {
        setInternalActiveSection(section);
      } else {
        setInternalActiveSection(null);
      }
    };

    window.addEventListener('changeSection', handleSectionChange);
    return () => {
      window.removeEventListener('changeSection', handleSectionChange);
    };
  }, []);

  // Limpiar estado interno cuando se navega a otras rutas
  useEffect(() => {
    const path = location.pathname;
    if (path !== '/ligas' && path !== '/') {
      setInternalActiveSection(null);
    }
  }, [location.pathname]);

  // Cerrar sidebar al cambiar de ruta
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => document.body.classList.remove('sidebar-open');
  }, [isSidebarOpen]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((open) => !open);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  // Cerrar con tecla Escape
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  // Cerrar al hacer clic en cualquier enlace o botón dentro del drawer
  useEffect(() => {
    const navContainer = navContainerRef.current;
    if (!navContainer) return;

    const handleDrawerClick = (event) => {
      const clickable = event.target.closest('button, a, [role="link"]');
      if (clickable && navContainer.contains(clickable)) {
        setIsSidebarOpen(false);
      }
    };

    navContainer.addEventListener('click', handleDrawerClick);
    return () => navContainer.removeEventListener('click', handleDrawerClick);
  }, []);

  // Determinar la sección activa basada en la ruta y estado interno
  const getActiveSection = () => {
    // Si hay una sección interna activa (proyecto o escuela), usarla
    if (internalActiveSection) {
      return internalActiveSection;
    }
    
    const path = location.pathname;
    if (path === '/' || path === '/ligas' || path === '/clubes') return 'clubes';
    if (path.startsWith('/clubes/')) return 'clubes';
    if (path === '/selecciones') return 'selecciones';
    if (path.startsWith('/selecciones/')) return 'selecciones';
    if (path === '/torneos') return 'clubes';
    if (path === '/predicciones') return 'predicciones';
    if (path.includes('/partidos') || path === '/matches') return 'partidos';
    if (path.includes('/comunidad')) return 'comunidad';
    // Para "Mi Cuenta", se maneja internamente en Torneos.jsx
    // pero necesitamos detectarlo si hay rutas específicas
    return '';
  };

  const activeSection = getActiveSection();
  const navContainerRef = useRef(null);

  // Función para manejar la navegación (memoizada para evitar recreaciones)
  const handleNavigation = useCallback((section) => {
    setIsSidebarOpen(false);
    switch(section) {
      case 'torneos':
      case 'ligas':
      case 'clubes':
        setInternalActiveSection(null);
        navigate('/clubes');
        break;
      case 'selecciones':
        setInternalActiveSection(null);
        navigate('/selecciones');
        break;
      case 'partidos':
        setInternalActiveSection(null);
        navigate('/partidos');
        break;
      case 'predicciones':
        setInternalActiveSection(null);
        if (!isAuthenticated) {
          setShowPrediccionesSessionToast(true);
          return;
        }
        navigate('/predicciones');
        break;
      case 'proyecto':
        // "Mi Cuenta" se maneja internamente en Torneos.jsx
        // Actualizar estado interno ANTES de navegar
        setInternalActiveSection('proyecto');
        // Pasar el estado a través de la navegación para que Torneos lo lea inmediatamente
        navigate('/torneos', { state: { activeSection: 'proyecto' } });
        // También disparar evento para compatibilidad
        window.dispatchEvent(new CustomEvent('changeSection', { detail: 'proyecto' }));
        break;
      case 'comunidad':
        setInternalActiveSection(null);
        navigate('/comunidad');
        break;
      default:
        break;
    }
  }, [navigate, isAuthenticated]);

  // Renderizar botones de navegación
  useEffect(() => {
      console.log('🔵 [Layout] useEffect de renderizado de botones INICIADO');
      console.log('🔵 [Layout] Estado actual:', {
        activeSection,
        pathname: location.pathname,
        isAuthenticated,
        isAdmin,
        isMainAdmin,
        internalActiveSection
      });
      
      // CORRECCIÓN: Usar ref en lugar de getElementById para evitar problemas de timing
      const navContainer = navContainerRef.current;
      console.log('🔵 [Layout] navContainer encontrado (via ref):', navContainer ? '✅ SÍ' : '❌ NO');
      if (!navContainer) {
        console.warn('⚠️ [Layout] No se encontró el contenedor main-header-nav (ref no está disponible)');
        return;
      }
      console.log('🔵 [Layout] navContainer existe, continuando...');
      
      // Limpiar contenido previo (solo los botones creados con document.createElement)
      // El botón de Comunidad ahora se renderiza directamente en el JSX como componente React
      // No debe ser eliminado por esta lógica de limpieza
      const allChildren = Array.from(navContainer.children);
      allChildren.forEach(child => {
        // Eliminar solo los botones creados dinámicamente con document.createElement
        // NO eliminar componentes React (tienen className que empieza con "comunidad-button-wrapper" o tienen data-reactroot)
        const isReactComponent = child.classList?.contains('comunidad-button-wrapper') || 
                                 child.hasAttribute('data-reactroot') ||
                                 child.querySelector?.('.comunidad-button-wrapper');
        if (child.tagName === 'BUTTON' && !isReactComponent) {
          child.remove();
        }
      });
      
      // Crear y agregar botones (incluyendo los que faltaban)
      // Ocultar "Mi Cuenta" para administradores
      // Verificar isAuthenticated de forma segura (puede ser undefined inicialmente)
      // Usar verificación más flexible para manejar estados de carga
      const userIsAuthenticated = isAuthenticated === true || isAuthenticated === undefined ? false : isAuthenticated;
      const userIsAdmin = isAdmin === true;
      const userIsMainAdmin = isMainAdmin === true;
      
      const buttons = [
        { label: 'Clubes', section: 'clubes', path: '/clubes' },
        { label: 'Selecciones', section: 'selecciones', path: '/selecciones' },
        { label: 'Partidos', section: 'partidos', path: '/partidos' },
        { label: 'Predicciones', section: 'predicciones', path: '/predicciones' },
        // NOTA: "Comunidad" ahora se renderiza con el componente React ComunidadButton
        // Se filtra del array para evitar duplicación con document.createElement
        // ...(isAuthenticated === true ? [
        //   { label: 'Comunidad', section: 'comunidad', path: '/comunidad' }
        // ] : [])
      ];
      
      console.log('🔍 [Layout] Renderizando botones:', {
        isAuthenticated: userIsAuthenticated,
        isAuthenticatedRaw: isAuthenticated,
        isAdmin: userIsAdmin,
        isMainAdmin: userIsMainAdmin,
        buttonsCount: buttons.length,
        buttons: buttons.map(b => b.label)
      });
      
      buttons.forEach((btn, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `nav-button ${activeSection === btn.section ? 'active' : ''}`;
      
      // Agregar icono y tooltip para "Mi Cuenta"
      if (btn.section === 'proyecto') {
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z');
        
        iconSvg.appendChild(path);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;
        
        button.appendChild(iconSvg);
        button.appendChild(textSpan);
        
        // Agregar tooltip
        button.setAttribute('title', 'Gestiona tu simulador de apuestas y estadísticas');
        button.setAttribute('data-tooltip', 'Mi Cuenta: Simulador y estadísticas de apuestas');
      } else if (btn.section === 'partidos') {
        // Agregar icono y tooltip para "Partidos"
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';
        
        // Icono de calendario para partidos
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z');
        
        iconSvg.appendChild(path);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;
        
        button.appendChild(iconSvg);
        button.appendChild(textSpan);
        
        // Agregar tooltip
        button.setAttribute('title', 'Ver partidos en vivo y programados');
        button.setAttribute('data-tooltip', 'Partidos: Encuentra todos los partidos de las principales ligas');
      } else if (btn.section === 'clubes') {
        // Agregar icono y tooltip para "Clubes"
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';
        
        // Icono de trofeo/copa para ligas
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.71 4.39 4.97.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.03c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.71 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z');
        
        iconSvg.appendChild(path);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;
        
        button.appendChild(iconSvg);
        button.appendChild(textSpan);
        
        // Agregar tooltip
        button.setAttribute('title', 'Explora competiciones de clubes');
        button.setAttribute('data-tooltip', 'Clubes: ligas, Champions y copas del ecosistema de clubes');
      } else if (btn.section === 'selecciones') {
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M12 2a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7zm-6 5H4.5A1.5 1.5 0 0 0 3 8.5C3 10.43 4.57 12 6.5 12H7a5.05 5.05 0 0 0 3 2.74V18H7v2h10v-2h-3v-3.26A5.05 5.05 0 0 0 17 12h.5A3.5 3.5 0 0 0 21 8.5A1.5 1.5 0 0 0 19.5 7H18v2h1a1.5 1.5 0 0 1-1.5 1.5H17V10c0 2.76-2.24 5-5 5s-5-2.24-5-5v.5h-.5A1.5 1.5 0 0 1 5 9h1V7z');

        iconSvg.appendChild(path);

        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;

        button.appendChild(iconSvg);
        button.appendChild(textSpan);

        button.setAttribute('title', 'Explora torneos de selecciones');
        button.setAttribute('data-tooltip', 'Selecciones: Mundial, Copa América, Euro y Nations League');
      } else if (btn.section === 'predicciones') {
        // Agregar icono y tooltip para "Predicciones"
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';
        
        // Icono de gráfico/tendencia para predicciones
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z');
        
        iconSvg.appendChild(path);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;
        
        button.appendChild(iconSvg);
        button.appendChild(textSpan);
        
        // Agregar tooltip
        button.setAttribute('title', 'Análisis y predicciones de partidos');
        button.setAttribute('data-tooltip', 'Predicciones: Análisis detallado con probabilidades y recomendaciones de apuestas');
      } else if (btn.section === 'comunidad') {
        // Agregar icono y tooltip para "Comunidad"
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('class', 'nav-icon');
        iconSvg.setAttribute('width', '18');
        iconSvg.setAttribute('height', '18');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'currentColor');
        iconSvg.style.marginRight = '8px';
        iconSvg.style.verticalAlign = 'middle';
        
        // Icono de comunidad/grupo
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z');
        
        iconSvg.appendChild(path);
        
        const textSpan = document.createElement('span');
        textSpan.textContent = btn.label;
        
        button.appendChild(iconSvg);
        button.appendChild(textSpan);
        
        // Agregar tooltip
        button.setAttribute('title', 'Comunidad de análisis estadístico');
        button.setAttribute('data-tooltip', 'Comunidad: Comparte y discute análisis estadísticos profesionales');
      } else {
        button.textContent = btn.label;
      }
      
        button.onclick = (e) => {
          e.preventDefault();
          handleNavigation(btn.section);
        };
        // Insertar antes del botón de Comunidad para que Comunidad quede al final
        const comunidadButton = navContainer.querySelector('.comunidad-button-wrapper');
        if (comunidadButton) {
          navContainer.insertBefore(button, comunidadButton);
        } else {
          navContainer.appendChild(button);
        }
      });
  }, [activeSection, location.pathname, handleNavigation, internalActiveSection, isAdmin, isMainAdmin, isAuthenticated]);

  return (
    <>
      <style>{`
        .nav-button {
          font-size: var(--font-size-base);
          font-weight: var(--font-weight-medium);
          color: var(--text-secondary, #B3B8C2) !important;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: var(--spacing-sm) var(--spacing-md);
          position: relative;
          font-family: var(--font-family);
          transition: all 0.25s ease-in-out;
          /* Eliminar todas las sombras blancas o claras */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .nav-button:hover {
          color: var(--text-primary, #FFFFFF) !important;
          background: rgba(242, 138, 0, 0.1) !important;
          /* Sin sombras en hover */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .nav-button:active {
          /* Sin sombras en active */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .nav-button:focus {
          /* Sin sombras en focus */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
          outline: none;
        }
        .nav-button.active {
          color: var(--accent-orange, #F28A00) !important;
          font-weight: var(--font-weight-semibold);
          /* Sin sombras en estado activo */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .nav-button.active:hover {
          background: rgba(242, 138, 0, 0.15) !important;
          /* Sin sombras en hover del botón activo */
          box-shadow: none !important;
          text-shadow: none !important;
          filter: none !important;
        }
        .nav-button.active {
          background: rgba(242, 138, 0, 0.08) !important;
        }
        .nav-button.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: var(--accent-orange);
          border-radius: 3px 3px 0 0;
          /* Sin sombras en el indicador */
          box-shadow: none !important;
        }
        #main-header-nav .nav-button {
          padding: var(--spacing-sm) var(--spacing-md);
          display: inline-flex;
          align-items: center;
        }
        .nav-icon {
          flex-shrink: 0;
        }
        .nav-button[data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 12px;
          background: var(--bg-card, #1E1E1E);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          white-space: nowrap;
          z-index: 1000;
          font-size: 12px;
          color: var(--text-primary, #FFFFFF);
          margin-bottom: 8px;
          pointer-events: none;
          opacity: 0;
          animation: tooltipFadeIn 0.2s ease-in-out 0.3s forwards;
        }
        .nav-button[data-tooltip]:hover::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid var(--border-color, #333);
          z-index: 1001;
          margin-bottom: 2px;
          opacity: 0;
          animation: tooltipFadeIn 0.2s ease-in-out 0.3s forwards;
        }
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
      <header className="main-header">
        <div className="main-header-content">
          <div className="main-header-start">
            <button
              type="button"
              className={`hamburger-btn${isSidebarOpen ? ' open' : ''}`}
              aria-label={isSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isSidebarOpen}
              aria-controls="main-header-nav"
              onClick={toggleSidebar}
            >
              <span className="hamburger-btn__bar bar-top" aria-hidden="true" />
              <span className="hamburger-btn__bar bar-middle" aria-hidden="true" />
              <span className="hamburger-btn__bar bar-bottom" aria-hidden="true" />
            </button>
          </div>
          <div className="main-header-logo-container">
            {!logoError ? (
              <img
                src={logoSrc}
                alt="GoalLogic Logo"
                className="main-header-logo-img"
                width={140}
                height={48}
                decoding="async"
                fetchPriority="high"
                onError={() => setLogoError(true)}
              />
            ) : null}
            <span className={`main-header-logo-text ${logoError ? 'show' : ''}`}>GoalLogic</span>
          </div>
          <nav
            className={`sidebar main-header-nav${isSidebarOpen ? ' open' : ''}`}
            id="main-header-nav"
            ref={navContainerRef}
            aria-label="Navegación principal"
          >
            {/* Los botones de navegación se insertarán aquí dinámicamente */}
            {/* El botón de Comunidad se renderiza directamente como componente React */}
            <ComunidadButton />
          </nav>
          <div className="main-header-actions">
            <AdminLink />
            <NotificationBell />
            <UserMenuAvatar />
          </div>
        </div>
      </header>
      <button
        type="button"
        className={`sidebar-overlay${isSidebarOpen ? ' visible' : ''}`}
        aria-label="Cerrar menú de navegación"
        aria-hidden={!isSidebarOpen}
        tabIndex={isSidebarOpen ? 0 : -1}
        onClick={closeSidebar}
      />
      <CmsGlobalBanner />
      <OperationalSettingsBanner />
      <main className="layout-page-shell">
        <div className="app-container">
          <LegalAcceptanceGate>
            <FamilyWelcomeGate>
              <Outlet />
            </FamilyWelcomeGate>
          </LegalAcceptanceGate>
        </div>
      </main>
      <SiteFooter />
      {showPrediccionesSessionToast && (
        <Toast
          message={SESSION_REQUIRED_PREDICCIONES_TOAST_MESSAGE}
          type="warning"
          duration={SESSION_REQUIRED_TOAST_DURATION_MS}
          onClose={() => setShowPrediccionesSessionToast(false)}
        />
      )}
    </>
  );
}