import { resolveApiUrl, API_BASE_URL } from '../config/apiBase.js';
/**
 * Servicio de Analytics Básico - Fase 0
 * 
 * Implementa tracking básico de eventos para el botón de Comunidad
 * Los eventos se registran en console.log por ahora (puede extenderse a un servicio externo)
 */

/**
 * Registrar clic en el botón de Comunidad
 */
export const trackCommunityButtonClick = () => {
  const timestamp = new Date().toISOString();
  const event = {
    type: 'community_button_click',
    timestamp,
    path: window.location.pathname,
  };

  // Log para desarrollo/debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [Analytics] Comunidad button clicked:', event);
  }

  // Aquí se puede agregar envío a servicio de analytics externo
  // Ejemplo: Google Analytics, Mixpanel, etc.
  // sendToAnalyticsService(event);
};

/**
 * Registrar que se abrió la sección Comunidad
 */
export const trackCommunitySectionOpen = () => {
  const timestamp = new Date().toISOString();
  const event = {
    type: 'community_section_open',
    timestamp,
    path: window.location.pathname,
  };

  // Log para desarrollo/debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('📊 [Analytics] Comunidad section opened:', event);
  }

  // Aquí se puede agregar envío a servicio de analytics externo
  // sendToAnalyticsService(event);
};

/**
 * Función helper para enviar eventos a un servicio de analytics externo
 * (Implementar cuando se necesite)
 */
const sendToAnalyticsService = (event) => {
  // Ejemplo de implementación:
  // if (window.gtag) {
  //   window.gtag('event', event.type, {
  //     event_category: 'community',
  //     event_label: event.path,
  //     value: 1,
  //   });
  // }
};
