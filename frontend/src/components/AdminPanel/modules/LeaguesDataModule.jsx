import { useState, useCallback } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import AdminLeagueList from '../AdminLeagueList';
import AdminLeagueDetail from '../AdminLeagueDetail';
import { syncAllLeagues } from '../../../services/leaguesAdminService';
import '../AdminPanel.css';

export default function LeaguesDataModule() {
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  const handleUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleSyncAll = async () => {
    if (!window.confirm('¿Sincronizar hasta 15 ligas activas? Puede tardar varios minutos.')) return;
    try {
      setSyncAllLoading(true);
      const result = await syncAllLeagues(true);
      const ok = result.results?.filter((r) => r.ok).length ?? 0;
      alert(`Sync completado: ${ok}/${result.processed} exitosas`);
      handleUpdated();
    } catch (err) {
      alert(err.message || 'Error en sync masivo');
    } finally {
      setSyncAllLoading(false);
    }
  };

  return (
    <AdminModuleShell
      title="Ligas y datos deportivos"
      description="Catálogo, temporadas, logos y sincronización API-Football."
      badge={null}
    >
      <div className="admin-panel-grid admin-league-module-grid">
        <div className="admin-panel-col-1">
          <AdminLeagueList
            onSelectLeague={setSelectedLeague}
            selectedId={selectedLeague?.id}
            refreshKey={refreshKey}
            onSyncAll={handleSyncAll}
            syncAllLoading={syncAllLoading}
          />
        </div>
        <div className="admin-panel-col-2">
          <AdminLeagueDetail
            leagueItem={selectedLeague}
            onClose={selectedLeague ? () => setSelectedLeague(null) : undefined}
            onUpdated={handleUpdated}
          />
        </div>
      </div>
    </AdminModuleShell>
  );
}
