import { useState, useCallback } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import AdminCouponList from '../AdminCouponList';
import AdminCouponCreate from '../AdminCouponCreate';
import AdminCouponDetail from '../AdminCouponDetail';
import '../AdminPanel.css';

export default function CouponsModule() {
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [mode, setMode] = useState('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [envCouponId, setEnvCouponId] = useState(null);

  const handleUpdated = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCreated = (created) => {
    setMode('list');
    if (created?.stripeCouponId) {
      setSelectedCoupon(created);
    }
    handleUpdated();
  };

  return (
    <AdminModuleShell
      title="Cupones y promociones"
      description="Cupones y códigos promocionales Stripe LIVE."
      badge={null}
    >
      <div className="admin-panel-grid admin-coupon-module-grid">
        <div className="admin-panel-col-1">
          {mode === 'create' ? (
            <AdminCouponCreate
              onCreated={handleCreated}
              onCancel={() => setMode('list')}
            />
          ) : (
            <AdminCouponList
              onSelectCoupon={(item) => {
                setSelectedCoupon(item);
                setMode('list');
              }}
              selectedId={selectedCoupon?.stripeCouponId}
              refreshKey={refreshKey}
              onCreateNew={() => {
                setMode('create');
                setSelectedCoupon(null);
              }}
              envCouponId={envCouponId}
              onEnvLoaded={setEnvCouponId}
            />
          )}
        </div>
        <div className="admin-panel-col-2">
          {mode !== 'create' && (
            <AdminCouponDetail
              couponItem={selectedCoupon}
              onClose={selectedCoupon ? () => setSelectedCoupon(null) : undefined}
              onUpdated={handleUpdated}
            />
          )}
        </div>
      </div>
    </AdminModuleShell>
  );
}
