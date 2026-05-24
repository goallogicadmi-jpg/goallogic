import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { getToken } from '../services/authService';

/**
 * Hook para Gamificación de Comunidad - Fase 3
 * 
 * Características:
 * - Badges de logros simples
 * - Solo muestra 1 badge a la vez
 * - Cache para evitar sobrecarga
 */
export function useCommunityGamification() {
  const { isAuthenticated, user } = useUser();
  const [achievementBadge, setAchievementBadge] = useState(null);
  
  const cacheRef = useRef({ data: null, timestamp: null });

  // Cargar logros del usuario
  const loadAchievements = async () => {
    if (!isAuthenticated || !user?.id) {
      return;
    }

    try {
      // Verificar cache (5 minutos)
      if (cacheRef.current.data && cacheRef.current.timestamp) {
        const cacheAge = Date.now() - cacheRef.current.timestamp;
        if (cacheAge < 5 * 60 * 1000) {
          setAchievementBadge(cacheRef.current.data);
          return;
        }
      }

      const token = getToken();
      if (!token) return;

      // Obtener estadísticas del usuario
      const response = await fetch(`/api/community/user-stats?userId=${user.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const stats = await response.json();
        
        // Determinar badge según estadísticas
        // Prioridad: Top Analista > Análisis Destacado > Muy Participativo
        let badge = null;

        // Top Analista: reacciones útiles > 50
        if (stats.totalUsefulReactions >= 50) {
          badge = {
            type: 'top_analyst',
            emoji: '🔥',
            label: 'Top Analista',
            description: `${stats.totalUsefulReactions} reacciones útiles`
          };
        }
        // Análisis Destacado: posts con >20 reacciones útiles
        else if (stats.highlightedPosts > 0) {
          badge = {
            type: 'highlighted',
            emoji: '⭐',
            label: 'Análisis Destacado',
            description: `${stats.highlightedPosts} análisis destacados`
          };
        }
        // Muy Participativo: >10 posts en la semana
        else if (stats.postsThisWeek >= 10) {
          badge = {
            type: 'participative',
            emoji: '💬',
            label: 'Muy Participativo',
            description: `${stats.postsThisWeek} análisis esta semana`
          };
        }

        setAchievementBadge(badge);
        
        // Guardar en cache
        cacheRef.current = {
          data: badge,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Error cargando logros:', error);
    }
  };

  // Cargar logros al montar y cuando cambia el usuario
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadAchievements();
    } else {
      setAchievementBadge(null);
    }
  }, [isAuthenticated, user?.id]);

  return {
    achievementBadge,
  };
}
