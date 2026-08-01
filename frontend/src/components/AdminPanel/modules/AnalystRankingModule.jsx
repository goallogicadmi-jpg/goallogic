import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminModuleShell from '../AdminModuleShell';
import {
  getAnalystRanking,
  previewRankingCommunityPost,
  publishRankingToCommunity,
  formatPriceCents,
  RANKING_CATEGORIES,
} from '../../../services/analystAdminService';

function AnalystQuickCard({ analyst, onViewProfile, onViewHistory, onClose }) {
  if (!analyst) return null;

  return (
    <aside className="admin-panel-card analyst-ranking-quick-card">
      <button type="button" className="analyst-ranking-quick-card__close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
      <div className="analyst-admin-user-cell">
        {analyst.foto_perfil_url ? (
          <img src={analyst.foto_perfil_url} alt="" className="analyst-admin-avatar analyst-admin-avatar--lg" />
        ) : (
          <span className="analyst-admin-avatar analyst-admin-avatar--lg analyst-admin-avatar--placeholder">
            {(analyst.nombre || '?').charAt(0)}
          </span>
        )}
        <div>
          <h3>
            #{analyst.position} {analyst.nombre}
          </h3>
          <p>
            <code>{analyst.publicId || '—'}</code>
            {analyst.verified ? ' · Verificado ✓' : ''}
          </p>
        </div>
      </div>
      <div className="analyst-ranking-quick-stats">
        <span>ROI <strong>{analyst.roi}%</strong></span>
        <span>Acierto <strong>{analyst.winRate}%</strong></span>
        <span>Racha <strong>{analyst.currentStreak}</strong></span>
        <span>Suscriptores <strong>{analyst.subscribers}</strong></span>
        <span>Ingresos <strong>{formatPriceCents(analyst.revenueCents)}</strong></span>
        <span>Mes <strong>{formatPriceCents(analyst.monthlyRevenueCents)}</strong></span>
      </div>
      <div className="analyst-admin-actions">
        <button type="button" className="admin-btn-primary" onClick={() => onViewProfile(analyst.id)}>
          Ver perfil
        </button>
        <button type="button" className="admin-btn-secondary" onClick={() => onViewHistory(analyst.id)}>
          Ver historial
        </button>
      </div>
    </aside>
  );
}

export default function AnalystRankingModule() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('roi');
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [showPublish, setShowPublish] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState('');

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAnalystRanking(category);
      setRankingData(data);
    } catch (err) {
      setError(err.message || 'Error al cargar ranking');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const openPublishPreview = async () => {
    setShowPublish(true);
    setPreviewLoading(true);
    setPublishSuccess('');
    try {
      const data = await previewRankingCommunityPost(category);
      setPreview(data);
    } catch (err) {
      alert(err.message);
      setShowPublish(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('¿Publicar este ranking en la comunidad como GOAL_LOGIC?')) return;
    setPublishing(true);
    setPublishSuccess('');
    try {
      const result = await publishRankingToCommunity(category);
      setPublishSuccess(result.message || 'Ranking publicado');
      setShowPublish(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setPublishing(false);
    }
  };

  const goToAnalyst = (analystId, tab = 'overview') => {
    navigate('/admin/analistas', { state: { openAnalystId: analystId, openTab: tab } });
  };

  const rankings = rankingData?.rankings || [];

  return (
    <AdminModuleShell
      title="Ranking de Analistas"
      description="Ranking global de analistas deportivos. Solo datos públicos (nombre, publicId, métricas)."
      badge="Ranking"
      actions={
        <>
          <button type="button" className="admin-btn-secondary" onClick={loadRanking}>
            Actualizar
          </button>
          <button type="button" className="admin-btn-primary" onClick={openPublishPreview}>
            Publicar ranking en la Comunidad
          </button>
        </>
      }
    >
      {error ? <div className="admin-error">{error}</div> : null}
      {publishSuccess ? <div className="admin-alert admin-alert-success">{publishSuccess}</div> : null}

      <div className="admin-panel-nav analyst-admin-tabs">
        {RANKING_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`admin-nav-btn${category === cat.id ? ' active' : ''}`}
            onClick={() => {
              setCategory(cat.id);
              setSelected(null);
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <p className="admin-panel-card__hint">
        Categoría activa: <strong>{rankingData?.categoryLabel || '—'}</strong>
        {rankingData?.totalAnalysts != null ? ` · ${rankingData.totalAnalysts} analistas` : ''}
      </p>

      <div className="analyst-ranking-layout">
        <div className="admin-table-container">
          {loading ? (
            <p>Cargando ranking…</p>
          ) : !rankings.length ? (
            <p>No hay analistas activos en el ranking.</p>
          ) : (
            <table className="admin-table analyst-ranking-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Analista</th>
                  <th>publicId</th>
                  <th>ROI</th>
                  <th>Acierto</th>
                  <th>Racha</th>
                  <th>Suscriptores</th>
                  <th>Ingresos</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((row) => (
                  <tr
                    key={row.id}
                    className={selected?.id === row.id ? 'is-selected' : ''}
                    onClick={() => setSelected(row)}
                  >
                    <td>{row.position}</td>
                    <td>
                      <div className="analyst-admin-user-cell">
                        {row.foto_perfil_url ? (
                          <img src={row.foto_perfil_url} alt="" className="analyst-admin-avatar" />
                        ) : (
                          <span className="analyst-admin-avatar analyst-admin-avatar--placeholder">
                            {(row.nombre || '?').charAt(0)}
                          </span>
                        )}
                        <span>
                          {row.nombre}
                          {row.verified ? ' ✓' : ''}
                        </span>
                      </div>
                    </td>
                    <td><code>{row.publicId || '—'}</code></td>
                    <td>{row.roi}%</td>
                    <td>{row.winRate}%</td>
                    <td>{row.currentStreak}</td>
                    <td>{row.subscribers}</td>
                    <td>{formatPriceCents(row.revenueCents)}</td>
                    <td>
                      <div className="analyst-admin-actions" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="admin-btn-secondary" onClick={() => goToAnalyst(row.id)}>
                          Perfil
                        </button>
                        <button type="button" className="admin-btn-secondary" onClick={() => goToAnalyst(row.id, 'history')}>
                          Historial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <AnalystQuickCard
          analyst={selected}
          onClose={() => setSelected(null)}
          onViewProfile={(id) => goToAnalyst(id)}
          onViewHistory={(id) => goToAnalyst(id, 'history')}
        />
      </div>

      {showPublish ? (
        <div className="analyst-admin-modal-backdrop">
          <div className="admin-panel-card analyst-ranking-publish-modal">
            <h3>Vista previa — Publicación en Comunidad</h3>
            <p className="admin-panel-card__hint">
              Se publicará como mensaje oficial de GOAL_LOGIC (Top 10 · {preview?.categoryLabel || category}).
            </p>
            {previewLoading ? (
              <p>Generando vista previa…</p>
            ) : (
              <pre className="analyst-ranking-preview">{preview?.text || ''}</pre>
            )}
            <div className="analyst-admin-actions">
              <button
                type="button"
                className="admin-btn-primary"
                disabled={previewLoading || publishing}
                onClick={handlePublish}
              >
                {publishing ? 'Publicando…' : 'Publicar ahora'}
              </button>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setShowPublish(false)}
                disabled={publishing}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminModuleShell>
  );
}
