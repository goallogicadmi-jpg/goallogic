import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PremiumRequired from './PremiumRequired';

/**
 * Rutas que requieren sesión y premium (salvo administradores).
 */
export function ProtectedRoute({ children }) {
  const { user, loading, isAdmin, isMainAdmin, needsLegalAcceptance } = useUser();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          color: '#fff',
        }}
      >
        Cargando...
      </div>
    );
  }

  if (needsLegalAcceptance) {
    return null;
  }

  if (!user) {
    return <Navigate to="/ligas" replace />;
  }

  const adminBypass = isAdmin || isMainAdmin;
  const isFamilyAccount =
    user.billingLocked === true || user.tipo === 'familia' || user.plan === 'free-family';
  const needsPremium = user.premium !== true && !adminBypass && !isFamilyAccount;

  if (needsPremium) {
    return (
      <div style={{ padding: '1.5rem', maxWidth: 560, margin: '0 auto' }}>
        <PremiumRequired />
      </div>
    );
  }

  return children;
}
