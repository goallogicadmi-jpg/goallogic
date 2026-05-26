import { useState, useEffect, useCallback } from 'react';
import { getUsers } from '../../services/adminService';
import {
  getMessageTemplates,
  previewSegment,
  previewMessage,
  createMessageCampaign,
  TEMPLATE_VARIABLES_HELP,
} from '../../services/messagesAdminService';
import './AdminPanel.css';

const DEFAULT_SEGMENT = {
  premium: 'all',
  pais: '',
  activity: 'all',
  inactiveDays: 30,
  userIds: [],
};

const STATUS_LABELS = {
  pending: 'Pendiente',
  scheduled: 'Programado',
  processing: 'Enviando',
  sent: 'Enviado',
  partial: 'Parcial',
  failed: 'Error',
  cancelled: 'Cancelado',
};

export default function AdminMessagesBulk() {
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [segment, setSegment] = useState(DEFAULT_SEGMENT);
  const [segmentCount, setSegmentCount] = useState(null);
  const [sendMode, setSendMode] = useState('now');
  const [scheduledAt, setScheduledAt] = useState('');
  const [note, setNote] = useState('');
  const [batchSize, setBatchSize] = useState(50);

  const [users, setUsers] = useState([]);
  const [useManualIds, setUseManualIds] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  const [preview, setPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [countLoading, setCountLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTemplates = useCallback(async () => {
    try {
      const data = await getMessageTemplates();
      setTemplates(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
    (async () => {
      try {
        const data = await getUsers({ role: 'usuario', limit: 500 });
        setUsers(Array.isArray(data) ? data : []);
      } catch (_) {
        /* ignore */
      }
    })();
  }, [loadTemplates]);

  const effectiveSegment = useCallback(() => {
    if (useManualIds && selectedUserIds.length > 0) {
      return { ...DEFAULT_SEGMENT, userIds: selectedUserIds };
    }
    return {
      ...segment,
      pais: segment.pais?.trim() || null,
      userIds: [],
    };
  }, [segment, useManualIds, selectedUserIds]);

  const refreshSegmentCount = async () => {
    setCountLoading(true);
    setError('');
    try {
      const data = await previewSegment(effectiveSegment());
      setSegmentCount(data.count);
    } catch (e) {
      setSegmentCount(null);
      setError(e.message);
    } finally {
      setCountLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(refreshSegmentCount, 400);
    return () => clearTimeout(t);
  }, [segment.premium, segment.pais, segment.activity, segment.inactiveDays, useManualIds, selectedUserIds]);

  const handleTemplateChange = (id) => {
    setTemplateId(id);
    const tpl = templates.find((t) => t.id === id);
    if (tpl) {
      setTitulo(tpl.titulo);
      setContenido(tpl.contenido);
    }
  };

  const handlePreview = async () => {
    if (!titulo.trim() || !contenido.trim()) {
      setError('Completa título y contenido');
      return;
    }
    setError('');
    try {
      const data = await previewMessage({ titulo, contenido });
      setPreview(data);
      setShowPreviewModal(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!titulo.trim() || !contenido.trim()) {
      setError('Completa título y contenido');
      return;
    }
    if (segmentCount === 0) {
      setError('El segmento no tiene destinatarios');
      return;
    }

    const confirmMsg =
      sendMode === 'scheduled'
        ? `¿Programar envío a ${segmentCount} usuario(s)?`
        : `¿Enviar ahora a ${segmentCount} usuario(s)?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await createMessageCampaign({
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        segment: effectiveSegment(),
        sendMode,
        scheduledAt: sendMode === 'scheduled' && scheduledAt
          ? new Date(scheduledAt).toISOString()
          : null,
        templateId: templateId || null,
        batchSize,
        note,
      });
      setSuccess(res.message || 'Campaña creada');
      setTitulo('');
      setContenido('');
      setTemplateId('');
      setNote('');
      setScheduledAt('');
      setSelectedUserIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="admin-messages-bulk">
      {success && (
        <div className="admin-success">
          <span>✓</span> {success}
        </div>
      )}
      {error && (
        <div className="admin-error">
          <span>⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form admin-messages-bulk-form">
        <div className="admin-messages-bulk-grid">
          <section className="admin-module-card">
            <h3>Segmentación</h3>
            <label className="admin-settings-field">
              <input
                type="checkbox"
                checked={useManualIds}
                onChange={(e) => setUseManualIds(e.target.checked)}
              />
              Selección manual de usuarios
            </label>

            {!useManualIds ? (
              <>
                <div className="admin-form-group">
                  <label>Premium</label>
                  <select
                    value={segment.premium}
                    onChange={(e) => setSegment((s) => ({ ...s, premium: e.target.value }))}
                  >
                    <option value="all">Todos</option>
                    <option value="premium">Solo premium</option>
                    <option value="free">Solo free</option>
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>País (opcional)</label>
                  <input
                    type="text"
                    value={segment.pais}
                    placeholder="Ej: España, Mexico"
                    onChange={(e) => setSegment((s) => ({ ...s, pais: e.target.value }))}
                    className="admin-input"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Actividad</label>
                  <select
                    value={segment.activity}
                    onChange={(e) => setSegment((s) => ({ ...s, activity: e.target.value }))}
                  >
                    <option value="all">Todos</option>
                    <option value="active">Activos recientes</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
                {segment.activity !== 'all' && (
                  <div className="admin-form-group">
                    <label>Días sin actividad</label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={segment.inactiveDays}
                      onChange={(e) =>
                        setSegment((s) => ({
                          ...s,
                          inactiveDays: Number(e.target.value) || 30,
                        }))
                      }
                      className="admin-input"
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="admin-users-selector admin-users-selector--compact">
                {users.slice(0, 100).map((u) => (
                  <label key={u._id} className="admin-user-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.includes(u._id)}
                      onChange={() => toggleUser(u._id)}
                    />
                    <span>
                      {u.nombre} ({u.email})
                    </span>
                  </label>
                ))}
                {users.length > 100 && (
                  <p className="admin-hint">Mostrando los primeros 100 usuarios</p>
                )}
              </div>
            )}

            <p className="admin-messages-segment-count">
              {countLoading
                ? 'Calculando destinatarios…'
                : segmentCount != null
                  ? `${segmentCount} destinatario(s)`
                  : '—'}
            </p>
          </section>

          <section className="admin-module-card">
            <h3>Mensaje</h3>
            <div className="admin-form-group">
              <label>Plantilla</label>
              <select value={templateId} onChange={(e) => handleTemplateChange(e.target.value)}>
                <option value="">— Sin plantilla —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <small className="admin-hint">Variables: {TEMPLATE_VARIABLES_HELP}</small>
            </div>
            <div className="admin-form-group">
              <label>Título *</label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={200}
                className="admin-input"
                required
              />
            </div>
            <div className="admin-form-group">
              <label>Contenido *</label>
              <textarea
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                maxLength={5000}
                rows={8}
                className="admin-textarea"
                required
              />
            </div>
          </section>

          <section className="admin-module-card">
            <h3>Programación</h3>
            <div className="admin-form-group">
              <label>
                <input
                  type="radio"
                  name="sendMode"
                  checked={sendMode === 'now'}
                  onChange={() => setSendMode('now')}
                />
                Enviar ahora
              </label>
            </div>
            <div className="admin-form-group">
              <label>
                <input
                  type="radio"
                  name="sendMode"
                  checked={sendMode === 'scheduled'}
                  onChange={() => setSendMode('scheduled')}
                />
                Programar envío
              </label>
            </div>
            {sendMode === 'scheduled' && (
              <div className="admin-form-group">
                <label>Fecha y hora</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="admin-input"
                  required={sendMode === 'scheduled'}
                />
              </div>
            )}
            <div className="admin-form-group">
              <label>Tamaño de lote (anti-picos)</label>
              <input
                type="number"
                min={10}
                max={200}
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value) || 50)}
                className="admin-input"
              />
            </div>
            <div className="admin-form-group">
              <label>Nota de auditoría</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                className="admin-input"
                placeholder="Opcional"
              />
            </div>
          </section>
        </div>

        <div className="admin-form-actions">
          <button type="button" className="admin-btn-secondary" onClick={handlePreview}>
            Vista previa
          </button>
          <button
            type="submit"
            className="admin-btn-primary"
            disabled={loading || segmentCount === 0}
          >
            {loading
              ? 'Procesando…'
              : sendMode === 'scheduled'
                ? 'Programar campaña'
                : 'Enviar campaña'}
          </button>
        </div>
      </form>

      {showPreviewModal && preview && (
        <div
          className="admin-settings-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="admin-settings-modal admin-messages-preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Vista previa</h3>
            <p className="admin-hint">
              Muestra de usuario: {preview.sampleUser?.nombre} ({preview.sampleUser?.email})
            </p>
            <div className="admin-messages-preview-box">
              <strong>{preview.titulo}</strong>
              <pre>{preview.contenido}</pre>
            </div>
            <div className="admin-settings-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowPreviewModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { STATUS_LABELS };
