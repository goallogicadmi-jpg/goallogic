import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import { usePlatformSettings } from './PlatformSettingsContext';
import {
  canAccessFeature,
  getUserFeatures,
  hasFullProAccess,
  resolveEffectivePlan,
  shouldSuppressPlatformUpsell,
} from '../utils/planAccess';
import PremiumUpgradeModal from '../components/Freemium/PremiumUpgradeModal';

const PlanAccessContext = createContext(null);

export function usePlanAccess() {
  const context = useContext(PlanAccessContext);
  if (!context) {
    throw new Error('usePlanAccess debe usarse dentro de PlanAccessProvider');
  }
  return context;
}

export function PlanAccessProvider({ children }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  const { freeModeEnabled } = usePlatformSettings();
  const [modalOpen, setModalOpen] = useState(false);

  const suppressUpsell = shouldSuppressPlatformUpsell(user, freeModeEnabled);
  const accessOptions = useMemo(() => ({ freeModeEnabled }), [freeModeEnabled]);

  const features = useMemo(
    () => getUserFeatures(user, accessOptions),
    [user, accessOptions]
  );
  const effectivePlan = useMemo(() => resolveEffectivePlan(user), [user]);

  const openUpgradeModal = useCallback(() => {
    if (suppressUpsell) return;
    setModalOpen(true);
  }, [suppressUpsell]);

  const closeUpgradeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const requestFeature = useCallback(
    (feature, onAllowed) => {
      if (!isAuthenticated) {
        navigate('/ligas');
        return false;
      }
      if (canAccessFeature(user, feature, accessOptions)) {
        if (typeof onAllowed === 'function') {
          onAllowed();
        }
        return true;
      }
      if (suppressUpsell) {
        if (typeof onAllowed === 'function') {
          onAllowed();
        }
        return true;
      }
      setModalOpen(true);
      return false;
    },
    [accessOptions, isAuthenticated, navigate, suppressUpsell, user]
  );

  const handleViewPlans = useCallback(() => {
    setModalOpen(false);
    navigate('/ligas', { state: { activeSection: 'proyecto', showPlans: true } });
    window.dispatchEvent(
      new CustomEvent('changeSection', { detail: 'proyecto' })
    );
  }, [navigate]);

  const value = useMemo(
    () => ({
      features,
      effectivePlan,
      freeModeEnabled,
      suppressPlatformUpsell: suppressUpsell,
      hasFullProAccess: hasFullProAccess(user, accessOptions),
      canAccessFeature: (feature) => canAccessFeature(user, feature, accessOptions),
      requestFeature,
      openUpgradeModal,
      closeUpgradeModal,
    }),
    [
      accessOptions,
      closeUpgradeModal,
      effectivePlan,
      features,
      freeModeEnabled,
      openUpgradeModal,
      requestFeature,
      suppressUpsell,
      user,
    ]
  );

  return (
    <PlanAccessContext.Provider value={value}>
      {children}
      {!suppressUpsell && (
        <PremiumUpgradeModal
          open={modalOpen}
          onClose={closeUpgradeModal}
          onViewPlans={handleViewPlans}
        />
      )}
    </PlanAccessContext.Provider>
  );
}
