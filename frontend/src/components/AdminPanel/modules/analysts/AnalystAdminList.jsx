import { useState } from 'react';
import {
  analystStatusLabel,
  formatPriceCents,
  updateAnalystPrice,
} from '../../../../services/analystAdminService';

export default function AnalystAdminList({
  rows,
  loading,
  onRefresh,
  onViewProfile,
  onEdit,
  onToggleSuspend,
}) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);

  const getDraft = (row) =>
    drafts[row.id] || {
      stripePriceId: row.analystStripePriceId || '',
      priceCents: row.analystSubscriptionPriceCents ?? '',
    };

  const handleSavePrice = async (row) => {
    const draft = getDraft(row);
    setSavingId(row.id);
    try {
      await updateAnalystPrice(row.id, {
        stripePriceId: draft.stripePriceId,
        priceCents: draft.priceCents === '' ? null : Number(draft.priceCents),
      });
      await onRefresh();
    } catch (err) {
      alert(err.message || 'No se pudo guardar el precio');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <p>Cargando analistas…</p>;
  if (!rows.length) return <p>No hay analistas registrados.</p>;

  return (
    <div className="admin-table-container">
      <table className="admin-table analyst-admin-table">
        <thead>
          <tr>
            <th>Analista</th>
            <th>publicId</th>
            <th>Email</th>
            <th>Estado</th>
            <th>Verificado</th>
            <th>Suscriptores</th>
            <th>Precio</th>
            <th>Stripe Price ID</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const draft = getDraft(row);
            const suspended = row.analystStatus === 'suspended';
            return (
              <tr key={row.id} className={suspended ? 'is-suspended' : ''}>
                <td>
                  <div className="analyst-admin-user-cell">
                    {row.foto_perfil_url ? (
                      <img src={row.foto_perfil_url} alt="" className="analyst-admin-avatar" />
                    ) : (
                      <span className="analyst-admin-avatar analyst-admin-avatar--placeholder">
                        {(row.nombre || '?').charAt(0)}
                      </span>
                    )}
                    <strong>{row.nombre}</strong>
                  </div>
                </td>
                <td><code>{row.publicId || '—'}</code></td>
                <td>{row.email}</td>
                <td>
                  <span className={`analyst-admin-status analyst-admin-status--${row.analystStatus}`}>
                    {analystStatusLabel(row.analystStatus)}
                  </span>
                </td>
                <td>{row.verified ? 'Sí' : 'No'}</td>
                <td>{row.subscribers ?? 0}</td>
                <td>
                  <input
                    className="admin-input"
                    type="number"
                    min="0"
                    value={draft.priceCents}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...draft, priceCents: e.target.value },
                      }))
                    }
                  />
                  <small>{formatPriceCents(draft.priceCents)}/mes</small>
                </td>
                <td>
                  <input
                    className="admin-input"
                    value={draft.stripePriceId}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [row.id]: { ...draft, stripePriceId: e.target.value },
                      }))
                    }
                    placeholder="price_..."
                  />
                </td>
                <td>
                  <div className="analyst-admin-actions">
                    <button type="button" className="admin-btn-secondary" onClick={() => onViewProfile(row.id)}>
                      Ver perfil
                    </button>
                    <button type="button" className="admin-btn-secondary" onClick={() => onEdit(row.id)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="admin-btn-primary"
                      onClick={() => handleSavePrice(row)}
                      disabled={savingId === row.id}
                    >
                      {savingId === row.id ? '…' : 'Precio'}
                    </button>
                    <button
                      type="button"
                      className={suspended ? 'admin-btn-primary' : 'admin-btn-danger'}
                      onClick={() => onToggleSuspend(row)}
                    >
                      {suspended ? 'Reactivar' : 'Suspender'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
