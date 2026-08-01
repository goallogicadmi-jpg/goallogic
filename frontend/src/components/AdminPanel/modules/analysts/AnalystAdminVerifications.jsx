import { useCallback, useEffect, useState } from 'react';
import {
  listAnalystVerifications,
  approveVerification,
  rejectVerification,
  formatDate,
} from '../../../../services/analystAdminService';

export default function AnalystAdminVerifications({ onSelectUser }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAnalystVerifications(filter);
      setRows(data);
      setSelected(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id) => {
    setBusy(true);
    try {
      await approveVerification(id, note);
      setNote('');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (id) => {
    const reason = note || window.prompt('Motivo del rechazo:');
    if (!reason) return;
    setBusy(true);
    try {
      await rejectVerification(id, reason);
      setNote('');
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="analyst-admin-verifications">
      <div className="admin-panel-nav analyst-admin-tabs">
        {['pending', 'approved', 'rejected', 'all'].map((status) => (
          <button
            key={status}
            type="button"
            className={`admin-nav-btn${filter === status ? ' active' : ''}`}
            onClick={() => setFilter(status)}
          >
            {status === 'pending' ? 'Pendientes' : status === 'approved' ? 'Aprobadas' : status === 'rejected' ? 'Rechazadas' : 'Todas'}
          </button>
        ))}
      </div>

      {loading ? <p>Cargando verificaciones…</p> : null}

      <div className="analyst-admin-verifications-grid">
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id}>
                  <td>{row.userId?.nombre || '—'}</td>
                  <td>{row.userId?.email || '—'}</td>
                  <td>{row.status}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td>
                    <button type="button" className="admin-btn-secondary" onClick={() => setSelected(row)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selected ? (
          <aside className="admin-panel-card analyst-admin-verification-detail">
            <h3>Solicitud de {selected.userId?.nombre}</h3>
            <p>publicId: <code>{selected.userId?.publicId || '—'}</code></p>
            <p>Notas: {selected.notes || '—'}</p>

            <h4>Documentos</h4>
            {(selected.documents || []).length ? (
              <ul>
                {selected.documents.map((doc) => (
                  <li key={doc._id || doc.url}>
                    <a href={doc.url} target="_blank" rel="noreferrer">{doc.name || doc.url}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>Sin documentos adjuntos.</p>
            )}

            <h4>Historial</h4>
            <ul className="analyst-admin-history-list">
              {(selected.history || []).map((h) => (
                <li key={h._id || `${h.action}-${h.at}`}>
                  <strong>{h.action}</strong> — {h.note || '—'} — {formatDate(h.at)}
                </li>
              ))}
            </ul>

            {selected.status === 'pending' ? (
              <>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nota para aprobación/rechazo"
                />
                <div className="analyst-admin-actions">
                  <button
                    type="button"
                    className="admin-btn-primary"
                    disabled={busy}
                    onClick={() => handleApprove(selected._id)}
                  >
                    Aprobar y activar insignia
                  </button>
                  <button
                    type="button"
                    className="admin-btn-danger"
                    disabled={busy}
                    onClick={() => handleReject(selected._id)}
                  >
                    Rechazar
                  </button>
                </div>
              </>
            ) : null}

            {selected.userId?._id ? (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => onSelectUser?.(selected.userId._id)}
              >
                Ver perfil analista
              </button>
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
