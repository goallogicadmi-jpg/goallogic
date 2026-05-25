import AdminModuleShell from '../AdminModuleShell';

const PLACEHOLDER_METRICS = [
  { label: 'Ingresos del mes', value: '—', hint: 'Stripe API' },
  { label: 'Nuevas suscripciones', value: '—', hint: 'Este mes' },
  { label: 'Cancelaciones', value: '—', hint: 'Este mes' },
  { label: 'Premium vs free', value: '—', hint: 'MongoDB + Stripe' },
];

export default function StripeAnalyticsModule() {
  return (
    <AdminModuleShell
      title="Ingresos y métricas Stripe"
      description="Dashboard financiero, suscripciones y estado del webhook."
    >
      <div className="admin-stats-grid">
        {PLACEHOLDER_METRICS.map((m) => (
          <div key={m.label} className="admin-stat-card admin-stat-card-placeholder">
            <span className="admin-stat-label">{m.label}</span>
            <span className="admin-stat-value">{m.value}</span>
            <span className="admin-stat-hint">{m.hint}</span>
          </div>
        ))}
      </div>
      <div className="admin-module-grid-2">
        <div className="admin-module-card">
          <h3>Últimos pagos</h3>
          <p className="admin-placeholder-text">Tabla de checkout / invoices recientes.</p>
        </div>
        <div className="admin-module-card">
          <h3>Webhook</h3>
          <p className="admin-placeholder-text">
            Estado online/offline y últimos eventos <code>checkout.session.completed</code>.
          </p>
        </div>
      </div>
      <div className="admin-module-card admin-module-chart-placeholder">
        <h3>Crecimiento mensual</h3>
        <p className="admin-placeholder-text">Gráfica de suscripciones e ingresos (pendiente).</p>
      </div>
    </AdminModuleShell>
  );
}
