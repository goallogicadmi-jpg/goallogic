import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '../context/UserContext';
import { getToken } from '../services/authService';

/**
 * Hook para Live Feed de Comunidad - Fase 3
 * 
 * Características:
 * - Polling optimizado cada 30-45 segundos
 * - Cache para evitar sobrecarga
 * - Opción de desactivar Live Feed
 */
export function useCommunityLiveFeed() {
  const { isAuthenticated, user } = useUser();
  const [liveActivity, setLiveActivity] = useState({
    newPosts: 0,
    newComments: 0,
    lastActivity: null
  });
  const [isLive, setIsLive] = useState(false);
  
  const cacheRef = useRef({ data: null, timestamp: null });
  const intervalRef = useRef(null);

  // Cargar preferencias de Live Feed
  const getLiveFeedPreference = () => {
    const pref = localStorage.getItem('community_live_feed_enabled');
    return pref !== 'false'; // Por defecto activado
  };

  const [liveFeedEnabled, setLiveFeedEnabled] = useState(getLiveFeedPreference());

  // Cargar actividad reciente (usando useCallback para evitar recreaciones)
  const loadLiveActivity = useCallback(async () => {
    if (!isAuthenticated || !liveFeedEnabled) {
      return;
    }

    try {
      const token = getToken();
      if (!token) return;

      // Verificar cache (30 segundos)
      if (cacheRef.current.data && cacheRef.current.timestamp) {
        const cacheAge = Date.now() - cacheRef.current.timestamp;
        if (cacheAge < 30000) {
          setLiveActivity(cacheRef.current.data);
          setIsLive(cacheRef.current.data.newPosts > 0 || cacheRef.current.data.newComments > 0);
          return;
        }
      }

      // Obtener posts recientes (últimos 5 minutos)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const response = await fetch(`/api/community/posts?sort=recent&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        
        // Contar posts nuevos (últimos 5 minutos)
        const newPosts = posts.filter(post => 
          new Date(post.createdAt) > new Date(fiveMinutesAgo)
        ).length;

        // Contar comentarios nuevos (simplificado: posts con comentarios recientes)
        const newComments = posts.filter(post => 
          post.commentsCount > 0 && 
          new Date(post.updatedAt || post.createdAt) > new Date(fiveMinutesAgo)
        ).length;

        const activity = {
          newPosts,
          newComments,
          lastActivity: posts.length > 0 ? posts[0].createdAt : null
        };

        setLiveActivity(activity);
        setIsLive(newPosts > 0 || newComments > 0);
        
        // Guardar en cache
        cacheRef.current = {
          data: activity,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Error cargando Live Feed:', error);
    }
  }, [isAuthenticated, liveFeedEnabled]);

  // Polling cada 30-45 segundos (aleatorio para evitar sincronización)
  useEffect(() => {
    if (!isAuthenticated || !liveFeedEnabled) {
      setIsLive(false);
      setLiveActivity({ newPosts: 0, newComments: 0, lastActivity: null });
      return;
    }

    // Cargar inmediatamente
    loadLiveActivity();

    // Configurar polling con intervalo aleatorio entre 30-45s
    const interval = () => {
      const randomInterval = 30000 + Math.random() * 15000; // 30-45 segundos
      intervalRef.current = setTimeout(() => {
        loadLiveActivity();
        interval(); // Programar siguiente polling
      }, randomInterval);
    };

    interval();

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [isAuthenticated, liveFeedEnabled, loadLiveActivity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar preferencia cuando cambia
  useEffect(() => {
    localStorage.setItem('community_live_feed_enabled', liveFeedEnabled.toString());
  }, [liveFeedEnabled]);

  return {
    isLive,
    liveActivity,
    liveFeedEnabled,
    setLiveFeedEnabled,
  };
}
