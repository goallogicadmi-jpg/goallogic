import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { markFamilyWelcomeShown } from '../../services/authService';
import { acknowledgeTrialExpired } from '../../services/planService';
import {
  hasSeenWelcomePopupLocal,
  markWelcomePopupSeenLocal,
} from '../../utils/welcomePopupStorage';
import TrialWelcomeModal from './TrialWelcomeModal';
import './TrialWelcomeModal.css';

export default function TrialExpiredModal({ onContinueFree }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleUpgrade = () => {
    navigate('/ligas', { state: { activeSection: 'proyecto' } });
    window.dispatchEvent(new CustomEvent('changeSection', { detail: 'proyecto' }));
  };

  const handleContinueFree = async () => {
    setBusy(true);
    try {
      await acknowledgeTrialExpired();
      onContinueFree?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="trial-expired-overlay" role="presentation">
      <div
        className="trial-expired-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-expired-title"
      >
        <div className="trial-expired-modal__icon" aria-hidden="true">
          ⏳
        </div>
        <h2 id="trial-expired-title" className="trial-expired-modal__title">
          Tu prueba gratuita ha finalizado
        </h2>
        <p className="trial-expired-modal__text">
          Puedes seguir usando GoalLogic con tu plan gratuito o mejorar tu plan para recuperar
          acceso ilimitado.
        </p>
        <div className="trial-expired-modal__actions">
          <button
            type="button"
            className="trial-expired-modal__btn-primary"
            onClick={handleUpgrade}
            disabled={busy}
          >
            Mejorar plan
          </button>
          <button
            type="button"
            className="trial-expired-modal__btn-secondary"
            onClick={handleContinueFree}
            disabled={busy}
          >
            {busy ? 'Guardando…' : 'Continuar gratis'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TrialWelcomeGate({ children }) {
  const { loading, isAuthenticated, needsLegalAcceptance, user, updateUser } = useUser();
  const [busy, setBusy] = useState(false);

  const isFamilyAccount =
    user?.tipo === 'familia' || user?.plan === 'free-family' || user?.billingLocked === true;

  const showModal =
    isAuthenticated &&
    !loading &&
    !needsLegalAcceptance &&
    !isFamilyAccount &&
    user?.trialActive === true &&
    user?.welcomeShown !== true &&
    !hasSeenWelcomePopupLocal(user?.id);

  const persistWelcomeSeen = async () => {
    await markFamilyWelcomeShown();
    markWelcomePopupSeenLocal(user?.id);
    updateUser({ welcomeShown: true });
  };

  const handleAccept = async () => {
    setBusy(true);
    try {
      await persistWelcomeSeen();
    } finally {
      setBusy(false);
    }
  };

  const handleViewGuide = async () => {
    setBusy(true);
    try {
      await persistWelcomeSeen();
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('goal-logic:open-inbox'));
      }, 150);
    } finally {
      setBusy(false);
    }
  };

  if (showModal) {
    return (
      <TrialWelcomeModal onAccept={handleAccept} onViewGuide={handleViewGuide} busy={busy} />
    );
  }

  return children;
}

export function TrialExpiredGate({ children }) {
  const { loading, isAuthenticated, needsLegalAcceptance, user, updateUser } = useUser();

  const showModal =
    isAuthenticated &&
    !loading &&
    !needsLegalAcceptance &&
    user?.showTrialExpiredModal === true;

  const handleContinueFree = () => {
    updateUser({ showTrialExpiredModal: false, trialExpiredAcknowledged: true });
  };

  if (showModal) {
    return (
      <>
        <TrialExpiredModal onContinueFree={handleContinueFree} />
        {children}
      </>
    );
  }

  return children;
}
