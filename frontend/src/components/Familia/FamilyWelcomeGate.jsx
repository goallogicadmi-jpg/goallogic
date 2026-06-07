import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { markFamilyWelcomeShown } from '../../services/authService';
import FamilyWelcomeModal from './FamilyWelcomeModal';

/**
 * Muestra el modal de bienvenida familiar solo la primera vez que inicia sesión.
 */
export default function FamilyWelcomeGate({ children }) {
  const { loading, isAuthenticated, needsLegalAcceptance, user, updateUser } = useUser();
  const [busy, setBusy] = useState(false);

  const isFamilyAccount =
    user?.tipo === 'familia' || user?.plan === 'free-family' || user?.billingLocked === true;

  const showModal =
    isAuthenticated &&
    !loading &&
    !needsLegalAcceptance &&
    isFamilyAccount &&
    user?.welcomeShown !== true;

  const handleAccept = async () => {
    setBusy(true);
    try {
      await markFamilyWelcomeShown();
      updateUser({ welcomeShown: true });
    } finally {
      setBusy(false);
    }
  };

  if (showModal) {
    return (
      <FamilyWelcomeModal
        nombre={user?.nombre}
        onAccept={handleAccept}
        busy={busy}
      />
    );
  }

  return children;
}
