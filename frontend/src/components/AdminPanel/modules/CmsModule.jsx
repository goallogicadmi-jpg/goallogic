import AdminModuleShell from '../AdminModuleShell';

export default function CmsModule() {
  return (
    <AdminModuleShell
      title="CMS interno"
      description="Noticias, mensajes globales y banners dentro de la app."
    >
      <div className="admin-module-toolbar">
        <button type="button" className="admin-btn-primary" disabled>
          + Nueva noticia
        </button>
        <button type="button" className="admin-btn-secondary" disabled>
          + Nuevo banner
        </button>
      </div>
      <div className="admin-module-card">
        <h3>Contenido publicado</h3>
        <p className="admin-placeholder-text">
          Listado CRUD de noticias / avisos globales (pendiente de API).
        </p>
      </div>
    </AdminModuleShell>
  );
}
