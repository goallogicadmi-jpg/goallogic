import AdminModuleShell from '../AdminModuleShell';

export default function LeaguesDataModule() {
  return (
    <AdminModuleShell
      title="Ligas y datos deportivos"
      description="Catálogo de competiciones, temporadas y sincronización forzada."
    >
      <div className="admin-module-toolbar">
        <button type="button" className="admin-btn-secondary" disabled>
          Forzar sincronización
        </button>
        <button type="button" className="admin-btn-secondary" disabled>
          Actualizar temporadas
        </button>
      </div>
      <div className="admin-module-card">
        <h3>Catálogo de ligas</h3>
        <p className="admin-placeholder-text">
          Activar/desactivar ligas, editar nombres, logos y escudos (pendiente).
        </p>
      </div>
    </AdminModuleShell>
  );
}
