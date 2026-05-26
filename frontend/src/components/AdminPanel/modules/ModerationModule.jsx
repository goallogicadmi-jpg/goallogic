import { useState, useCallback } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import AdminModerationList from '../AdminModerationList';
import AdminModerationDetail from '../AdminModerationDetail';
import '../AdminPanel.css';

export default function ModerationModule() {
  const [viewMode, setViewMode] = useState('content');
  const [selectedItem, setSelectedItem] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedKey = selectedItem
    ? `${selectedItem.contentType}:${selectedItem.id}`
    : null;

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleActionDone = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <AdminModuleShell
      title="Moderación de comunidad"
      description="Publicaciones, comentarios, reportes y sanciones."
      badge={null}
      actions={
        <div className="admin-moderation-tabs">
          <button
            type="button"
            className={viewMode === 'content' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => {
              setViewMode('content');
              setSelectedItem(null);
            }}
          >
            Contenido
          </button>
          <button
            type="button"
            className={viewMode === 'reports' ? 'admin-tab active' : 'admin-tab'}
            onClick={() => {
              setViewMode('reports');
              setSelectedItem(null);
            }}
          >
            Reportes
          </button>
        </div>
      }
    >
      <div className="admin-panel-grid admin-moderation-module-grid">
        <div className="admin-panel-col-1">
          <AdminModerationList
            viewMode={viewMode}
            onSelectItem={handleSelectItem}
            selectedKey={selectedKey}
            refreshKey={refreshKey}
          />
        </div>
        <div className="admin-panel-col-2">
          <AdminModerationDetail
            item={selectedItem}
            onClose={selectedItem ? () => setSelectedItem(null) : undefined}
            onActionDone={handleActionDone}
          />
        </div>
      </div>
    </AdminModuleShell>
  );
}
