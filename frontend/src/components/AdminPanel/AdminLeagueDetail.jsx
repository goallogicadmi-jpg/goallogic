import { useState, useEffect, useCallback } from 'react';
import {
  getAdminLeague,
  updateAdminLeague,
  toggleLeagueActive,
  syncLeague,
  getLeagueSyncHistory,
} from '../../services/leaguesAdminService';
import { formatAdminDate } from './adminUserUtils';
import './AdminPanel.css';

export default function AdminLeagueDetail({ leagueItem, onClose, onUpdated }) {
  const [detail, setDetail] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nameOverride: '',
    logoOverride: '',
    country: '',
    seasonOverride: '',
    priority: 0,
  });

  const load = useCallback(async () => {
    if (!leagueItem?.leagueId) {
      setDetail(null);
      return;
    }
    try {
      setLoading(true);
      const [data, hist] = await Promise.all([
        getAdminLeague(leagueItem.leagueId),
        getLeagueSyncHistory(leagueItem.leagueId).catch(() => ({ items: [] })),
      ]);
      setDetail(data);
      setHistory(hist.items || []);
      setForm({
        nameOverride: data.nameOverride || '',
        logoOverride: data.logoOverride || '',
        country: data.country || '',
        seasonOverride: data.seasonOverride ?? '',
        priority: data.priority ?? 0,
      });
    } catch (err) {
      alert(err.message || 'Error al cargar');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [leagueItem?.leagueId]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (fn, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      setSaving(true);
      await fn();
      await load();
      onUpdated?.();
    } catch (err) {
      alert(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (!leagueItem) {
    return (
      <div className="admin-league-detail admin-league-detail-empty">
        <p>Selecciona una liga para ver detalle, editar logos y sincronizar datos.</p>
      </div>
    );
  }

  const displayLogo = form.logoOverride || detail?.logo;

  return (
    <div className="admin-league-detail">
      <div className="admin-league-detail-header">
        <h3>{detail?.name || leagueItem.name}</h3>
        {onClose && (
          <button type="button" className="admin-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        )}
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
        </div>
      ) : (
        detail && (
          <>
            <div className="admin-league-preview">
              {displayLogo && (
                <img
                  src={displayLogo}
                  alt=""
                  className="admin-league-preview-logo"
                  onError={(e) => {
                    e.target.src = `https://media.api-sports.io/football/leagues/${detail.leagueId}.png`;
                  }}
                />
              )}
              <div>
                <p>
                  <strong>ID API:</strong> {detail.leagueId}
                </p>
                <p>
                  <strong>Dominio:</strong> {detail.domain} · {detail.type}
                </p>
                <p>
                  <strong>Estado:</strong> {detail.active ? 'Activa' : 'Inactiva'}
                </p>
                {detail.health?.seasonUsed && (
                  <p>
                    <strong>Temporada en API:</strong> {detail.health.seasonUsed}
                  </p>
                )}
              </div>
            </div>

            {detail.lastSyncError && (
              <div className="admin-league-sync-error">
                <strong>Último error:</strong> {detail.lastSyncError}
              </div>
            )}

            {detail.health && (
              <div className="admin-league-health-grid">
                <span>Standings: {detail.health.standingsOk ? '✓' : '✗'}</span>
                <span>Equipos: {detail.health.teamsCount ?? 0}</span>
                <span>Fixtures: {detail.health.fixturesCount ?? 0}</span>
              </div>
            )}

            <form
              className="admin-cms-form"
              onSubmit={(e) => {
                e.preventDefault();
                runAction(
                  () =>
                    updateAdminLeague(detail.leagueId, {
                      nameOverride: form.nameOverride || null,
                      logoOverride: form.logoOverride || null,
                      country: form.country,
                      seasonOverride:
                        form.seasonOverride === '' ? null : Number(form.seasonOverride),
                      priority: Number(form.priority),
                    }),
                  null
                );
              }}
            >
              <label className="admin-cms-field">
                <span>Nombre visible (override)</span>
                <input
                  className="admin-input"
                  value={form.nameOverride}
                  onChange={(e) => setForm((f) => ({ ...f, nameOverride: e.target.value }))}
                  placeholder={detail.name}
                />
              </label>
              <label className="admin-cms-field">
                <span>URL logo (override)</span>
                <input
                  className="admin-input"
                  value={form.logoOverride}
                  onChange={(e) => setForm((f) => ({ ...f, logoOverride: e.target.value }))}
                  placeholder={detail.logo}
                />
              </label>
              <label className="admin-cms-field">
                <span>País</span>
                <input
                  className="admin-input"
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                />
              </label>
              <label className="admin-cms-field">
                <span>Temporada forzada (ej. 2025)</span>
                <input
                  type="number"
                  className="admin-input admin-input-narrow"
                  value={form.seasonOverride}
                  onChange={(e) => setForm((f) => ({ ...f, seasonOverride: e.target.value }))}
                />
              </label>
              <label className="admin-cms-field">
                <span>Prioridad</span>
                <input
                  type="number"
                  className="admin-input admin-input-narrow"
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                />
              </label>
              <button type="submit" className="admin-btn-primary" disabled={saving}>
                Guardar cambios
              </button>
            </form>

            <div className="admin-league-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={saving}
                onClick={() =>
                  runAction(
                    () => syncLeague(detail.leagueId),
                    '¿Forzar sincronización con API-Football?'
                  )
                }
              >
                Forzar sync
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                disabled={saving}
                onClick={() =>
                  runAction(
                    () => toggleLeagueActive(detail.leagueId),
                    detail.active ? '¿Desactivar esta liga?' : '¿Activar esta liga?'
                  )
                }
              >
                {detail.active ? 'Desactivar' : 'Activar'}
              </button>
            </div>

            {history.length > 0 && (
              <div className="admin-league-history">
                <h4>Historial de sincronizaciones</h4>
                <ul>
                  {history.slice(0, 8).map((h, i) => (
                    <li key={i}>
                      <span className={h.status === 'success' ? 'log-level-info' : 'log-level-error'}>
                        {h.status}
                      </span>
                      {' · '}
                      {formatAdminDate(h.at, true)}
                      {h.durationMs != null && ` · ${h.durationMs}ms`}
                      {h.seasonUsed && ` · temp. ${h.seasonUsed}`}
                      {h.error && <div className="admin-meta-small">{h.error}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
