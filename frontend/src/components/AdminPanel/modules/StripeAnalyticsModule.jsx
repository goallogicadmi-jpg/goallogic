import { useEffect, useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import AdminModuleShell from '../AdminModuleShell';
import { getStripeAnalytics } from '../../../services/stripeAdminService';
import '../AdminPanel.css';

function formatCents(cents, currency = 'usd') {
  const amount = (cents || 0) / 100;
  try {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)}`;
  }
}

function formatMonthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-');
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${months[Number(m) - 1] || m} ${String(y).slice(2)}`;
}

function webhookStatusLabel(status) {
  if (status === 'online') return { text: 'En línea', className: 'webhook-online' };
  if (status === 'idle') return { text: 'Inactivo reciente', className: 'webhook-idle' };
  return { text: 'No configurado', className: 'webhook-off' };
}

export default function StripeAnalyticsModule() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getStripeAnalytics();
      setData(result);
    } catch (err) {
      setError(err.message || 'Error al cargar métricas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const chartData = useMemo(() => {
    if (!data?.charts?.months) return [];
    return data.charts.months.map((month, i) => ({
      month: formatMonthLabel(month),
      ingresos: (data.charts.revenueByMonth[i] || 0) / 100,
      nuevas: data.charts.newSubscriptionsByMonth[i] || 0,
      cancelaciones: data.charts.cancellationsByMonth[i] || 0,
    }));
  }, [data]);

  if (loading) {
    return (
      <AdminModuleShell title="Ingresos y métricas Stripe" description="Cargando datos LIVE…">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Consultando Stripe API…</p>
        </div>
      </AdminModuleShell>
    );
  }

  if (error) {
    return (
      <AdminModuleShell title="Ingresos y métricas Stripe" description="Error al cargar">
        <div className="admin-error">
          <span>{error}</span>
          <button type="button" className="admin-btn-retry" onClick={load}>
            Reintentar
          </button>
        </div>
      </AdminModuleShell>
    );
  }

  const summary = data?.summary || {};
  const webhook = data?.webhook || {};
  const wh = webhookStatusLabel(webhook.status);

  return (
    <AdminModuleShell
      title="Ingresos y métricas Stripe"
      description={`Modo ${data?.livemode ? 'LIVE' : 'TEST'} · mes ${summary.monthLabel || ''}`}
      badge={null}
      actions={
        <button type="button" className="admin-btn-secondary" onClick={load}>
          Actualizar
        </button>
      }
    >
      <div className="admin-stats-grid admin-stripe-metrics">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Ingresos del mes</span>
          <span className="admin-stat-value">{summary.revenueMonthFormatted || '—'}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Nuevas suscripciones</span>
          <span className="admin-stat-value">{summary.newSubscriptionsMonth ?? 0}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Cancelaciones</span>
          <span className="admin-stat-value">{summary.cancellationsMonth ?? 0}</span>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Premium activos</span>
          <span className="admin-stat-value">{summary.premiumActiveCount ?? 0}</span>
          <span className="admin-stat-hint">MongoDB</span>
        </div>
      </div>

      <div className="admin-module-grid-2">
        <div className="admin-module-card admin-webhook-card">
          <h3>Estado del webhook</h3>
          <p>
            <span className={`webhook-status-pill ${wh.className}`}>{wh.text}</span>
            {webhook.configured ? ' · Secreto configurado' : ' · Sin STRIPE_WEBHOOK_SECRET'}
          </p>
          <ul className="admin-webhook-meta">
            <li>
              <strong>Último evento:</strong>{' '}
              {webhook.lastEventType || '—'}
              {webhook.lastEventAt
                ? ` (${new Date(webhook.lastEventAt).toLocaleString('es-ES')})`
                : ''}
            </li>
            <li>
              <strong>Último éxito:</strong>{' '}
              {webhook.lastSuccessAt
                ? new Date(webhook.lastSuccessAt).toLocaleString('es-ES')
                : '—'}
            </li>
            <li>
              <strong>Latencia media:</strong>{' '}
              {webhook.avgLatencyMs != null ? `${webhook.avgLatencyMs} ms` : '—'}
            </li>
            <li>
              <strong>Procesados / errores:</strong> {webhook.totalProcessed ?? 0} /{' '}
              {webhook.totalErrors ?? 0}
            </li>
          </ul>
          {webhook.recentErrors?.length > 0 && (
            <div className="admin-webhook-errors">
              <h4>Errores recientes</h4>
              <ul>
                {webhook.recentErrors.slice(0, 5).map((e) => (
                  <li key={`${e.at}-${e.type}`}>
                    <code>{e.type}</code> — {e.message}
                    <time>{new Date(e.at).toLocaleString('es-ES')}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="admin-module-card">
          <h3>Eventos Stripe (API)</h3>
          <ul className="admin-stripe-events-list">
            {(data?.stripeEvents || []).slice(0, 8).map((ev) => (
              <li key={ev.id}>
                <code>{ev.type}</code>
                <span>{new Date(ev.created).toLocaleString('es-ES')}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="admin-module-card admin-chart-card">
        <h3>Ingresos por mes (USD)</h3>
        <div className="admin-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#aaa" fontSize={12} />
              <YAxis stroke="#aaa" fontSize={12} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #444' }}
                formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Ingresos']}
              />
              <Bar dataKey="ingresos" fill="#F28A00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-module-card admin-chart-card">
        <h3>Suscripciones por mes</h3>
        <div className="admin-chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#aaa" fontSize={12} />
              <YAxis stroke="#aaa" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #444' }} />
              <Legend />
              <Line
                type="monotone"
                dataKey="nuevas"
                name="Nuevas"
                stroke="#4caf50"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="cancelaciones"
                name="Cancelaciones"
                stroke="#f44336"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="admin-module-card">
        <h3>Últimos pagos (Checkout)</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Email</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentPayments || []).length === 0 ? (
                <tr>
                  <td colSpan="5" className="admin-empty-cell">
                    Sin pagos recientes
                  </td>
                </tr>
              ) : (
                data.recentPayments.map((p) => (
                  <tr key={p.id}>
                    <td>{new Date(p.created).toLocaleString('es-ES')}</td>
                    <td>{p.customerEmail || '—'}</td>
                    <td>{formatCents(p.amountTotal, p.currency)}</td>
                    <td>{p.paymentStatus}</td>
                    <td>
                      <code className="admin-code-inline">{p.id.slice(0, 20)}…</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-module-card">
        <h3>Suscripciones activas (Stripe)</h3>
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Plan</th>
                <th>Renovación</th>
                <th>Subscription</th>
              </tr>
            </thead>
            <tbody>
              {(data?.activeSubscriptions || []).length === 0 ? (
                <tr>
                  <td colSpan="4" className="admin-empty-cell">
                    Sin suscripciones activas
                  </td>
                </tr>
              ) : (
                data.activeSubscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <code>{s.customerId?.slice(0, 18)}…</code>
                    </td>
                    <td>
                      {formatCents(s.amount, s.currency)}
                      {s.interval ? ` / ${s.interval}` : ''}
                    </td>
                    <td>
                      {s.currentPeriodEnd
                        ? new Date(s.currentPeriodEnd).toLocaleDateString('es-ES')
                        : '—'}
                    </td>
                    <td>
                      <code className="admin-code-inline">{s.id.slice(0, 18)}…</code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminModuleShell>
  );
}
