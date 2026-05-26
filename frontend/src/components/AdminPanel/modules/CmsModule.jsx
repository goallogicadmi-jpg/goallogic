import { useState, useCallback } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import AdminCmsList from '../AdminCmsList';
import AdminCmsEditor from '../AdminCmsEditor';
import '../AdminPanel.css';

export default function CmsModule() {
  const [selectedId, setSelectedId] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectItem = (item) => {
    setSelectedId(item.id);
    setIsNew(false);
  };

  const handleNewItem = () => {
    setSelectedId(null);
    setIsNew(true);
  };

  const handleSaved = useCallback((saved) => {
    setRefreshKey((k) => k + 1);
    if (saved?.id) {
      setSelectedId(saved.id);
      setIsNew(false);
    }
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedId(null);
    setIsNew(false);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClose = () => {
    setSelectedId(null);
    setIsNew(false);
  };

  return (
    <AdminModuleShell
      title="CMS interno"
      description="Noticias, comunicados globales y banners en la app."
      badge={null}
    >
      <div className="admin-panel-grid admin-cms-module-grid">
        <div className="admin-panel-col-1">
          <AdminCmsList
            onSelectItem={handleSelectItem}
            selectedId={selectedId}
            refreshKey={refreshKey}
            onNewItem={handleNewItem}
          />
        </div>
        <div className="admin-panel-col-2">
          <AdminCmsEditor
            itemId={selectedId}
            isNew={isNew}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
            onClose={selectedId || isNew ? handleClose : undefined}
          />
        </div>
      </div>
    </AdminModuleShell>
  );
}
