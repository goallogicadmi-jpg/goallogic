import { useEffect, useState } from 'react';
import { getAnalystAuditLogs, formatDate } from '../../../../services/analystAdminService';

export default function AnalystAdminAudit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getAnalystAuditLogs();
        if (!cancelled) setLogs(data);
      } catch (err) {
        if (!cancelled) alert(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p>Cargando auditoría…</p>;

  return (
    <div className="admin-table-container">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Analista</th>
            <th>Actor</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log._id}>
              <td>{formatDate(log.createdAt)}</td>
              <td><code>{log.action}</code></td>
              <td>{log.analystId?.nombre || '—'}</td>
              <td>{log.actorId?.nombre || log.actorId?.email || '—'}</td>
              <td><pre className="analyst-admin-audit-payload">{JSON.stringify(log.details || {}, null, 0)}</pre></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!logs.length ? <p>Sin registros de auditoría todavía.</p> : null}
    </div>
  );
}
