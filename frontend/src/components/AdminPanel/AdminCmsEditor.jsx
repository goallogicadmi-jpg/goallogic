import { useState, useEffect, useCallback } from 'react';
import {
  getCmsItem,
  createCmsItem,
  updateCmsItem,
  deleteCmsItem,
  publishCmsItem,
  unpublishCmsItem,
} from '../../services/cmsAdminService';
import { SimpleMarkdown } from '../../utils/simpleMarkdown';
import { EMPTY_CMS_FORM, getCmsStatusBadge } from './adminCmsUtils';
import './AdminPanel.css';

export default function AdminCmsEditor({ itemId, isNew, onSaved, onDeleted, onClose }) {
  const [form, setForm] = useState(EMPTY_CMS_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [scheduleMode, setScheduleMode] = useState(false);

  const load = useCallback(async () => {
    if (isNew || !itemId) {
      setForm(EMPTY_CMS_FORM);
      setScheduleMode(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getCmsItem(itemId);
      setForm({
        title: data.title || '',
        body: data.body || '',
        excerpt: data.excerpt || '',
        type: data.type || 'news',
        status: data.status || 'draft',
        scheduledPublishAt: data.scheduledPublishAt
          ? new Date(data.scheduledPublishAt).toISOString().slice(0, 16)
          : '',
        bannerVariant: data.bannerVariant || 'info',
        priority: data.priority ?? 0,
        dismissible: data.dismissible !== false,
      });
      setScheduleMode(data.status === 'scheduled');
    } catch (err) {
      alert(err.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, [itemId, isNew]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const buildPayload = () => {
    let status = form.status;
    if (scheduleMode && form.scheduledPublishAt) {
      status = 'scheduled';
    } else if (status === 'scheduled' && !form.scheduledPublishAt) {
      status = 'draft';
    }
    return {
      title: form.title,
      body: form.body,
      excerpt: form.excerpt,
      type: form.type,
      status,
      scheduledPublishAt: scheduleMode && form.scheduledPublishAt
        ? new Date(form.scheduledPublishAt).toISOString()
        : null,
      bannerVariant: form.bannerVariant,
      priority: Number(form.priority) || 0,
      dismissible: form.dismissible,
    };
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      alert('Título y contenido son obligatorios');
      return;
    }
    try {
      setSaving(true);
      const payload = buildPayload();
      if (isNew) {
        const created = await createCmsItem(payload);
        onSaved?.(created);
      } else {
        const updated = await updateCmsItem(itemId, payload);
        onSaved?.(updated);
      }
    } catch (err) {
      alert(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishNow = async () => {
    if (!window.confirm('¿Publicar ahora este contenido?')) return;
    try {
      setSaving(true);
      if (isNew) {
        const created = await createCmsItem({ ...buildPayload(), status: 'published' });
        onSaved?.(created);
      } else {
        const updated = await publishCmsItem(itemId);
        onSaved?.(updated);
        await load();
      }
    } catch (err) {
      alert(err.message || 'Error al publicar');
    } finally {
      setSaving(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!form.scheduledPublishAt) {
      alert('Indica fecha y hora de publicación');
      return;
    }
    if (!window.confirm('¿Programar publicación para la fecha indicada?')) return;
    try {
      setSaving(true);
      const sched = new Date(form.scheduledPublishAt).toISOString();
      if (isNew) {
        const created = await createCmsItem({
          ...buildPayload(),
          status: 'scheduled',
          scheduledPublishAt: sched,
        });
        onSaved?.(created);
      } else {
        const updated = await publishCmsItem(itemId, sched);
        onSaved?.(updated);
        await load();
      }
    } catch (err) {
      alert(err.message || 'Error al programar');
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('¿Despublicar y volver a borrador?')) return;
    try {
      setSaving(true);
      const updated = await unpublishCmsItem(itemId);
      onSaved?.(updated);
      await load();
    } catch (err) {
      alert(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar permanentemente este contenido?')) return;
    try {
      setSaving(true);
      await deleteCmsItem(itemId);
      onDeleted?.();
    } catch (err) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && !itemId) {
    return (
      <div className="admin-cms-editor admin-cms-editor-empty">
        <p>Selecciona un ítem o crea contenido nuevo.</p>
      </div>
    );
  }

  const statusBadge = !isNew ? getCmsStatusBadge({ status: form.status, effectiveStatus: form.status }) : null;

  return (
    <div className="admin-cms-editor">
      <div className="admin-cms-editor-header">
        <h3>{isNew ? 'Nuevo contenido' : 'Editar contenido'}</h3>
        <div className="admin-cms-editor-header-actions">
          {statusBadge && (
            <span className={`admin-badge ${statusBadge.className}`}>{statusBadge.text}</span>
          )}
          {onClose && (
            <button type="button" className="admin-btn-ghost" onClick={onClose}>
              Cerrar
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
        </div>
      ) : (
        <form className="admin-cms-form" onSubmit={handleSave}>
          <label className="admin-cms-field">
            <span>Título</span>
            <input
              className="admin-input"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
            />
          </label>

          <div className="admin-cms-field-row">
            <label className="admin-cms-field">
              <span>Tipo</span>
              <select
                className="admin-input"
                value={form.type}
                onChange={(e) => handleChange('type', e.target.value)}
              >
                <option value="news">Noticia</option>
                <option value="announcement">Comunicado global</option>
                <option value="banner">Banner en app</option>
              </select>
            </label>
            <label className="admin-cms-field">
              <span>Estado</span>
              <select
                className="admin-input"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                <option value="draft">Borrador</option>
                <option value="scheduled">Programado</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
          </div>

          {form.type === 'banner' && (
            <div className="admin-cms-field-row">
              <label className="admin-cms-field">
                <span>Estilo banner</span>
                <select
                  className="admin-input"
                  value={form.bannerVariant}
                  onChange={(e) => handleChange('bannerVariant', e.target.value)}
                >
                  <option value="info">Info</option>
                  <option value="warning">Aviso</option>
                  <option value="success">Éxito</option>
                </select>
              </label>
              <label className="admin-cms-field">
                <span>Prioridad</span>
                <input
                  type="number"
                  className="admin-input"
                  value={form.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                />
              </label>
              <label className="admin-cms-field admin-cms-check">
                <input
                  type="checkbox"
                  checked={form.dismissible}
                  onChange={(e) => handleChange('dismissible', e.target.checked)}
                />
                Cerrable por usuario
              </label>
            </div>
          )}

          <label className="admin-cms-field">
            <span>Resumen (opcional)</span>
            <input
              className="admin-input"
              value={form.excerpt}
              onChange={(e) => handleChange('excerpt', e.target.value)}
              placeholder="Texto corto para listados"
            />
          </label>

          <label className="admin-cms-field">
            <span>Contenido (Markdown: **negrita**, ## título, - lista)</span>
            <textarea
              className="admin-input admin-cms-textarea"
              rows={10}
              value={form.body}
              onChange={(e) => handleChange('body', e.target.value)}
              required
            />
          </label>

          <div className="admin-cms-schedule">
            <label className="admin-cms-check">
              <input
                type="checkbox"
                checked={scheduleMode}
                onChange={(e) => setScheduleMode(e.target.checked)}
              />
              Programar publicación
            </label>
            {scheduleMode && (
              <input
                type="datetime-local"
                className="admin-input"
                value={form.scheduledPublishAt}
                onChange={(e) => handleChange('scheduledPublishAt', e.target.value)}
              />
            )}
          </div>

          <div className="admin-cms-editor-toolbar">
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar borrador'}
            </button>
            <button type="button" className="admin-btn-secondary" disabled={saving} onClick={handlePublishNow}>
              Publicar ahora
            </button>
            {scheduleMode && (
              <button type="button" className="admin-btn-secondary" disabled={saving} onClick={handleSchedulePublish}>
                Programar
              </button>
            )}
            {!isNew && form.status === 'published' && (
              <button type="button" className="admin-btn-ghost" disabled={saving} onClick={handleUnpublish}>
                Despublicar
              </button>
            )}
            {!isNew && (
              <button type="button" className="admin-btn-danger" disabled={saving} onClick={handleDelete}>
                Eliminar
              </button>
            )}
            <button
              type="button"
              className="admin-btn-ghost admin-cms-preview-toggle"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? 'Ocultar vista previa' : 'Vista previa'}
            </button>
          </div>

          {showPreview && form.body.trim() && (
            <div className="admin-cms-preview">
              <h4>Vista previa</h4>
              <div className={`cms-preview-box cms-preview-${form.type} cms-banner-${form.bannerVariant}`}>
                <strong>{form.title || 'Sin título'}</strong>
                <SimpleMarkdown content={form.body} />
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
