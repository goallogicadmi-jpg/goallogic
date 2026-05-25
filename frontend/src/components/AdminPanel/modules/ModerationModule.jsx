import AdminModuleShell from '../AdminModuleShell';

export default function ModerationModule() {
  return (
    <AdminModuleShell
      title="Moderación de comunidad"
      description="Publicaciones, comentarios, reportes y sanciones de usuarios."
    >
      <div className="admin-module-grid-2">
        <div className="admin-module-card">
          <h3>Feed y comentarios</h3>
          <p className="admin-placeholder-text">
            Vista unificada de posts/comentarios con eliminar y bloquear (API community existente).
          </p>
        </div>
        <div className="admin-module-card">
          <h3>Reportes</h3>
          <p className="admin-placeholder-text">Cola de contenido reportado por usuarios.</p>
        </div>
      </div>
    </AdminModuleShell>
  );
}
