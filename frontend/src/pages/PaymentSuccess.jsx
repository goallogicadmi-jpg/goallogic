import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { hasToken } from '../services/authService';
import { getUserProfile } from '../services/userService';

const POLL_MAX_MS = 45000;
const POLL_BASE_MS = 500;

/**
 * /api/auth/me solo responde 200 cuando el usuario ya puede usar la app (premium o rol admin).
 * Coincide con isPremium en el sentido de negocio para usuarios normales.
 */
function accountUnlockedFromMe(user) {
  if (!user) return false;
  if (user.premium === true) return true;
  const r = user.role || 'usuario';
  if (r === 'admin' || r === 'admin_secundario') return true;
  return user.isMainAdmin === true;
}

export default function PaymentSuccess() {
  const { refreshProfile } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [phase, setPhase] = useState(() => (hasToken() ? 'checking' : 'no-session'));
  const cancelled = useRef(false);

  useEffect(() => {
    if (!hasToken()) {
      setPhase('no-session');
      return;
    }

    const started = Date.now();
    let attempt = 0;

    const tick = async () => {
      while (!cancelled.current && Date.now() - started < POLL_MAX_MS) {
        try {
          const profile = await getUserProfile();
          if (profile.success && accountUnlockedFromMe(profile.user)) {
            setPhase('redirecting');
            await refreshProfile();
            navigate('/cuenta', { replace: true });
            return;
          }
        } catch {
          // 403 "Debes completar el pago": webhook aún no reflejó premium en BD
        }
        const wait = Math.min(2500, POLL_BASE_MS + attempt * 120);
        attempt += 1;
        await new Promise((r) => setTimeout(r, wait));
      }
      if (!cancelled.current) {
        setPhase('timeout');
      }
    };

    tick();
    return () => {
      cancelled.current = true;
    };
  }, [navigate, refreshProfile]);

  if (phase === 'redirecting') {
    return (
      <div className="micuenta-container" style={{ padding: '2rem' }}>
        <p>Actualizando tu cuenta…</p>
      </div>
    );
  }

  return (
    <div className="micuenta-container" style={{ padding: '2rem' }}>
      <h1>Pago completado</h1>
      {sessionId && (
        <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Referencia de sesión: {sessionId.slice(0, 24)}…
        </p>
      )}
      {phase === 'no-session' && (
        <p>
          Inicia sesión y entra a <Link to="/cuenta">tu cuenta</Link> para ver el estado actualizado.
        </p>
      )}
      {phase === 'checking' && (
        <p>
          Comprobando tu suscripción con el servidor… en unos segundos te llevamos a tu cuenta si el
          pago ya está activo.
        </p>
      )}
      {phase === 'timeout' && (
        <p>
          Aún no pudimos confirmar el alta premium (el webhook puede tardar un momento). Recarga esta
          página o ve a <Link to="/cuenta">Mi cuenta</Link>.
        </p>
      )}
      <p>
        <Link to="/torneos">Ir a inicio</Link>
        {' · '}
        <Link to="/cuenta">Mi cuenta</Link>
      </p>
    </div>
  );
}
