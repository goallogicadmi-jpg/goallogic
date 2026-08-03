import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { UserAvatar } from '../components/UserAvatar';
import AnalystVerifiedBadge from '../components/Analysts/AnalystVerifiedBadge';
import AnalystSubscribeButton from '../components/Analysts/AnalystSubscribeButton';
import AnalystSubscriberMessaging from '../components/Analysts/AnalystSubscriberMessaging';
import AnalystPremiumPostCard from '../components/Analysts/AnalystPremiumPostCard';
import AnalystHistorySummaryCard from '../components/Analysts/AnalystHistorySummaryCard';
import PremiumTabs from '../components/ui/PremiumTabs';
import { GoalLogicSectionHeader } from '../components/GoalLogicTitle';
import { getToken } from '../services/authService';
import { formatStatRoi, getCountryFlagEmoji } from '../utils/analystDisplayUtils';
import {
  getAnalystProfile,
  getAnalystHistory,
  formatPriceCents,
} from '../services/analystService';
import './AnalystProfilePage.css';

const BASE_PROFILE_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'historial', label: 'Historial' },
  { id: 'publicaciones', label: 'Publicaciones' },
];

const SUBSCRIBERS_TAB = { id: 'suscriptores', label: 'Suscriptores y Mensajes' };

function buildProfileTabs(isSelf) {
  if (!isSelf) return BASE_PROFILE_TABS;
  return [...BASE_PROFILE_TABS, SUBSCRIBERS_TAB];
}

function BackToCommunityButton({ onClick }) {
  return (
    <button
      type="button"
      className="analyst-profile-page__back gl-btn-secondary"
      onClick={onClick}
    >
      <span className="analyst-profile-page__back-icon" aria-hidden="true">←</span>
      Volver a Comunidad
    </button>
  );
}

function PerformanceChart({ timeline = [] }) {
  if (!timeline.length) {
    return <p className="analyst-profile__empty">Sin datos de rendimiento aún.</p>;
  }

  const values = timeline.map((p) => p.profit);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  return (
    <div className="analyst-profile__chart" role="img" aria-label="Gráfico de rendimiento acumulado">
      {timeline.map((point, index) => {
        const height = ((point.profit - min) / range) * 100;
        return (
          <div
            key={`${point.date}-${index}`}
            className={`analyst-profile__chart-bar${point.profit >= 0 ? ' is-pos' : ' is-neg'}`}
            style={{ height: `${Math.max(10, height)}%` }}
            title={`${point.partido}: ${point.profit}`}
          />
        );
      })}
    </div>
  );
}

function mapProfilePosts(profile) {
  return (profile.posts || []).map((post) => ({
    ...post,
    user: {
      _id: profile.id,
      nombre: profile.nombre,
      foto_perfil_url: profile.foto_perfil_url,
      analystVerifiedAt: profile.verifiedAt,
      analystSubscriptionPriceCents: profile.subscriptionPriceCents,
      hasStripePrice: profile.hasStripePrice,
    },
    analystStats: profile.stats,
    viewerSubscribedToAnalyst: profile.subscribed,
    isAnalystPremiumPost: true,
  }));
}

export default function AnalystProfilePage() {
  const { analystId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLocked, setHistoryLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(() => location.state?.analystTab || 'resumen');

  const goToCommunity = useCallback(() => {
    navigate('/comunidad');
  }, [navigate]);

  useEffect(() => {
    if (location.state?.analystTab) {
      setActiveTab(location.state.analystTab);
    }
  }, [location.state?.analystTab]);

  const profileTabs = useMemo(
    () => buildProfileTabs(Boolean(profile?.isSelf)),
    [profile?.isSelf]
  );

  useEffect(() => {
    if (!profile?.isSelf && activeTab === 'suscriptores') {
      setActiveTab('resumen');
    }
  }, [profile?.isSelf, activeTab]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await getAnalystProfile(analystId);
        if (cancelled) return;
        setProfile(data);

        if (data.subscribed) {
          try {
            const hist = await getAnalystHistory(analystId);
            if (!cancelled) setHistory(hist);
          } catch (histErr) {
            if (!cancelled && histErr.code === 'subscription_required') {
              setHistoryLocked(true);
            }
          }
        } else {
          setHistoryLocked(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'No se pudo cargar el analista');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [analystId]);

  const enrichedPosts = useMemo(
    () => (profile ? mapProfilePosts(profile) : []),
    [profile]
  );

  const handleReaction = useCallback(async (postId, type) => {
    try {
      const token = getToken();
      const response = await axios.post(
        `/api/community/posts/${postId}/reactions`,
        { type },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile((prev) => {
        if (!prev?.posts) return prev;
        return {
          ...prev,
          posts: prev.posts.map((p) =>
            p._id === postId ? { ...p, reactionsCount: response.data.reactionsCount } : p
          ),
        };
      });
    } catch (err) {
      console.error('Error en reacción:', err);
    }
  }, []);

  const openHistoryTab = () => {
    setActiveTab('historial');
    requestAnimationFrame(() => {
      historyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (loading) {
    return (
      <div className="analyst-profile-page analyst-profile-page--loading">
        <BackToCommunityButton onClick={goToCommunity} />
        <div className="analyst-profile-panel analyst-profile-panel--skeleton">
          Cargando analista…
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="analyst-profile-page analyst-profile-page--error">
        <BackToCommunityButton onClick={goToCommunity} />
        <p>{error || 'Analista no encontrado'}</p>
      </div>
    );
  }

  const stats = history?.stats || profile.stats;
  const timeline = history?.performanceTimeline || stats.performanceTimeline || [];
  const historySummary = profile.historySummary || stats.historySummary || [];
  const roiValue = Number(stats.roi ?? 0);
  const countryFlag = getCountryFlagEmoji(profile.pais);

  return (
    <div className="analyst-profile-page">
      <GoalLogicSectionHeader size="md" className="analyst-profile-page__brand" />

      <BackToCommunityButton onClick={goToCommunity} />

      <div className="analyst-profile-panel">
        <header className="analyst-profile-panel__hero">
          <div className="analyst-profile-panel__hero-bg" aria-hidden="true" />

          <div className="analyst-profile-panel__hero-content">
            <UserAvatar
              nombre={profile.nombre}
              foto_perfil_url={profile.foto_perfil_url}
              size={120}
              className="analyst-profile-panel__avatar"
            />

            <div className="analyst-profile-panel__identity">
              <h1 className="analyst-profile-panel__name">{profile.nombre}</h1>

              <div className="analyst-profile-panel__badges-row">
                <AnalystVerifiedBadge showSubtitle={false} />
                <span className="analyst-profile-panel__badge">Premium</span>
              </div>

              {profile.pais ? (
                <p className="analyst-profile-panel__country">
                  {countryFlag ? (
                    <span className="analyst-profile-panel__country-flag" aria-hidden="true">
                      {countryFlag}
                    </span>
                  ) : null}
                  <span>{profile.pais}</span>
                </p>
              ) : null}

              <p className="analyst-profile-panel__role">Analista Deportivo Certificado</p>

              {profile.subscriberCount != null ? (
                <p className="analyst-profile-panel__subscribers">
                  {profile.subscriberCount} suscriptor{profile.subscriberCount === 1 ? '' : 'es'}
                </p>
              ) : null}
            </div>
          </div>

          {!profile.isSelf ? (
            <div className="analyst-profile-panel__actions">
              <AnalystSubscribeButton
                analystId={profile.id}
                subscribed={profile.subscribed}
                priceCents={profile.subscriptionPriceCents}
                hasStripePrice={profile.hasStripePrice}
                label="Suscribirse"
                className="analyst-profile-panel__subscribe gl-btn-gold"
                onSubscribed={() => window.location.reload()}
              />
              <button
                type="button"
                className="analyst-profile-panel__history-btn gl-btn-secondary"
                onClick={openHistoryTab}
              >
                Ver historial completo
              </button>
              {profile.subscriptionPriceCents != null ? (
                <p className="analyst-profile-panel__price-note">
                  Suscripción: {formatPriceCents(profile.subscriptionPriceCents)}/mes vía Stripe
                </p>
              ) : null}
            </div>
          ) : null}
        </header>

        <div className="analyst-profile-panel__tabs">
          <PremiumTabs
            tabs={profileTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            ariaLabel="Secciones del perfil del analista"
          />
        </div>

        {activeTab === 'resumen' ? (
          <>
            <div className="analyst-profile-panel__metrics-scroll">
              <section className="analyst-profile-panel__metrics" aria-label="Métricas del analista">
                <article className="analyst-profile-panel__metric">
                  <span className="analyst-profile-panel__metric-label">Racha</span>
                  <strong className="analyst-profile-panel__metric-value">{stats.currentStreak ?? 0}</strong>
                </article>
                <article className="analyst-profile-panel__metric">
                  <span className="analyst-profile-panel__metric-label">Acierto</span>
                  <strong className="analyst-profile-panel__metric-value">
                    {stats.winRate ?? 0}%
                  </strong>
                </article>
                <article className="analyst-profile-panel__metric">
                  <span className="analyst-profile-panel__metric-label">ROI</span>
                  <strong
                    className={`analyst-profile-panel__metric-value${
                      roiValue > 0 ? ' is-positive' : roiValue < 0 ? ' is-negative' : ''
                    }`}
                  >
                    {formatStatRoi(stats.roi)}
                  </strong>
                </article>
              </section>
            </div>

            <section className="analyst-profile-panel__chart-section">
              <h2 className="analyst-profile-panel__section-title">Rendimiento</h2>
              <PerformanceChart timeline={timeline} />
            </section>
          </>
        ) : null}

        {activeTab === 'suscriptores' && profile.isSelf ? (
          <section className="analyst-profile-panel__section analyst-profile-panel__section--subscribers">
            <h2 className="analyst-profile-panel__section-title">Suscriptores y Mensajes</h2>
            <p className="analyst-profile-panel__section-desc">
              Gestiona tus suscriptores activos y envía mensajes a su bandeja en Mi Cuenta → Actividad.
            </p>
            <AnalystSubscriberMessaging analystId={profile.id} />
          </section>
        ) : null}

        {activeTab === 'historial' ? (
          <section
            id="historial-completo"
            ref={historyRef}
            className="analyst-profile-panel__section"
          >
            <h2 className="analyst-profile-panel__section-title">Historial resumido</h2>

            {historySummary.length > 0 ? (
              <div className="analyst-profile-panel__history-grid">
                {historySummary.map((item) => (
                  <AnalystHistorySummaryCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <p className="analyst-profile__empty">Sin apuestas registradas aún.</p>
            )}

            {historyLocked ? (
              <div className="analyst-profile-panel__locked">
                <p>Suscríbete para ver el historial completo, rachas detalladas y gráficos avanzados.</p>
              </div>
            ) : (
              <>
                <div className="analyst-profile-panel__summary-row">
                  <span>Ganadas: <strong>{stats.totalGanadas ?? 0}</strong></span>
                  <span>Perdidas: <strong>{stats.totalPerdidas ?? 0}</strong></span>
                  <span>Total: <strong>{stats.totalApuestas ?? 0}</strong></span>
                </div>
                <div className="analyst-profile-panel__table-wrap">
                  <table className="analyst-profile-panel__table">
                    <thead>
                      <tr>
                        <th>Partido</th>
                        <th>Mercado</th>
                        <th>Cuota</th>
                        <th>Resultado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(history?.bets || []).map((bet) => (
                        <tr key={bet._id}>
                          <td>{bet.partido}</td>
                          <td>{bet.mercado}</td>
                          <td>{bet.cuota}</td>
                          <td className={`analyst-result analyst-result--${bet.resultado}`}>
                            {bet.resultado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        ) : null}

        {activeTab === 'publicaciones' ? (
          <section className="analyst-profile-panel__section">
            <h2 className="analyst-profile-panel__section-title">Publicaciones</h2>
            {enrichedPosts.length ? (
              <div className="analyst-profile-panel__posts">
                {enrichedPosts.map((post) => (
                  <AnalystPremiumPostCard
                    key={post._id}
                    post={post}
                    variant="profile"
                    onReaction={handleReaction}
                    onViewHistory={openHistoryTab}
                    showFooterActions={!profile.isSelf}
                  />
                ))}
              </div>
            ) : (
              <p className="analyst-profile__empty">Este analista aún no tiene publicaciones.</p>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}
