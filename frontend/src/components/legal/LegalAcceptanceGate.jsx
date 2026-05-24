import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import AvisoLegalModal from './AvisoLegalModal';

/**
 * Bloquea el uso de la app hasta que el usuario autenticado acepte el aviso legal.
 */
export default function LegalAcceptanceGate({ children }) {
  const { loading, isAuthenticated, needsLegalAcceptance, acceptLegal } = useUser();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const showModal = isAuthenticated && !loading && needsLegalAcceptance;

  const handleAccept = async () => {
    setError('');
    setBusy(true);
    try {
      await acceptLegal();
    } catch (err) {
      setError(err.message || 'No se pudo guardar la aceptación. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (showModal) {
    return <AvisoLegalModal onAccept={handleAccept} busy={busy} error={error} />;
  }

  return children;
}
