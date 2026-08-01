import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from './UserContext';
import {
  canAccessFeature,
  getUserFeatures,
  hasFullProAccess,
  resolveEffectivePlan,
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
  const [modalOpen, setModalOpen] = useState(false);

  const features = useMemo(() => getUserFeatures(user), [user]);
  const effectivePlan = useMemo(() => resolveEffectivePlan(user), [user]);

  const openUpgradeModal = useCallback(() => {
    setModalOpen(true);
  }, []);

  const closeUpgradeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const requestFeature = useCallback(
    (feature, onAllowed) => {
      if (!isAuthenticated) {
        navigate('/ligas');
        return false;
      }
      if (canAccessFeature(user, feature)) {
        if (typeof onAllowed === 'function') {
          onAllowed();
        }
        return true;
      }
      setModalOpen(true);
      return false;
    },
    [isAuthenticated, navigate, user]
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
      hasFullProAccess: hasFullProAccess(user),
      canAccessFeature: (feature) => canAccessFeature(user, feature),
      requestFeature,
      openUpgradeModal,
      closeUpgradeModal,
    }),
    [closeUpgradeModal, effectivePlan, features, openUpgradeModal, requestFeature, user]
  );

  return (
    <PlanAccessContext.Provider value={value}>
      {children}
      <PremiumUpgradeModal
        open={modalOpen}
        onClose={closeUpgradeModal}
        onViewPlans={handleViewPlans}
      />
    </PlanAccessContext.Provider>
  );
}
