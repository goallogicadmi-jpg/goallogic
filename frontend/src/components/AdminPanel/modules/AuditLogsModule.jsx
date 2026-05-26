import { useState, useCallback } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import AdminAuditLogList from '../AdminAuditLogList';
import AdminAuditLogDetail from '../AdminAuditLogDetail';
import {
  exportAuditLogsCsv,
  importWinstonLogs,
} from '../../../services/auditLogsAdminService';
import '../AdminPanel.css';

export default function AuditLogsModule() {
  const [selectedLog, setSelectedLog] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleExport = useCallback(async () => {
    try {
      const blob = await exportAuditLogsCsv({ last24h: '' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Error al exportar');
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (!window.confirm('¿Importar líneas recientes desde logs/app-*.log del servidor?')) return;
    try {
      const result = await importWinstonLogs(500);
      alert(`Importados ${result.imported ?? 0} eventos`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert(err.message || 'Error al importar');
    }
  }, []);

  return (
    <AdminModuleShell
      title="Auditoría del sistema"
      description="Logs centralizados: webhook, auth, premium, moderación y errores."
      badge={null}
    >
      <div className="admin-panel-grid admin-audit-module-grid">
        <div className="admin-panel-col-1">
          <AdminAuditLogList
            onSelectLog={setSelectedLog}
            selectedId={selectedLog?.id}
            refreshKey={refreshKey}
            onExport={handleExport}
            onImport={handleImport}
          />
        </div>
        <div className="admin-panel-col-2">
          <AdminAuditLogDetail
            logItem={selectedLog}
            onClose={selectedLog ? () => setSelectedLog(null) : undefined}
          />
        </div>
      </div>
    </AdminModuleShell>
  );
}
