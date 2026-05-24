import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword, verifyResetToken } from '../services/authService';
import '../components/MiCuenta/MiCuenta.css';

const MIN_PASSWORD_LENGTH = 10;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function checkToken() {
      if (!token) {
        setCheckingToken(false);
        setTokenValid(false);
        return;
      }

      try {
        const result = await verifyResetToken(token);
        if (!cancelled) {
          setTokenValid(result.valid === true);
        }
      } catch {
        if (!cancelled) {
          setTokenValid(false);
        }
      } finally {
        if (!cancelled) {
          setCheckingToken(false);
        }
      }
    }

    checkToken();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setSuccess(result.message || 'Contraseña actualizada correctamente.');
      setTimeout(() => navigate('/cuenta'), 2500);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="auth-form-container">
        <div className="auth-form">
          <p className="auth-form-subtitle">Verificando enlace…</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="auth-form-container">
        <div className="auth-form">
          <h2 className="auth-form-title">Enlace no válido</h2>
          <p className="auth-form-subtitle">
            El enlace de recuperación no es válido o ha expirado. Solicita uno nuevo.
          </p>
          <p className="auth-form-footer-link">
            <Link to="/forgot-password">Solicitar nuevo enlace</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Nueva contraseña</h2>
        <p className="auth-form-subtitle">Elige una contraseña segura para tu cuenta.</p>

        {error && (
          <div className="auth-message auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {success ? (
          <div className="auth-message auth-success">
            <span>✅</span> {success}
            <p className="auth-form-subtitle" style={{ marginTop: '0.75rem' }}>
              Redirigiendo al inicio de sesión…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label htmlFor="reset-password">Nueva contraseña</label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
                disabled={loading}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </div>
            <div className="auth-form-group">
              <label htmlFor="reset-confirm-password">Confirmar contraseña</label>
              <input
                id="reset-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite tu contraseña"
                disabled={loading}
                required
                minLength={MIN_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="auth-button auth-button-primary" disabled={loading}>
              {loading ? 'Guardando…' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        <p className="auth-form-footer-link">
          <Link to="/cuenta">Volver a iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
