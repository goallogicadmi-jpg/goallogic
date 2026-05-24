import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { getToken } from '../../services/authService';
import { useCommunityLiveFeed } from '../../hooks/useCommunityLiveFeed';
import { useCommunityGamification } from '../../hooks/useCommunityGamification';
import { getCommunityPreferences, updateCommunityPreference } from '../../services/communityPreferencesService';
import { resolveApiUrl } from '../../config/apiBase.js';
import './ComunidadTooltip.css';

/**
 * Componente ComunidadDropdown - Fase 3
 * 
 * Dropdown robusto que evoluciona del tooltip de Fase 2
 * Muestra:
 * - Preview del último post
 * - Acciones contextuales
 * - Búsqueda rápida
 * - Live Feed (si está activo)
 * - Gamificación (badges de logros)
 * - Secciones organizadas con scroll
 */
const ComunidadTooltip = ({ isVisible, onClose, buttonRef, onMouseEnter, onMouseLeave }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { user } = useUser();
  const tooltipRef = useRef(null);
  const searchInputRef = useRef(null);
  
  const [lastPost, setLastPost] = useState(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [activeSection, setActiveSection] = useState('main'); // 'main', 'my-posts', 'search'

  // Hooks de Fase 3
  const { isLive, liveActivity, liveFeedEnabled, setLiveFeedEnabled } = useCommunityLiveFeed();
  const { achievementBadge } = useCommunityGamification();
  const [preferences, setPreferences] = useState(getCommunityPreferences());

  // Cache para el último post (60 segundos)
  const postCacheRef = useRef({ data: null, timestamp: null });
  const searchTimeoutRef = useRef(null);

  // Detectar acción contextual según la ruta
  const getContextualAction = () => {
    const path = location.pathname;
    
    // Predicciones
    if (path.includes('/predicciones')) {
      return {
        label: 'Compartir este análisis',
        action: () => {
          // En Fase 3 se implementará la acción real
          navigate('/comunidad/nuevo');
          onClose();
        }
      };
    }
    
    // Partido/Match - intentar obtener matchId de params o path
    if (path.includes('/partido/') || path.includes('/match/') || params.matchId) {
      const matchId = params.matchId || path.split('/').pop();
      if (matchId && matchId !== 'partidos' && matchId !== 'matches') {
        return {
          label: 'Ver análisis de este partido',
          action: () => {
            navigate(`/comunidad?matchId=${matchId}`);
            onClose();
          }
        };
      }
    }
    
    // Liga/League - intentar obtener leagueId de params o path
    if (path.includes('/liga/') || path.includes('/league/') || params.leagueId) {
      const leagueId = params.leagueId || path.split('/').pop();
      if (leagueId && leagueId !== 'ligas') {
        return {
          label: 'Ver análisis de esta liga',
          action: () => {
            navigate(`/comunidad?leagueId=${leagueId}`);
            onClose();
          }
        };
      }
    }
    
    return null;
  };

  const contextualAction = getContextualAction();

  // Cargar último post del usuario
  const loadLastPost = useCallback(async () => {
    // Verificar cache
    if (postCacheRef.current.data && postCacheRef.current.timestamp) {
      const cacheAge = Date.now() - postCacheRef.current.timestamp;
      if (cacheAge < 60000) { // 60 segundos
        setLastPost(postCacheRef.current.data);
        return;
      }
    }

    setLoadingPost(true);
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/community/posts?analyst=' + user?.id + '&sort=recent&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const posts = await response.json();
        const post = posts && posts.length > 0 ? posts[0] : null;
        
        setLastPost(post);
        // Guardar en cache
        postCacheRef.current = {
          data: post,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      console.error('Error cargando último post:', error);
    } finally {
      setLoadingPost(false);
    }
  }, [user?.id]);

  // Cargar último post cuando el tooltip se hace visible
  useEffect(() => {
    if (isVisible) {
      loadLastPost();
    }
  }, [isVisible, loadLastPost]);

  // Búsqueda con debounce
  const handleSearch = useCallback(async (query) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const token = getToken();
        if (!token) return;

        // Buscar en posts (título o texto)
        const response = await fetch(resolveApiUrl('/api/community/posts?sort=recent&limit=50'), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const posts = await response.json();
          // Filtrar por query (búsqueda simple en texto)
          const filtered = posts
            .filter(post => 
              post.text?.toLowerCase().includes(query.toLowerCase()) ||
              post.matchInfo?.homeTeam?.toLowerCase().includes(query.toLowerCase()) ||
              post.matchInfo?.awayTeam?.toLowerCase().includes(query.toLowerCase())
            )
            .slice(0, 5); // Limitar a 5 resultados

          setSearchResults(filtered);
        }
      } catch (error) {
        console.error('Error en búsqueda:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300); // Debounce de 300ms
  }, []);

  // Manejar cambio en input de búsqueda
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    handleSearch(value);
  };

  // Cerrar tooltip al hacer clic fuera (solo si no es dentro del tooltip o botón)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        // Verificar que no sea un clic en NotificationBell o su dropdown
        const notificationBell = document.querySelector('.notification-bell-container');
        if (notificationBell && notificationBell.contains(event.target)) {
          return; // No cerrar si se hace clic en NotificationBell
        }
        onClose();
      }
    };

    if (isVisible) {
      // Usar timeout para evitar cerrar inmediatamente al abrir
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isVisible, onClose, buttonRef]);

  // Formatear fecha relativa
  const formatRelativeDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `hace ${diffMins} min`;
    if (diffHours < 24) return `hace ${diffHours} h`;
    if (diffDays < 7) return `hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES');
  };

  // Obtener título del post
  const getPostTitle = (post) => {
    if (post?.matchInfo) {
      return `${post.matchInfo.homeTeam} vs ${post.matchInfo.awayTeam}`;
    }
    return 'Análisis sin título';
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={tooltipRef}
      className="comunidad-tooltip comunidad-dropdown"
      role="menu"
      aria-label="Menú de Comunidad"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Contenedor con scroll */}
      <div className="comunidad-dropdown-content">
        {/* Live Feed Indicator (Fase 3) */}
        {liveFeedEnabled && isLive && (
          <div className="comunidad-tooltip-section comunidad-live-indicator">
            <div className="comunidad-live-badge">
              <span className="comunidad-live-dot"></span>
              <span>LIVE</span>
            </div>
            <div className="comunidad-live-activity">
              {liveActivity.newPosts > 0 && (
                <span>{liveActivity.newPosts} nuevo{liveActivity.newPosts > 1 ? 's' : ''} análisis</span>
              )}
              {liveActivity.newComments > 0 && (
                <span>{liveActivity.newComments} nuevo{liveActivity.newComments > 1 ? 's' : ''} comentario{liveActivity.newComments > 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        )}

        {/* Badge de logro (Gamificación - Fase 3) */}
        {preferences.showBadges && achievementBadge && (
          <div className="comunidad-tooltip-section comunidad-achievement-badge">
            <div className="comunidad-achievement-content">
              <span className="comunidad-achievement-emoji">{achievementBadge.emoji}</span>
              <div>
                <div className="comunidad-achievement-label">{achievementBadge.label}</div>
                <div className="comunidad-achievement-desc">{achievementBadge.description}</div>
              </div>
            </div>
          </div>
        )}

        {/* Preview del último post */}
        <div className="comunidad-tooltip-section">
          <h4 className="comunidad-tooltip-title">Último análisis</h4>
          {loadingPost ? (
            <div className="comunidad-tooltip-loading">Cargando...</div>
          ) : lastPost ? (
            <div 
              className="comunidad-tooltip-post-preview"
              onClick={() => {
                navigate(`/comunidad/post/${lastPost._id}`);
                onClose();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  navigate(`/comunidad/post/${lastPost._id}`);
                  onClose();
                }
              }}
            >
              <div className="comunidad-tooltip-post-title">{getPostTitle(lastPost)}</div>
              <div className="comunidad-tooltip-post-date">
                {formatRelativeDate(lastPost.createdAt)}
              </div>
            </div>
          ) : (
            <div className="comunidad-tooltip-empty">
              Aún no has publicado análisis
            </div>
          )}
        </div>

      {/* Búsqueda rápida */}
      <div className="comunidad-tooltip-section">
        <div className="comunidad-tooltip-search">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar análisis..."
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={() => setShowSearch(true)}
            className="comunidad-tooltip-search-input"
            aria-label="Buscar análisis en la comunidad"
          />
          {showSearch && searchQuery && (
            <div className="comunidad-tooltip-search-results">
              {searchLoading ? (
                <div className="comunidad-tooltip-loading">Buscando...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(post => (
                  <div
                    key={post._id}
                    className="comunidad-tooltip-search-result"
                    onClick={() => {
                      navigate(`/comunidad/post/${post._id}`);
                      onClose();
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/comunidad/post/${post._id}`);
                        onClose();
                      }
                    }}
                  >
                    {getPostTitle(post)}
                  </div>
                ))
              ) : (
                <div className="comunidad-tooltip-empty">No se encontraron resultados</div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* Acciones rápidas */}
        <div className="comunidad-tooltip-actions">
          {contextualAction && (
            <button
              className="comunidad-tooltip-action-btn comunidad-tooltip-action-contextual"
              onClick={contextualAction.action}
            >
              {contextualAction.label}
            </button>
          )}
          <button
            className="comunidad-tooltip-action-btn"
            onClick={() => {
              navigate('/comunidad/nuevo');
              onClose();
            }}
          >
            Nuevo análisis
          </button>
          <button
            className="comunidad-tooltip-action-btn comunidad-tooltip-action-secondary"
            onClick={() => {
              navigate('/comunidad');
              onClose();
            }}
          >
            Ir a Comunidad
          </button>
          <button
            className="comunidad-tooltip-action-btn comunidad-tooltip-action-secondary"
            onClick={() => {
              navigate('/comunidad?analyst=' + user?.id);
              onClose();
            }}
          >
            Mis análisis
          </button>
        </div>
      </div>

      {/* Footer con preferencias y atajos */}
      <div className="comunidad-dropdown-footer">
        {/* Toggle Live Feed */}
        <div className="comunidad-preference-toggle">
          <label>
            <input
              type="checkbox"
              checked={liveFeedEnabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setLiveFeedEnabled(enabled);
                updateCommunityPreference('liveFeedEnabled', enabled);
                setPreferences({ ...preferences, liveFeedEnabled: enabled });
              }}
            />
            <span>Live Feed</span>
          </label>
        </div>
        
        {/* Atajos de teclado (texto pequeño) */}
        <div className="comunidad-tooltip-shortcuts">
          <span>Ctrl/Cmd + Shift + C: Nuevo análisis</span>
          <span>Ctrl/Cmd + K: Buscar</span>
        </div>
      </div>
    </div>
  );
};

export default ComunidadTooltip;
