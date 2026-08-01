import React, { useEffect } from 'react';
import './PremiumUpgradeModal.css';

export default function PremiumUpgradeModal({ open, onClose, onViewPlans }) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.body.classList.add('premium-upgrade-modal-open');
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.classList.remove('premium-upgrade-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="premium-upgrade-modal" role="presentation" onClick={onClose}>
      <div
        className="premium-upgrade-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-upgrade-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="premium-upgrade-modal-title" className="premium-upgrade-modal__title">
          Desbloquea acceso completo
        </h2>
        <p className="premium-upgrade-modal__text">
          Actualiza a GOAL_LOGIC PRO para usar esta función sin límites.
        </p>
        <div className="premium-upgrade-modal__actions">
          <button type="button" className="premium-upgrade-modal__btn premium-upgrade-modal__btn--primary" onClick={onViewPlans}>
            Ver planes
          </button>
          <button type="button" className="premium-upgrade-modal__btn premium-upgrade-modal__btn--secondary" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
