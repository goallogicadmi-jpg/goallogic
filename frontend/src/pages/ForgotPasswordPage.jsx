import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/authService';
import '../components/MiCuenta/MiCuenta.css';

const SUCCESS_MESSAGE =
  'Si el correo existe en nuestro sistema, enviaremos instrucciones para restablecer tu contraseña.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email.trim()) {
        setError('Por favor ingresa tu correo electrónico');
        return;
      }

      await requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'No se pudo procesar la solicitud. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Recuperar contraseña</h2>
        <p className="auth-form-subtitle">
          Ingresa el email de tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        {error && (
          <div className="auth-message auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {submitted ? (
          <div className="auth-message auth-success">
            <span>✅</span> {SUCCESS_MESSAGE}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="auth-form-group">
              <label htmlFor="forgot-email">Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                required
                autoComplete="email"
              />
            </div>
            <button type="submit" className="auth-button auth-button-primary" disabled={loading}>
              {loading ? 'Enviando…' : 'Enviar instrucciones'}
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
