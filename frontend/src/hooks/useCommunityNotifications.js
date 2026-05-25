import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { getNotificationCount, getHotIndicator } from '../services/communityService';
import { getToken } from '../services/authService';
import { resolveApiUrl } from '../config/apiBase.js';

/**
 * Hook para manejar notificaciones y badges del botón de Comunidad
 * 
 * Características:
 * - Polling cada 60 segundos
 * - Cache en memoria para evitar sobrecarga
 * - Actualización solo cuando cambian los valores
 */
export function useCommunityNotifications() {
  const { isAuthenticated } = useUser();
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasHotPosts, setHasHotPosts] = useState(false);
  const [hasNewContent, setHasNewContent] = useState(false);
  
  const cacheRef = useRef({
    notificationCount: null,
    hasHotPosts: null,
    lastUpdate: null,
  });

  // Verificar si hay contenido nuevo comparando con última visita
  const checkNewContent = async () => {
    if (!isAuthenticated) {
      return;
    }

    const lastVisitKey = 'community_last_visit';
    const lastVisit = localStorage.getItem(lastVisitKey);
    
    // Si no hay timestamp, no mostrar badge (primera vez)
    if (!lastVisit) {
      setHasNewContent(false);
      return;
    }

    try {
      // Obtener el post más reciente para comparar
      const token = getToken();
      if (!token) return;

      const response = await fetch(resolveApiUrl('/api/community/posts?sort=recent&limit=1'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        if (posts && posts.length > 0) {
          const latestPost = posts[0];
          const latestPostDate = new Date(latestPost.createdAt);
          const lastVisitDate = new Date(lastVisit);
          
          // Si el post más reciente es posterior a la última visita, hay contenido nuevo
          setHasNewContent(latestPostDate > lastVisitDate);
        } else {
          setHasNewContent(false);
        }
      }
    } catch (error) {
      console.error('Error verificando contenido nuevo:', error);
      setHasNewContent(false);
    }
  };

  // Cargar timestamp de última visita y verificar contenido nuevo
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const lastVisitKey = 'community_last_visit';
    const lastVisit = localStorage.getItem(lastVisitKey);
    
    // Si no hay timestamp, guardar el actual (primera visita)
    if (!lastVisit) {
      localStorage.setItem(lastVisitKey, new Date().toISOString());
      setHasNewContent(false);
      return;
    }

    // Verificar si hay contenido nuevo
    checkNewContent();
  }, [isAuthenticated]);

  // Función para cargar notificaciones
  const loadNotifications = async () => {
    if (!isAuthenticated) {
      setNotificationCount(0);
      setHasHotPosts(false);
      return;
    }

    try {
      // Cargar contador de notificaciones
      const count = await getNotificationCount();
      
      // Solo actualizar si cambió (para evitar re-renders innecesarios)
      if (count !== cacheRef.current.notificationCount) {
        setNotificationCount(count);
        cacheRef.current.notificationCount = count;
      }

      // Cargar indicador Hot
      const hot = await getHotIndicator();
      
      // Solo actualizar si cambió
      if (hot !== cacheRef.current.hasHotPosts) {
        setHasHotPosts(hot);
        cacheRef.current.hasHotPosts = hot;
      }

      cacheRef.current.lastUpdate = Date.now();
    } catch (error) {
      console.error('Error cargando notificaciones de comunidad:', error);
    }
  };

  // Polling cada 60 segundos
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Cargar inmediatamente
    loadNotifications();
    checkNewContent();

    // Configurar polling
    const interval = setInterval(() => {
      loadNotifications();
      checkNewContent();
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Actualizar timestamp de última visita cuando se abre la sección Comunidad
  const updateLastVisit = () => {
    if (isAuthenticated) {
      localStorage.setItem('community_last_visit', new Date().toISOString());
      setHasNewContent(false);
    }
  };

  return {
    notificationCount,
    hasHotPosts,
    hasNewContent,
    updateLastVisit,
  };
}
