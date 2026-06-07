/**
 * Navegación del Admin Panel PRO.
 * mainAdminOnly: solo admin principal (role admin + isMainAdmin).
 */
export const ADMIN_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'General',
    items: [
      {
        id: 'dashboard',
        path: '/admin/dashboard',
        label: 'Dashboard',
        icon: '📊',
        description: 'Resumen general del sistema',
      },
    ],
  },
  {
    id: 'management',
    label: 'Gestión',
    items: [
      {
        id: 'users',
        path: '/admin/users',
        label: 'Usuarios',
        icon: '👥',
        description: 'Listado, premium, Stripe y actividad',
      },
      {
        id: 'familia',
        path: '/admin/familia',
        label: 'Familia',
        icon: '👨‍👩‍👧‍👦',
        description: 'Cuentas familiares con acceso gratuito',
        mainAdminOnly: true,
      },
      {
        id: 'stripe',
        path: '/admin/stripe',
        label: 'Ingresos Stripe',
        icon: '💳',
        description: 'Métricas, suscripciones y pagos',
      },
      {
        id: 'coupons',
        path: '/admin/coupons',
        label: 'Cupones',
        icon: '🎟️',
        description: 'Promociones y descuentos',
        mainAdminOnly: true,
      },
    ],
  },
  {
    id: 'content',
    label: 'Contenido',
    items: [
      {
        id: 'cms',
        path: '/admin/cms',
        label: 'CMS interno',
        icon: '📰',
        description: 'Noticias, banners y avisos globales',
      },
      {
        id: 'leagues',
        path: '/admin/leagues',
        label: 'Ligas y datos',
        icon: '⚽',
        description: 'Catálogo deportivo y sincronización',
      },
      {
        id: 'moderation',
        path: '/admin/moderation',
        label: 'Moderación',
        icon: '🛡️',
        description: 'Comunidad, reportes y sanciones',
      },
    ],
  },
  {
    id: 'messages',
    label: 'Mensajería',
    items: [
      {
        id: 'messages-send',
        path: '/admin/messages/send',
        label: 'Enviar mensaje',
        icon: '✉️',
        description: 'Mensaje individual',
      },
      {
        id: 'messages-bulk',
        path: '/admin/messages/bulk',
        label: 'Mensajes masivos',
        icon: '📢',
        description: 'Segmentación, plantillas y programación',
        mainAdminOnly: true,
      },
      {
        id: 'messages-sent',
        path: '/admin/messages/sent',
        label: 'Mensajes enviados',
        icon: '📬',
        description: 'Campañas, métricas y filtros',
      },
    ],
  },
  {
    id: 'system',
    label: 'Sistema',
    items: [
      {
        id: 'logs',
        path: '/admin/logs',
        label: 'Auditoría',
        icon: '📋',
        description: 'Logs webhook, auth, premium y errores',
      },
      {
        id: 'settings',
        path: '/admin/settings',
        label: 'Configuración',
        icon: '⚙️',
        description: 'URLs, mantenimiento y predicciones',
        mainAdminOnly: true,
      },
    ],
  },
];

export function filterNavForUser(isMainAdmin) {
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.mainAdminOnly || isMainAdmin),
  })).filter((group) => group.items.length > 0);
}

export function findNavItemByPath(pathname) {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.path || pathname.startsWith(`${item.path}/`)) {
        return item;
      }
    }
  }
  if (pathname.startsWith('/admin/users')) {
    return ADMIN_NAV_GROUPS[1].items.find((i) => i.id === 'users');
  }
  return null;
}
