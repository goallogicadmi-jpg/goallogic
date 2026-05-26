/**
 * Definición canónica de ajustes del sistema (clave → metadatos + valor por defecto).
 */
const SETTINGS_DEFINITIONS = [
  {
    key: 'general.maintenance_mode',
    category: 'general',
    type: 'boolean',
    label: 'Modo mantenimiento',
    description: 'Bloquea el uso de la API pública (excepto admin y health).',
    value: false,
  },
  {
    key: 'general.maintenance_message',
    category: 'general',
    type: 'string',
    label: 'Mensaje de mantenimiento',
    value: 'Estamos en mantenimiento. Vuelve pronto.',
  },
  {
    key: 'general.frontend_url',
    category: 'general',
    type: 'string',
    label: 'URL frontend',
    value: 'https://goallogic.vercel.app',
  },
  {
    key: 'general.backend_public_url',
    category: 'general',
    type: 'string',
    label: 'URL backend público',
    value: 'https://goallogic.onrender.com',
  },
  {
    key: 'general.operational_banner_enabled',
    category: 'general',
    type: 'boolean',
    label: 'Banner operativo activo',
    value: false,
  },
  {
    key: 'general.operational_banner_message',
    category: 'general',
    type: 'string',
    label: 'Mensaje banner operativo',
    value: '',
  },
  {
    key: 'predictions.rate_limit_per_min',
    category: 'predictions',
    type: 'number',
    label: 'Límite predicciones / min',
    value: 10,
    min: 1,
    max: 120,
  },
  {
    key: 'predictions.analizar_rate_limit_per_min',
    category: 'predictions',
    type: 'number',
    label: 'Límite análisis / min',
    value: 5,
    min: 1,
    max: 60,
  },
  {
    key: 'predictions.export_enabled',
    category: 'predictions',
    type: 'boolean',
    label: 'Exportación habilitada',
    value: true,
  },
  {
    key: 'predictions.export_rate_limit_per_min',
    category: 'predictions',
    type: 'number',
    label: 'Límite exportación / min',
    value: 2,
    min: 1,
    max: 20,
  },
  {
    key: 'community.post_rate_limit_per_min',
    category: 'community',
    type: 'number',
    label: 'Posts comunidad / min',
    value: 5,
    min: 1,
    max: 60,
  },
  {
    key: 'community.post_ttl_hours',
    category: 'community',
    type: 'number',
    label: 'TTL publicaciones (horas)',
    value: 72,
    min: 1,
    max: 720,
  },
  {
    key: 'community.reports_enabled',
    category: 'community',
    type: 'boolean',
    label: 'Reportes habilitados',
    value: true,
  },
  {
    key: 'community.max_report_reason_length',
    category: 'community',
    type: 'number',
    label: 'Máx. caracteres en reporte',
    value: 300,
    min: 50,
    max: 1000,
  },
  {
    key: 'leagues.default_domain',
    category: 'leagues',
    type: 'enum',
    label: 'Dominio por defecto',
    value: 'club',
    options: ['club', 'selection'],
  },
  {
    key: 'leagues.show_inactive_in_admin',
    category: 'leagues',
    type: 'boolean',
    label: 'Mostrar inactivas en admin',
    value: true,
  },
  {
    key: 'simulator.default_capital',
    category: 'simulator',
    type: 'number',
    label: 'Capital inicial por defecto',
    value: 1000,
    min: 100,
    max: 1000000,
  },
  {
    key: 'simulator.max_bets_per_user',
    category: 'simulator',
    type: 'number',
    label: 'Máx. apuestas por usuario',
    value: 500,
    min: 10,
    max: 10000,
  },
  {
    key: 'simulator.enabled',
    category: 'simulator',
    type: 'boolean',
    label: 'Simulador habilitado',
    value: true,
  },
];

const DEFINITIONS_BY_KEY = Object.fromEntries(
  SETTINGS_DEFINITIONS.map((d) => [d.key, d])
);

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'predictions', label: 'Predicciones' },
  { id: 'community', label: 'Comunidad' },
  { id: 'leagues', label: 'Ligas' },
  { id: 'simulator', label: 'Simulador' },
];

module.exports = {
  SETTINGS_DEFINITIONS,
  DEFINITIONS_BY_KEY,
  CATEGORIES,
};
