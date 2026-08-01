import {
  formatPriceCents,
  formatDate,
} from '../../../../services/analystAdminService';

export default function AnalystAdminDashboard({ dashboard, onSelectAnalyst }) {
  if (!dashboard) return <p>Cargando dashboard…</p>;

  const cards = [
    { label: 'Analistas activos', value: dashboard.activeAnalysts ?? 0 },
    { label: 'Pendientes verificación', value: dashboard.pendingVerifications ?? 0 },
    { label: 'Suspendidos', value: dashboard.suspendedAnalysts ?? 0 },
    { label: 'Total suscriptores', value: dashboard.totalSubscribers ?? 0 },
    { label: 'Ingresos analistas', value: formatPriceCents(dashboard.totalRevenueCents) },
  ];

  const tops = [
    { key: 'roi', title: 'Top ROI', field: 'roi', suffix: '%' },
    { key: 'winRate', title: 'Top % acierto', field: 'winRate', suffix: '%' },
    { key: 'streak', title: 'Top racha', field: 'currentStreak', suffix: '' },
    { key: 'subscribers', title: 'Top suscriptores', field: 'subscribers', suffix: '' },
  ];

  return (
    <div className="analyst-admin-dashboard">
      <div className="analyst-admin-stats-grid">
        {cards.map((card) => (
          <article key={card.label} className="analyst-admin-stat-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <div className="analyst-admin-tops-grid">
        {tops.map((top) => (
          <section key={top.key} className="admin-panel-card">
            <h3>{top.title}</h3>
            <ul className="analyst-admin-top-list">
              {(dashboard.tops?.[top.key] || []).map((row) => (
                <li key={row.id}>
                  <button type="button" className="analyst-admin-link-btn" onClick={() => onSelectAnalyst(row.id)}>
                    {row.nombre || 'Analista'}
                  </button>
                  <strong>
                    {row[top.field] ?? 0}
                    {top.suffix}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function AnalystAdminMiniChart({ timeline = [] }) {
  if (!timeline.length) return <p className="admin-panel-card__hint">Sin timeline de rendimiento.</p>;
  const values = timeline.map((p) => p.profit);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 1);
  const range = max - min || 1;
  return (
    <div className="analyst-admin-mini-chart">
      {timeline.slice(-20).map((point, index) => {
        const height = ((point.profit - min) / range) * 100;
        return (
          <div
            key={`${point.date}-${index}`}
            className={`analyst-admin-mini-chart__bar${point.profit >= 0 ? ' is-pos' : ' is-neg'}`}
            style={{ height: `${Math.max(8, height)}%` }}
            title={`${point.partido}: ${point.profit}`}
          />
        );
      })}
    </div>
  );
}

export { formatDate, formatPriceCents };
