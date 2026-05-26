import { useState, useEffect, useCallback, useMemo } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import {
  getAdminSettings,
  getAdminSettingsHistory,
  previewAdminSettings,
  saveAdminSettings,
} from '../../../services/settingsAdminService';
import '../AdminPanel.css';

const CATEGORY_ORDER = ['general', 'predictions', 'community', 'leagues', 'simulator'];

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function valuesEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function SettingField({ item, value, onChange, dirty }) {
  const id = `setting-${item.key}`;

  if (item.type === 'boolean') {
    return (
      <label className={`admin-settings-field admin-settings-field--toggle ${dirty ? 'is-dirty' : ''}`}>
        <input
          id={id}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(item.key, e.target.checked)}
        />
        <span className="admin-settings-field__label">{item.label}</span>
        {item.description && (
          <span className="admin-settings-field__hint">{item.description}</span>
        )}
      </label>
    );
  }

  if (item.type === 'enum') {
    return (
      <div className={`admin-settings-field ${dirty ? 'is-dirty' : ''}`}>
        <label htmlFor={id}>{item.label}</label>
        {item.description && (
          <span className="admin-settings-field__hint">{item.description}</span>
        )}
        <select
          id={id}
          value={value ?? ''}
          onChange={(e) => onChange(item.key, e.target.value)}
        >
          {(item.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const inputType = item.type === 'number' ? 'number' : 'text';
  return (
    <div className={`admin-settings-field ${dirty ? 'is-dirty' : ''}`}>
      <label htmlFor={id}>{item.label}</label>
      {item.description && (
        <span className="admin-settings-field__hint">{item.description}</span>
      )}
      <input
        id={id}
        type={inputType}
        value={value ?? ''}
        min={item.min}
        max={item.max}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(item.key, item.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw);
        }}
      />
      {item.min != null && item.max != null && (
        <span className="admin-settings-field__range">
          {item.min} – {item.max}
        </span>
      )}
    </div>
  );
}

function PreviewModal({ preview, onClose, onConfirm }) {
  if (!preview) return null;
  const { changes = [], hasChanges, hasErrors } = preview;

  return (
    <div className="admin-settings-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-settings-modal">
        <h3>Vista previa de cambios</h3>
        {hasErrors && (
          <p className="admin-settings-error">Hay valores inválidos. Corrígelos antes de guardar.</p>
        )}
        {!hasChanges && !hasErrors && (
          <p className="admin-settings-muted">No hay cambios respecto a los valores actuales.</p>
        )}
        <ul className="admin-settings-preview-list">
          {changes.map((c) => (
            <li
              key={c.key}
              className={
                !c.valid ? 'is-error' : c.changed ? 'is-changed' : 'is-unchanged'
              }
            >
              <strong>{c.label || c.key}</strong>
              {!c.valid ? (
                <span className="admin-settings-error">{c.error}</span>
              ) : c.changed ? (
                <span>
                  {String(c.current)} → <em>{String(c.next)}</em>
                </span>
              ) : (
                <span className="admin-settings-muted">Sin cambio</span>
              )}
            </li>
          ))}
        </ul>
        <div className="admin-settings-modal-actions">
          <button type="button" className="admin-btn-secondary" onClick={onClose}>
            Cerrar
          </button>
          {hasChanges && !hasErrors && (
            <button type="button" className="admin-btn-primary" onClick={onConfirm}>
              Confirmar y guardar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsModule() {
  const [categories, setCategories] = useState([]);
  const [server, setServer] = useState(null);
  const [draft, setDraft] = useState({});
  const [baseline, setBaseline] = useState({});
  const [activeCategory, setActiveCategory] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [saveNote, setSaveNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminSettings();
      const cats = (data.categories || []).sort(
        (a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id)
      );
      const base = {};
      cats.forEach((cat) => {
        (cat.items || []).forEach((item) => {
          base[item.key] = item.value;
        });
      });
      setCategories(cats);
      setServer(data.server || null);
      setBaseline(base);
      setDraft({ ...base });
    } catch (e) {
      setError(e.message || 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pendingUpdates = useMemo(() => {
    return Object.keys(draft).filter((key) => !valuesEqual(draft[key], baseline[key]));
  }, [draft, baseline]);

  const handleChange = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSuccess('');
  };

  const handleDiscard = () => {
    setDraft({ ...baseline });
    setSuccess('');
    setPreview(null);
  };

  const buildUpdatesPayload = () =>
    pendingUpdates.map((key) => ({ key, value: draft[key] }));

  const handlePreview = async () => {
    if (pendingUpdates.length === 0) {
      setError('No hay cambios pendientes');
      return;
    }
    setError('');
    try {
      const data = await previewAdminSettings(buildUpdatesPayload());
      setPreview(data);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleSave = async () => {
    if (pendingUpdates.length === 0) return;
    const ok = window.confirm(
      `¿Guardar ${pendingUpdates.length} cambio(s) en la configuración global?`
    );
    if (!ok) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const result = await saveAdminSettings(buildUpdatesPayload(), saveNote.trim());
      const base = {};
      (result.categories || categories).forEach((cat) => {
        (cat.items || []).forEach((item) => {
          base[item.key] = item.value;
        });
      });
      if (Object.keys(base).length) {
        setBaseline(base);
        setDraft({ ...base });
        setCategories(result.categories || categories);
      } else {
        await load();
      }
      setPreview(null);
      setSaveNote('');
      setSuccess(`Guardado (${result.applied?.length ?? pendingUpdates.length} ajustes)`);
    } catch (e) {
      if (e.preview) setPreview(e.preview);
      setError(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await getAdminSettingsHistory({ limit: 40 });
      setHistory(data.items || []);
      setShowHistory(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <AdminModuleShell
      title="Configuración global"
      description="Parámetros operativos del sistema. Solo admin principal."
      badge="Solo admin principal"
    >
      <div className="admin-settings-module">
        {server && (
          <div className="admin-settings-server-card">
            <h3>Estado del servidor</h3>
            <div className="admin-settings-server-grid">
              <span>
                <strong>Entorno</strong> {server.environment}
              </span>
              <span>
                <strong>Versión</strong> {server.appVersion}
              </span>
              <span>
                <strong>Uptime</strong> {formatUptime(server.uptimeSeconds || 0)}
              </span>
              <span>
                <strong>MongoDB</strong>{' '}
                {server.mongoConnected ? 'Conectado' : 'Desconectado'}
              </span>
              <span>
                <strong>Node</strong> {server.nodeVersion}
              </span>
              <span>
                <strong>Memoria</strong> {server.memoryMb} MB
              </span>
              {server.deployRef && (
                <span className="admin-settings-deploy-ref">
                  <strong>Deploy</strong> {String(server.deployRef).slice(0, 12)}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="admin-settings-toolbar">
          <nav className="admin-settings-tabs" aria-label="Categorías">
            {categories.map((cat) => {
              const catPending = (cat.items || []).filter(
                (item) => !valuesEqual(draft[item.key], baseline[item.key])
              ).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={activeCategory === cat.id ? 'is-active' : ''}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                  {catPending > 0 && (
                    <span className="admin-settings-tab-badge">{catPending}</span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="admin-settings-actions">
            {pendingUpdates.length > 0 && (
              <span className="admin-settings-pending">
                {pendingUpdates.length} cambio(s) pendiente(s)
              </span>
            )}
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={pendingUpdates.length === 0}
              onClick={handleDiscard}
            >
              Descartar
            </button>
            <button
              type="button"
              className="admin-btn-secondary"
              disabled={pendingUpdates.length === 0}
              onClick={handlePreview}
            >
              Vista previa
            </button>
            <button
              type="button"
              className="admin-btn-primary"
              disabled={pendingUpdates.length === 0 || saving}
              onClick={handleSave}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        {error && <p className="admin-settings-error">{error}</p>}
        {success && <p className="admin-settings-success">{success}</p>}

        {loading ? (
          <p className="admin-settings-muted">Cargando configuración…</p>
        ) : (
          <div className="admin-settings-body">
            <div className="admin-settings-form-card">
              <h3>{activeCat?.label || 'Configuración'}</h3>
              {pendingUpdates.length > 0 && (
                <label className="admin-settings-note">
                  Nota de auditoría (opcional)
                  <input
                    type="text"
                    value={saveNote}
                    maxLength={200}
                    placeholder="Motivo del cambio…"
                    onChange={(e) => setSaveNote(e.target.value)}
                  />
                </label>
              )}
              <div className="admin-settings-fields">
                {(activeCat?.items || []).map((item) => (
                  <SettingField
                    key={item.key}
                    item={item}
                    value={draft[item.key]}
                    dirty={!valuesEqual(draft[item.key], baseline[item.key])}
                    onChange={handleChange}
                  />
                ))}
              </div>
            </div>

            <aside className="admin-settings-sidebar">
              <button
                type="button"
                className="admin-btn-secondary admin-settings-history-toggle"
                onClick={showHistory ? () => setShowHistory(false) : loadHistory}
              >
                {showHistory ? 'Ocultar historial' : 'Auditoría de cambios'}
              </button>
              {showHistory && (
                <ul className="admin-settings-history">
                  {history.length === 0 ? (
                    <li className="admin-settings-muted">Sin revisiones aún</li>
                  ) : (
                    history.map((row) => (
                      <li key={row._id}>
                        <span className="admin-settings-history-key">{row.key}</span>
                        <span className="admin-settings-history-values">
                          {JSON.stringify(row.previousValue)} →{' '}
                          {JSON.stringify(row.newValue)}
                        </span>
                        <span className="admin-settings-history-meta">
                          {row.actorEmail || 'admin'} ·{' '}
                          {row.createdAt
                            ? new Date(row.createdAt).toLocaleString()
                            : ''}
                        </span>
                        {row.note && (
                          <span className="admin-settings-history-note">{row.note}</span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </aside>
          </div>
        )}
      </div>

      <PreviewModal
        preview={preview}
        onClose={() => setPreview(null)}
        onConfirm={() => {
          setPreview(null);
          handleSave();
        }}
      />
    </AdminModuleShell>
  );
}
