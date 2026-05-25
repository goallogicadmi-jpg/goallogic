import AdminModuleShell from '../AdminModuleShell';

const SETTINGS_SECTIONS = [
  'URLs frontend / backend',
  'Modo mantenimiento',
  'Mensajes globales',
  'Configuración de predicciones',
  'Ligas activas',
];

export default function SettingsModule() {
  return (
    <AdminModuleShell
      title="Configuración global"
      description="Parámetros de plataforma visibles solo para admin principal."
      badge="Solo admin principal"
    >
      <div className="admin-module-card">
        <h3>Secciones</h3>
        <ul className="admin-module-list">
          {SETTINGS_SECTIONS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="admin-placeholder-text">Formularios y persistencia en BD/env (pendiente).</p>
      </div>
    </AdminModuleShell>
  );
}
