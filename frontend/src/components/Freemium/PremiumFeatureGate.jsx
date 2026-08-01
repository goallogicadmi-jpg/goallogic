import React from 'react';
import { FEATURES } from '../../utils/planAccess';
import { usePlanAccess } from '../../context/PlanAccessContext';
import './PremiumFeatureGate.css';

export default function PremiumFeatureGate({
  feature,
  children,
  title = 'Función premium',
  description = 'Disponible en GOAL_LOGIC PRO.',
  compact = false,
}) {
  const { canAccessFeature, openUpgradeModal } = usePlanAccess();
  const allowed = canAccessFeature(feature);

  if (allowed) {
    return children;
  }

  return (
    <div className={`premium-feature-gate${compact ? ' premium-feature-gate--compact' : ''}`}>
      <div className="premium-feature-gate__overlay">
        <div className="premium-feature-gate__lock" aria-hidden="true">
          🔒
        </div>
        <h4 className="premium-feature-gate__title">{title}</h4>
        <p className="premium-feature-gate__description">{description}</p>
        <button type="button" className="premium-feature-gate__btn" onClick={openUpgradeModal}>
          Desbloquear
        </button>
      </div>
      <div className="premium-feature-gate__preview" aria-hidden="true">
        {children}
      </div>
    </div>
  );
}

export { FEATURES };
