/** Badges de rol y estado para gestión de usuarios. */

export function getRoleBadge(user) {
  if (user?.role === 'admin' && user?.isMainAdmin) {
    return { text: 'Admin principal', className: 'role-admin' };
  }
  if (user?.role === 'admin') {
    return { text: 'Admin', className: 'role-admin' };
  }
  if (user?.role === 'analista') {
    return { text: 'Analista Deportivo', className: 'role-analista' };
  }
  if (user?.role === 'admin_secundario') {
    return { text: 'Admin secundario', className: 'role-admin-sec' };
  }
  return { text: 'Usuario', className: 'role-usuario' };
}

export function getPremiumBadge(user) {
  if (user?.tipo === 'familia' || user?.plan === 'free-family') {
    return { text: 'Familia', className: 'badge-premium-on' };
  }
  if (user?.premium === true) {
    return { text: 'Premium', className: 'badge-premium-on' };
  }
  return { text: 'Free', className: 'badge-premium-off' };
}

export function formatAdminDate(dateString, withTime = false) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function stripeIdShort(id) {
  if (!id || typeof id !== 'string') return null;
  if (id.length <= 16) return id;
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}
