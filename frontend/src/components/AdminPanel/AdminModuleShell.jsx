/** Contenedor reutilizable para módulos del Admin Panel PRO. */
export default function AdminModuleShell({
  title,
  description,
  badge = 'En desarrollo',
  children,
  actions,
}) {
  return (
    <section className="admin-panel-section admin-module-shell">
      <header className="admin-section-header admin-module-shell-header">
        <div>
          <div className="admin-module-shell-title-row">
            <h2>{title}</h2>
            {badge ? <span className="admin-module-badge">{badge}</span> : null}
          </div>
          {description ? <p className="admin-section-subtitle">{description}</p> : null}
        </div>
        {actions ? <div className="admin-module-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
