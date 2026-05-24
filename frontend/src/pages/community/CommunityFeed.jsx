import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import { getToken } from '../../services/authService';
import { deletePost } from '../../services/communityService';
import { UserInitialAvatar } from '../../components/UserInitialAvatar';

export function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState(null);
  const [filters, setFilters] = useState({ publicationType: '', sort: 'recent' });
  const navigate = useNavigate();
  const { isAdmin } = useUser();

  useEffect(() => {
    loadPosts();
  }, [filters]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get('/api/community/posts', {
        headers: { Authorization: `Bearer ${token}` },
        params: filters
      });
      setPosts(response.data);
    } catch (err) {
      console.error('Error cargando posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingPostId(postId);
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      console.error('Error eliminando post:', err);
      alert(err.message || 'No se pudo eliminar la publicación');
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleReaction = async (postId, type) => {
    try {
      const token = getToken();
      const response = await axios.post(
        `/api/community/posts/${postId}/reactions`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPosts(posts.map(p => 
        p._id === postId 
          ? { ...p, reactionsCount: response.data.reactionsCount }
          : p
      ));
    } catch (err) {
      console.error('Error en reacción:', err);
    }
  };

  if (loading) {
    return <div className="community-loading">Cargando análisis...</div>;
  }

  return (
    <div className="community-feed">
      <div className="community-filters">
        <select 
          value={filters.publicationType} 
          onChange={(e) => setFilters({ ...filters, publicationType: e.target.value })}
        >
          <option value="">Todos los tipos</option>
          <option value="Tiros de esquina">Tiros de esquina</option>
          <option value="Goles">Goles</option>
          <option value="Tarjetas">Tarjetas</option>
          <option value="Equipos">Equipos</option>
          <option value="Comentario">Comentario</option>
        </select>
        <select 
          value={filters.sort} 
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <option value="recent">Más recientes</option>
          <option value="top">Más útiles</option>
        </select>
      </div>

      <div className="posts-list">
        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No hay análisis disponibles aún.</p>
            <button onClick={() => navigate('nuevo')} className="btn btn-vip">
              Crear primera publicación
            </button>
          </div>
        ) : (
          posts.map(post => (
            <div key={post._id} className="post-card">
              <div className="post-header">
                <div className="post-author">
                  <UserInitialAvatar
                    nombre={post.user?.nombre}
                    className="author-avatar"
                    size={40}
                  />
                  <div>
                    <strong>{post.user?.nombre || 'Usuario'}</strong>
                    <span className="post-date">
                      {new Date(post.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>

              {post.publicationType !== 'Comentario' && post.matchInfo?.homeTeam && (
                <div className="post-match-info">
                  <h3>{post.matchInfo.homeTeam} vs {post.matchInfo.awayTeam}</h3>
                  <p>{post.matchInfo.league}</p>
                </div>
              )}

              <div className="post-stats">
                <span className="badge">{post.publicationType || post.modelUsed}</span>
                {post.statsUsed?.map(stat => (
                  <span key={stat} className="badge badge-secondary">{stat}</span>
                ))}
              </div>

              {(post.probability || post.probabilities) && (
                <div className="post-probabilities">
                  {post.probability ? (
                    <div>Probabilidad: {post.probability}</div>
                  ) : (
                    <>
                      <div>Local: {post.probabilities.home?.toFixed(1)}%</div>
                      <div>Empate: {post.probabilities.draw?.toFixed(1)}%</div>
                      <div>Visitante: {post.probabilities.away?.toFixed(1)}%</div>
                    </>
                  )}
                </div>
              )}

              <div className="post-text">{post.text}</div>

              <div className="post-actions">
                <button 
                  onClick={() => handleReaction(post._id, 'like')}
                  className={`btn-reaction ${post.reactionsCount?.like > 0 ? 'active' : ''}`}
                >
                  👍 {post.reactionsCount?.like || 0}
                </button>
                <button 
                  onClick={() => handleReaction(post._id, 'useful')}
                  className={`btn-reaction ${post.reactionsCount?.useful > 0 ? 'active' : ''}`}
                >
                  ⭐ {post.reactionsCount?.useful || 0}
                </button>
                <button 
                  onClick={() => navigate(`post/${post._id}`)}
                  className="btn-comment"
                >
                  💬 {post.commentsCount || 0}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post._id)}
                    className="btn-admin-delete"
                    disabled={deletingPostId === post._id}
                    title="Eliminar publicación (admin)"
                  >
                    {deletingPostId === post._id ? 'Eliminando...' : '🗑 Eliminar'}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
