import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../UserAvatar';
import AnalystVerifiedBadge from './AnalystVerifiedBadge';
import AnalystSubscribeButton from './AnalystSubscribeButton';
import './AnalystPremiumPostCard.css';
import '../PostImageUpload.css';

export default function AnalystPremiumPostCard({
  post,
  onReaction,
  onDelete,
  deletingPostId,
  isAdmin,
}) {
  const navigate = useNavigate();
  const author = post.user || {};
  const stats = post.analystStats || {};
  const analystId = author._id || author.id;

  return (
    <article className="analyst-premium-post">
      <header className="analyst-premium-post__header">
        <UserAvatar
          nombre={author.nombre}
          foto_perfil_url={author.foto_perfil_url}
          className="analyst-premium-post__avatar"
          size={48}
        />
        <div className="analyst-premium-post__author">
          <strong className="analyst-premium-post__name">{author.nombre || 'Analista'}</strong>
          <AnalystVerifiedBadge compact />
        </div>
        <span className="analyst-premium-post__badge">Premium</span>
      </header>

      <div className="analyst-premium-post__stats">
        <div>
          <span className="analyst-premium-post__stat-label">Racha</span>
          <strong>{stats.currentStreak ?? 0}</strong>
        </div>
        <div>
          <span className="analyst-premium-post__stat-label">Acierto</span>
          <strong>{stats.winRate ?? 0}%</strong>
        </div>
        <div>
          <span className="analyst-premium-post__stat-label">ROI</span>
          <strong>{stats.roi ?? 0}%</strong>
        </div>
      </div>

      {stats.historySummary?.length ? (
        <div className="analyst-premium-post__history">
          <h4>Historial resumido</h4>
          <ul>
            {stats.historySummary.slice(0, 3).map((row) => (
              <li key={row.id}>
                <span>{row.partido}</span>
                <span className={`analyst-result analyst-result--${row.resultado}`}>
                  {row.resultado}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {post.imagen_url ? (
        <div className="analyst-premium-post__image-wrap">
          <img
            src={post.imagen_url}
            alt="Imagen de la publicación"
            className="analyst-premium-post__image"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="analyst-premium-post__body">
        {post.matchInfo?.homeTeam ? (
          <p className="analyst-premium-post__match">
            {post.matchInfo.homeTeam} vs {post.matchInfo.awayTeam}
            {post.matchInfo.league ? ` · ${post.matchInfo.league}` : ''}
          </p>
        ) : null}
        {post.probability ? <p className="analyst-premium-post__prob">Probabilidad: {post.probability}</p> : null}
        <p>{post.text}</p>
      </div>

      <div className="analyst-premium-post__actions">
        <AnalystSubscribeButton
          analystId={analystId}
          subscribed={post.viewerSubscribedToAnalyst}
          priceCents={author.analystSubscriptionPriceCents}
          hasStripePrice={author.hasStripePrice !== false}
          label="Suscribirse al analista"
        />
        <button
          type="button"
          className="analyst-premium-post__link-btn"
          onClick={() => navigate(`/analista/${analystId}`)}
        >
          Ver historial
        </button>
      </div>

      <footer className="analyst-premium-post__footer">
        <button type="button" onClick={() => onReaction?.(post._id, 'like')}>
          👍 {post.reactionsCount?.like || 0}
        </button>
        <button type="button" onClick={() => onReaction?.(post._id, 'useful')}>
          💡 {post.reactionsCount?.useful || 0}
        </button>
        {isAdmin ? (
          <button
            type="button"
            className="analyst-premium-post__delete"
            onClick={() => onDelete?.(post._id)}
            disabled={deletingPostId === post._id}
          >
            Eliminar
          </button>
        ) : null}
      </footer>
    </article>
  );
}
