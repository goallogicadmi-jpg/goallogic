import AdminModuleShell from '../AdminModuleShell';

const LOG_TABS = [
  { id: 'webhook', label: 'Webhook Stripe' },
  { id: 'errors', label: 'Errores backend' },
  { id: 'auth', label: 'Autenticación' },
  { id: 'premium', label: 'Cambios premium' },
  { id: 'moderation', label: 'Moderación' },
];

export default function AuditLogsModule() {
  return (
    <AdminModuleShell
      title="Auditoría del sistema"
      description="Logs centralizados del backend y eventos críticos."
    >
      <div className="admin-pro-subnav">
        {LOG_TABS.map((tab) => (
          <button key={tab.id} type="button" className="admin-nav-btn" disabled>
            {tab.label}
          </button>
        ))}
      </div>
      <div className="admin-module-card">
        <h3>Visor de logs</h3>
        <p className="admin-placeholder-text">
          Integración con Winston / Render logs o almacenamiento en BD (pendiente).
        </p>
      </div>
    </AdminModuleShell>
  );
}
