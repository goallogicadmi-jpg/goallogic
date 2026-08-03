import { useNavigate } from 'react-router-dom';
import { UserAvatar } from '../UserAvatar';
import AnalystVerifiedBadge from './AnalystVerifiedBadge';
import AnalystSubscribeButton from './AnalystSubscribeButton';
import {
  parseProbabilityPercent,
  getPredictionStatus,
  formatStatRoi,
} from '../../utils/analystDisplayUtils';
import './AnalystPremiumPostCard.css';
import '../PostImageUpload.css';

export default function AnalystPremiumPostCard({
  post,
  onReaction,
  onDelete,
  onViewHistory,
  deletingPostId,
  isAdmin,
  variant = 'feed',
  showFooterActions = false,
}) {
  const navigate = useNavigate();
  const author = post.user || {};
  const stats = post.analystStats || {};
  const analystId = author._id || author.id;
  const probabilityPct = parseProbabilityPercent(post.probability);
  const status = getPredictionStatus(post);
  const isVerified = Boolean(author.analystVerifiedAt);
  const roiValue = Number(stats.roi ?? 0);
  const winRate = Number(stats.winRate ?? 0);
  const isProfileVariant = variant === 'profile';

  return (
    <article
      className={`analyst-premium-post${isProfileVariant ? ' analyst-premium-post--profile' : ''}`}
    >
      {!isProfileVariant ? (
        <header className="analyst-premium-post__header">
          <div className="analyst-premium-post__header-main">
            <UserAvatar
              nombre={author.nombre}
              foto_perfil_url={author.foto_perfil_url}
              className="analyst-premium-post__avatar"
              size={52}
            />
            <div className="analyst-premium-post__author">
              <div className="analyst-premium-post__name-row">
                <strong className="analyst-premium-post__name">{author.nombre || 'Analista'}</strong>
                <span className="analyst-premium-post__badge">Premium</span>
              </div>
              {isVerified ? <AnalystVerifiedBadge compact showSubtitle={false} /> : null}
            </div>
          </div>

          <div className="analyst-premium-post__stats">
            <div className="analyst-premium-post__stat">
              <span className="analyst-premium-post__stat-label">Racha</span>
              <strong className="analyst-premium-post__stat-value">{stats.currentStreak ?? 0}</strong>
            </div>
            <div className="analyst-premium-post__stat">
              <span className="analyst-premium-post__stat-label">Acierto</span>
              <strong
                className={`analyst-premium-post__stat-value${
                  winRate >= 50 ? ' analyst-premium-post__stat-value--positive' : ''
                }`}
              >
                {stats.winRate ?? 0}%
              </strong>
            </div>
            <div className="analyst-premium-post__stat">
              <span className="analyst-premium-post__stat-label">ROI</span>
              <strong
                className={`analyst-premium-post__stat-value${
                  roiValue > 0
                    ? ' analyst-premium-post__stat-value--positive'
                    : roiValue < 0
                      ? ' analyst-premium-post__stat-value--negative'
                      : ''
                }`}
              >
                {formatStatRoi(stats.roi)}
              </strong>
            </div>
          </div>
        </header>
      ) : null}

      <section className="analyst-premium-post__body">
        {post.matchInfo?.homeTeam ? (
          <div className="analyst-premium-post__match-block">
            <span className="analyst-premium-post__match-label">Partido</span>
            <p className="analyst-premium-post__match">
              {post.matchInfo.homeTeam}
              <span className="analyst-premium-post__match-vs"> vs </span>
              {post.matchInfo.awayTeam}
            </p>
            {post.matchInfo.league ? (
              <p className="analyst-premium-post__league">{post.matchInfo.league}</p>
            ) : null}
          </div>
        ) : null}

        {probabilityPct != null ? (
          <div className="analyst-premium-post__prob-block">
            <div className="analyst-premium-post__prob-head">
              <span className="analyst-premium-post__prob-label">Probabilidad</span>
              <strong className="analyst-premium-post__prob-value">{probabilityPct}%</strong>
            </div>
            <div className="analyst-premium-post__prob-track" aria-hidden="true">
              <div
                className="analyst-premium-post__prob-fill"
                style={{ width: `${probabilityPct}%` }}
              />
            </div>
          </div>
        ) : post.probability ? (
          <p className="analyst-premium-post__prob-text">Probabilidad: {post.probability}</p>
        ) : null}

        <div className="analyst-premium-post__prediction">
          {post.publicationType ? (
            <span className="analyst-premium-post__prediction-type">{post.publicationType}</span>
          ) : null}
          <p className="analyst-premium-post__text">{post.text}</p>
        </div>

        <div className="analyst-premium-post__status-row">
          <span className={`analyst-premium-post__status analyst-premium-post__status--${status.tone}`}>
            {status.label}
          </span>
          {post.createdAt ? (
            <time className="analyst-premium-post__date" dateTime={post.createdAt}>
              {new Date(post.createdAt).toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </time>
          ) : null}
        </div>

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
      </section>

      <footer className="analyst-premium-post__footer">
        {!isProfileVariant ? (
          <div className="analyst-premium-post__footer-main">
            <AnalystSubscribeButton
              analystId={analystId}
              subscribed={post.viewerSubscribedToAnalyst}
              priceCents={author.analystSubscriptionPriceCents}
              hasStripePrice={author.hasStripePrice !== false}
              label="Suscribirse"
              className="analyst-premium-post__subscribe"
            />
            <button
              type="button"
              className="analyst-premium-post__link-btn"
              onClick={() => navigate(`/analista/${analystId}`)}
            >
              Ver historial
            </button>
          </div>
        ) : null}

        <div className="analyst-premium-post__reactions">
          <button
            type="button"
            className="analyst-premium-post__reaction"
            onClick={() => onReaction?.(post._id, 'like')}
          >
            <span aria-hidden="true">👍</span>
            {post.reactionsCount?.like || 0}
          </button>
          <button
            type="button"
            className="analyst-premium-post__reaction"
            onClick={() => onReaction?.(post._id, 'useful')}
          >
            <span aria-hidden="true">💡</span>
            {post.reactionsCount?.useful || 0}
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="analyst-premium-post__delete"
              onClick={() => onDelete?.(post._id)}
              disabled={deletingPostId === post._id}
            >
              {deletingPostId === post._id ? 'Eliminando…' : 'Eliminar'}
            </button>
          ) : null}
        </div>

        {isProfileVariant && showFooterActions ? (
          <div className="analyst-premium-post__footer-main analyst-premium-post__footer-main--profile">
            <button
              type="button"
              className="analyst-premium-post__link-btn gl-btn-secondary"
              onClick={onViewHistory}
            >
              Ver historial
            </button>
            <AnalystSubscribeButton
              analystId={analystId}
              subscribed={post.viewerSubscribedToAnalyst}
              priceCents={author.analystSubscriptionPriceCents}
              hasStripePrice={author.hasStripePrice !== false}
              label="Suscribirse"
              className="analyst-premium-post__subscribe gl-btn-gold"
            />
          </div>
        ) : null}
      </footer>
    </article>
  );
}
