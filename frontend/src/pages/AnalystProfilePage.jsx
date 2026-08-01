import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { UserAvatar } from '../components/UserAvatar';
import AnalystVerifiedBadge from '../components/Analysts/AnalystVerifiedBadge';
import AnalystSubscribeButton from '../components/Analysts/AnalystSubscribeButton';
import AnalystSubscriberMessaging from '../components/Analysts/AnalystSubscriberMessaging';
import {
  getAnalystProfile,
  getAnalystHistory,
  formatPriceCents,
} from '../services/analystService';
import './AnalystProfilePage.css';

function PerformanceChart({ timeline = [] }) {
  if (!timeline.length) {
    return <p className="analyst-profile__empty">Sin datos de rendimiento aún.</p>;
  }

  const values = timeline.map((p) => p.profit);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;

  return (
    <div className="analyst-performance-chart" aria-hidden="true">
      {timeline.map((point, index) => {
        const height = ((point.profit - min) / range) * 100;
        return (
          <div
            key={`${point.date}-${index}`}
            className={`analyst-performance-chart__bar${point.profit >= 0 ? ' is-pos' : ' is-neg'}`}
            style={{ height: `${Math.max(8, height)}%` }}
            title={`${point.partido}: ${point.profit}`}
          />
        );
      })}
    </div>
  );
}

export default function AnalystProfilePage() {
  const { analystId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyLocked, setHistoryLocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return <div className="analyst-profile-page analyst-profile-page--loading">Cargando analista…</div>;
  }

  if (error || !profile) {
    return (
      <div className="analyst-profile-page analyst-profile-page--error">
        <p>{error || 'Analista no encontrado'}</p>
        <button type="button" onClick={() => navigate('/comunidad')}>
          Volver a comunidad
        </button>
      </div>
    );
  }

  const stats = history?.stats || profile.stats;

  return (
    <div className="analyst-profile-page">
      <header className="analyst-profile__hero">
        <UserAvatar
          nombre={profile.nombre}
          foto_perfil_url={profile.foto_perfil_url}
          size={88}
          className="analyst-profile__avatar"
        />
        <div className="analyst-profile__identity">
          <h1>{profile.nombre}</h1>
          <AnalystVerifiedBadge />
          {profile.pais ? <p className="analyst-profile__country">{profile.pais}</p> : null}
        </div>
      </header>

      <section className="analyst-profile__stats-grid">
        <article><span>Racha actual</span><strong>{stats.currentStreak ?? 0}</strong></article>
        <article><span>% acierto</span><strong>{stats.winRate ?? 0}%</strong></article>
        <article><span>ROI</span><strong>{stats.roi ?? 0}%</strong></article>
        <article><span>Suscriptores</span><strong>{profile.subscriberCount ?? 0}</strong></article>
      </section>

      {!profile.isSelf ? (
        <div className="analyst-profile__subscribe">
          <AnalystSubscribeButton
            analystId={profile.id}
            subscribed={profile.subscribed}
            priceCents={profile.subscriptionPriceCents}
            hasStripePrice={profile.hasStripePrice}
            label="Suscribirse"
            onSubscribed={() => window.location.reload()}
          />
          {profile.subscriptionPriceCents != null ? (
            <p className="analyst-profile__price-note">
              Suscripción: {formatPriceCents(profile.subscriptionPriceCents)}/mes vía Stripe
            </p>
          ) : null}
        </div>
      ) : null}

      {profile.isSelf ? (
        <section className="analyst-profile__section">
          <AnalystSubscriberMessaging analystId={profile.id} />
        </section>
      ) : null}

      <section className="analyst-profile__section">
        <h2>Historial de apuestas</h2>
        {historyLocked ? (
          <div className="analyst-profile__locked">
            <p>Suscríbete para ver el historial completo, rachas y gráficos de rendimiento.</p>
          </div>
        ) : (
          <>
            <div className="analyst-profile__summary-row">
              <span>Ganadas: {stats.totalGanadas ?? 0}</span>
              <span>Perdidas: {stats.totalPerdidas ?? 0}</span>
              <span>Total: {stats.totalApuestas ?? 0}</span>
            </div>
            <PerformanceChart timeline={history?.performanceTimeline || stats.performanceTimeline} />
            <div className="analyst-profile__bets-table-wrap">
              <table className="analyst-profile__bets-table">
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
                      <td className={`analyst-result analyst-result--${bet.resultado}`}>{bet.resultado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="analyst-profile__section">
        <h2>Publicaciones</h2>
        {profile.posts?.length ? (
          <ul className="analyst-profile__posts">
            {profile.posts.map((post) => (
              <li key={post._id}>
                <strong>{post.publicationType}</strong>
                <p>{post.text}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="analyst-profile__empty">Este analista aún no tiene publicaciones.</p>
        )}
      </section>
    </div>
  );
}
