import React, { useState } from 'react';
import { register, login, saveToken, saveAuthUserSnapshot } from '../../services/authService';
import { getAuthHeaders } from '../../setupApiAuth.js';
import { useUser } from '../../context/UserContext';
import './MiCuenta.css';

const checkoutPriceId =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_STRIPE_PRICE_ID?.trim()) || '';

/**
 * Componente de Registro
 * Registro y pago en un solo flujo: cuenta → checkout Stripe.
 */
const Register = () => {
  const { loadUserProfile } = useUser();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (
        !nombre ||
        !apellido ||
        !telefono ||
        !email ||
        !pais ||
        !ciudad ||
        !direccion ||
        !codigoPostal ||
        !password ||
        !confirmPassword
      ) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      if (!nombre.trim() || !apellido.trim()) {
        setError('Nombre y apellido no pueden estar vacíos');
        setLoading(false);
        return;
      }

      if (!telefono.trim()) {
        setError('El teléfono no puede estar vacío');
        setLoading(false);
        return;
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        setError('Por favor ingresa un email válido');
        setLoading(false);
        return;
      }

      if (password.length < 10) {
        setError('La contraseña debe tener al menos 10 caracteres');
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      const regResponse = await register({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        password,
        pais: pais.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        codigo_postal: codigoPostal.trim(),
      });

      if (!regResponse.success) {
        setError(regResponse.message || 'Error al crear la cuenta');
        setLoading(false);
        return;
      }

      if (!checkoutPriceId) {
        setError(
          'Falta VITE_STRIPE_PRICE_ID en frontend/.env (precio activo del producto en Stripe). Guarda el archivo y reinicia Vite (npm run dev).'
        );
        setLoading(false);
        return;
      }

      // Iniciar sesión para que, si el checkout falla, el usuario ya tenga token
      // y pueda usar “Completar pago” en Mi Cuenta (GET /me devuelve 403 sin premium).
      try {
        const loginRes = await login(email.trim(), password);
        if (loginRes?.success && loginRes.token) {
          saveToken(loginRes.token);
          if (loginRes.user) {
            saveAuthUserSnapshot(loginRes.user);
          }
          await loadUserProfile();
        } else {
          setError('Cuenta creada pero no se pudo iniciar sesión. Inicia sesión y completa el pago.');
          setLoading(false);
          return;
        }
      } catch (loginErr) {
        setError('Cuenta creada pero no se pudo iniciar sesión. Inicia sesión y completa el pago.');
        setLoading(false);
        return;
      }

      const payRes = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ priceId: checkoutPriceId }),
      });

      const payData = await payRes.json();

      if (!payRes.ok || !payData.url) {
        throw new Error(payData.error || payData.message || 'Error al iniciar el pago');
      }

      setSuccess('Redirigiendo al pago seguro…');
      window.location.href = payData.url;
    } catch (err) {
      setError(err.message || 'Error al registrar o iniciar el pago.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Crear Cuenta</h2>

        {error && (
          <div className="auth-message auth-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="auth-message auth-success">
            <span>✅</span> {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="auth-form-group">
            <label htmlFor="register-nombre">Nombre</label>
            <input
              id="register-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-apellido">Apellido</label>
            <input
              id="register-apellido"
              type="text"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              placeholder="Apellido"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-telefono">Teléfono</label>
            <input
              id="register-telefono"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Tu número de teléfono"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-pais">País</label>
            <input
              id="register-pais"
              type="text"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder="País"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-ciudad">Ciudad</label>
            <input
              id="register-ciudad"
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Ciudad"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-direccion">Dirección</label>
            <input
              id="register-direccion"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Dirección"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-codigo-postal">Código postal</label>
            <input
              id="register-codigo-postal"
              type="text"
              value={codigoPostal}
              onChange={(e) => setCodigoPostal(e.target.value)}
              placeholder="Código postal"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-password">Contraseña</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 10 caracteres"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="register-confirm-password">Confirmar contraseña</label>
            <input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu contraseña"
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Procesando…' : 'Continuar y pagar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
