import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import axios from 'axios';
import { getToken } from '../../services/authService';
import { deletePost, deleteComment } from '../../services/communityService';
import { UserInitialAvatar } from '../../components/UserInitialAvatar';

export function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  useEffect(() => {
    loadPost();
  }, [id]);

  const loadPost = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`/api/community/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPost(response.data.post);
      setComments(response.data.comments || []);
    } catch (err) {
      console.error('Error cargando post:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingPost(true);
    try {
      await deletePost(id);
      navigate('/comunidad');
    } catch (err) {
      console.error('Error eliminando post:', err);
      alert(err.message || 'No se pudo eliminar la publicación');
      setDeletingPost(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('¿Eliminar este comentario?')) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      const result = await deleteComment(id, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      setPost((prev) => ({
        ...prev,
        commentsCount: result.commentsCount ?? Math.max(0, (prev.commentsCount || 0) - 1),
      }));
    } catch (err) {
      console.error('Error eliminando comentario:', err);
      alert(err.message || 'No se pudo eliminar el comentario');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleReaction = async (type) => {
    try {
      const token = getToken();
      const response = await axios.post(
        `/api/community/posts/${id}/reactions`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPost({ ...post, reactionsCount: response.data.reactionsCount });
    } catch (err) {
      console.error('Error en reacción:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const token = getToken();
      const response = await axios.post(
        `/api/community/posts/${id}/comments`,
        { text: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComments([...comments, response.data]);
      setNewComment('');
      setPost({ ...post, commentsCount: (post.commentsCount || 0) + 1 });
    } catch (err) {
      console.error('Error comentando:', err);
      alert(err.response?.data?.message || 'Error al comentar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="community-loading">Cargando análisis...</div>;
  }

  if (!post) {
    return <div className="error-message">Análisis no encontrado</div>;
  }

  return (
    <div className="post-detail-page">
      <button onClick={() => navigate('/comunidad')} className="btn btn-back">
        ← Volver al feed
      </button>

      <div className="post-card post-card-detail">
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
            <h2>{post.matchInfo.homeTeam} vs {post.matchInfo.awayTeam}</h2>
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
            onClick={() => handleReaction('like')}
            className={`btn-reaction ${post.reactionsCount?.like > 0 ? 'active' : ''}`}
          >
            👍 {post.reactionsCount?.like || 0}
          </button>
          <button 
            onClick={() => handleReaction('useful')}
            className={`btn-reaction ${post.reactionsCount?.useful > 0 ? 'active' : ''}`}
          >
            ⭐ {post.reactionsCount?.useful || 0}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={handleDeletePost}
              className="btn-admin-delete"
              disabled={deletingPost}
              title="Eliminar publicación (admin)"
            >
              {deletingPost ? 'Eliminando...' : '🗑 Eliminar publicación'}
            </button>
          )}
        </div>
      </div>

      <div className="comments-section">
        <h3>Comentarios ({comments.length})</h3>
        
        <form onSubmit={handleComment} className="comment-form">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
            rows="3"
            required
          />
          <button type="submit" disabled={submitting} className="btn btn-vip">
            {submitting ? 'Enviando...' : 'Comentar'}
          </button>
        </form>

        <div className="comments-list">
          {comments.length === 0 ? (
            <p className="empty-comments">No hay comentarios aún.</p>
          ) : (
            comments.map(comment => (
              <div key={comment._id} className="comment-card">
                <div className="comment-card-header">
                  <div className="comment-author">
                    <UserInitialAvatar
                      nombre={comment.user?.nombre}
                      className="comment-avatar"
                      size={36}
                    />
                  <div>
                    <strong>{comment.user?.nombre || 'Usuario'}</strong>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(comment._id)}
                      className="btn-admin-delete btn-admin-delete--compact"
                      disabled={deletingCommentId === comment._id}
                      title="Eliminar comentario (admin)"
                    >
                      {deletingCommentId === comment._id ? '...' : '🗑'}
                    </button>
                  )}
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
