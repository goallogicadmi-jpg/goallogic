import AdminModuleShell from '../AdminModuleShell';

export default function CouponsModule() {
  return (
    <AdminModuleShell
      title="Cupones y promociones"
      description="Crear, activar y auditar cupones Stripe (p. ej. pruebas 100% off)."
    >
      <div className="admin-module-toolbar">
        <button type="button" className="admin-btn-primary" disabled>
          + Crear cupón
        </button>
      </div>
      <div className="admin-module-card">
        <h3>Cupones activos</h3>
        <p className="admin-placeholder-text">
          Listado con usos, vigencia y enlace a Stripe Dashboard (pendiente).
        </p>
        <p className="admin-placeholder-text">
          Actual en env: <code>STRIPE_COUPON_ID</code> aplicado en checkout.
        </p>
      </div>
    </AdminModuleShell>
  );
}
