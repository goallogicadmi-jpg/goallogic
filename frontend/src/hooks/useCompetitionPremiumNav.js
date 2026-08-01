import { useCallback } from 'react';
import { usePlanAccess } from '../context/PlanAccessContext';
import { getCompetitionTabPremiumFeature } from '../utils/competitionPremiumSections';

/**
 * Navegación a pestañas de competición con bloqueo freemium unificado.
 */
export default function useCompetitionPremiumNav(onTabChange) {
  const { requestFeature } = usePlanAccess();

  const openTab = useCallback(
    (tabId) => {
      const feature = getCompetitionTabPremiumFeature(tabId);
      if (feature && !requestFeature(feature)) {
        return false;
      }
      onTabChange?.(tabId);
      return true;
    },
    [onTabChange, requestFeature]
  );

  return { openTab };
}
