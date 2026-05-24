import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { trackCommunityButtonClick, trackCommunitySectionOpen } from '../services/analyticsService';
import { useCommunityNotifications } from '../hooks/useCommunityNotifications';
import { useCommunityLiveFeed } from '../hooks/useCommunityLiveFeed';
import { useCommunityGamification } from '../hooks/useCommunityGamification';
import { getCommunityPreferences } from '../services/communityPreferencesService';
import ComunidadTooltip from './ComunidadButton/ComunidadTooltip';
import Toast from './Toast';
import {
  SESSION_REQUIRED_COMMUNITY_TOAST_MESSAGE,
  SESSION_REQUIRED_TOAST_DURATION_MS,
} from '../constants/sessionMessages';
import './ComunidadButton.css';

/**
 * Componente ComunidadButton - Fase 2 (UX Mejorada)
 * 
 * Características:
 * - Badge de notificaciones (comentarios nuevos)
 * - Indicador de "Nuevo contenido"
 * - Badge "Hot" (actividad reciente)
 * - Estados hover/active mejorados
 * - Tooltip expandible con preview y acciones
 * - Búsqueda rápida
 * - Acciones contextuales
 * - Atajos de teclado
 * - Accesibilidad mejorada
 * - Analytics básicos
 */
const ComunidadButton = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useUser();
  const { notificationCount, hasHotPosts, hasNewContent, updateLastVisit } = useCommunityNotifications();
  const { isLive } = useCommunityLiveFeed();
  const { achievementBadge } = useCommunityGamification();
  const preferences = getCommunityPreferences();
  
  const [showTooltip, setShowTooltip] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const buttonRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  // Determinar si la sección está activa
  const isActive = location.pathname.includes('/comunidad');

  // Obtener icono según preferencias (Fase 3)
  const getIconPath = () => {
    const iconVariant = preferences.iconVariant || 'group';
    
    switch (iconVariant) {
      case 'feed':
        // Icono de feed/lista
        return 'M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z';
      case 'chart':
        // Icono de gráfico/estadísticas
        return 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z';
      case 'group':
      default:
        // Icono de grupo/comunidad (default)
        return 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z';
    }
  };

  // Actualizar timestamp cuando se abre la sección
  useEffect(() => {
    if (isActive) {
      updateLastVisit();
    }
  }, [isActive, updateLastVisit]);

  // Fase 3: Dropdown se abre con clic, no con hover
  // Mantener hover como fallback para accesibilidad
  const handleMouseEnter = useCallback(() => {
    // En Fase 3, el hover solo muestra un preview sutil, no abre el dropdown
    // El dropdown se abre solo con clic
  }, []);

  const handleMouseLeave = useCallback(() => {
    // No hacer nada en hover leave
  }, []);

  // Manejar hover en el dropdown para mantenerlo abierto
  const handleTooltipMouseEnter = useCallback(() => {
    // Mantener abierto si el mouse está sobre el dropdown
  }, []);

  const handleTooltipMouseLeave = useCallback(() => {
    // No cerrar automáticamente al salir del mouse (solo con clic fuera)
  }, []);

  // Manejar focus para mostrar dropdown (accesibilidad)
  const handleFocus = useCallback(() => {
    // No abrir automáticamente con focus (solo con clic)
  }, []);

  const handleBlur = useCallback((e) => {
    // No cerrar si el focus se mueve al dropdown
    if (!e.currentTarget.contains(e.relatedTarget)) {
      // Solo cerrar si realmente se perdió el focus
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && !relatedTarget.closest('.comunidad-dropdown')) {
        setShowTooltip(false);
      }
    }
  }, []);

  // Manejar clic en el botón
  const handleClick = useCallback((e) => {
    console.log('🔵 [ComunidadButton] Click detectado', {
      isAuthenticated,
      showTooltip,
      currentPath: location.pathname
    });
    
    e.preventDefault();
    
    // Verificar autenticación antes de permitir acceso
    if (!isAuthenticated) {
      console.log('🔵 [ComunidadButton] Usuario no autenticado, mostrando toast');
      // Mostrar mensaje de que necesita iniciar sesión
      setShowToast(true);
      return;
    }
    
    console.log('🔵 [ComunidadButton] Usuario autenticado, procesando clic');
    
    // Si está autenticado, comportamiento normal
    // Toggle del dropdown si está abierto, o navegar si está cerrado
    if (showTooltip) {
      console.log('🔵 [ComunidadButton] Dropdown abierto, cerrándolo');
      // Si está abierto, cerrarlo
      setShowTooltip(false);
    } else {
      console.log('🔵 [ComunidadButton] Dropdown cerrado, abriéndolo');
      // Si está cerrado, abrir dropdown
      setShowTooltip(true);
      
      // Si no estamos en /comunidad, navegar primero
      if (!location.pathname.includes('/comunidad')) {
        console.log('🔵 [ComunidadButton] Navegando a /comunidad');
        try {
          navigate('/comunidad');
          console.log('✅ [ComunidadButton] Navegación exitosa');
        } catch (error) {
          console.error('❌ [ComunidadButton] Error al navegar:', error);
        }
      } else {
        console.log('🔵 [ComunidadButton] Ya estamos en /comunidad, solo abriendo dropdown');
      }
    }
  }, [showTooltip, isAuthenticated, navigate, location.pathname]);

  // Manejar tecla Enter o Espacio (accesibilidad)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!showTooltip) {
        setShowTooltip(true);
      } else {
        handleClick(e);
      }
    }
    // Escape para cerrar tooltip
    if (e.key === 'Escape' && showTooltip) {
      setShowTooltip(false);
      buttonRef.current?.focus();
    }
  }, [handleClick, showTooltip]);

  // Atajos de teclado globales
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ctrl/Cmd + Shift + C → Nuevo análisis
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        navigate('/comunidad/nuevo');
      }
      
      // Ctrl/Cmd + K → Abrir búsqueda (solo si no hay input activo)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowTooltip(true);
          // Focus en el input de búsqueda después de un pequeño delay
          setTimeout(() => {
            const searchInput = document.querySelector('.comunidad-tooltip-search-input');
            if (searchInput) {
              searchInput.focus();
            }
          }, 100);
        }
      }
    };

    if (isAuthenticated) {
      window.addEventListener('keydown', handleGlobalKeyDown);
      return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }
  }, [isAuthenticated, navigate]);

  // Limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Log de diagnóstico cuando el componente se monta
  useEffect(() => {
    console.log('🟡 [ComunidadButton] Componente montado/renderizado', {
      isAuthenticated,
      isActive,
      notificationCount,
      hasHotPosts,
      hasNewContent
    });
    return () => {
      console.log('🟡 [ComunidadButton] Componente desmontado');
    };
  }, []);

  // El botón siempre se renderiza, pero las funcionalidades solo están disponibles si está autenticado
  console.log('🟡 [ComunidadButton] Renderizando JSX...');
  return (
    <div 
      className="comunidad-button-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`nav-button comunidad-button ${isActive ? 'active' : ''}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-label={`Comunidad de análisis estadístico${isAuthenticated && notificationCount > 0 ? `, ${notificationCount} notificaciones` : ''}`}
        aria-current={isActive ? 'page' : undefined}
        aria-expanded={showTooltip}
        aria-haspopup="true"
        title="Comunidad de análisis estadístico"
        data-tooltip="Comunidad: Comparte y discute análisis estadísticos profesionales"
      >
        {/* Icono SVG - Dinámico según preferencias (Fase 3) */}
        <svg
          className="nav-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d={getIconPath()} />
        </svg>
        
        {/* Texto del botón */}
        <span>Comunidad</span>

        {/* Badges solo se muestran si el usuario está autenticado */}
        {isAuthenticated && (
          <>
            {/* Badge de notificaciones */}
            {preferences.showNotifications && notificationCount > 0 && (
              <span className="comunidad-badge comunidad-badge-notifications" aria-label={`${notificationCount} notificaciones`}>
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}

            {/* Badge "Hot" */}
            {preferences.showHotIndicator && hasHotPosts && (
              <span className="comunidad-badge comunidad-badge-hot" aria-label="Posts con alta actividad">
                🔥
              </span>
            )}

            {/* Indicador de nuevo contenido */}
            {preferences.showNewContent && hasNewContent && (
              <span className="comunidad-badge comunidad-badge-new" aria-label="Contenido nuevo">
                NUEVO
              </span>
            )}

            {/* Badge Live Feed (Fase 3) */}
            {preferences.liveFeedEnabled && isLive && (
              <span className="comunidad-badge comunidad-badge-live" aria-label="Actividad en vivo">
                LIVE
              </span>
            )}

            {/* Badge de logro (Gamificación - Fase 3) */}
            {preferences.showBadges && achievementBadge && (
              <span className="comunidad-badge comunidad-badge-achievement" aria-label={achievementBadge.label}>
                {achievementBadge.emoji}
              </span>
            )}
          </>
        )}
      </button>

      {/* Tooltip expandible - Solo se muestra si está autenticado */}
      {isAuthenticated && (
        <ComunidadTooltip
          isVisible={showTooltip}
          onClose={() => setShowTooltip(false)}
          buttonRef={buttonRef}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}

      {/* Toast para mensaje de autenticación requerida */}
      {showToast && (
        <Toast
          message={SESSION_REQUIRED_COMMUNITY_TOAST_MESSAGE}
          type="warning"
          duration={SESSION_REQUIRED_TOAST_DURATION_MS}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default ComunidadButton;
