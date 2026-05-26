export const CMS_TYPE_LABELS = {
  news: 'Noticia',
  announcement: 'Comunicado global',
  banner: 'Banner',
};

export const CMS_STATUS_LABELS = {
  draft: 'Borrador',
  scheduled: 'Programado',
  published: 'Publicado',
  archived: 'Archivado',
};

export function getCmsStatusBadge(item) {
  const status = item?.effectiveStatus || item?.status || 'draft';
  const cls = `cms-status cms-status-${status}`;
  return { text: CMS_STATUS_LABELS[status] || status, className: cls };
}

export function formatCmsDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const EMPTY_CMS_FORM = {
  title: '',
  body: '',
  excerpt: '',
  type: 'news',
  status: 'draft',
  scheduledPublishAt: '',
  bannerVariant: 'info',
  priority: 0,
  dismissible: true,
};
