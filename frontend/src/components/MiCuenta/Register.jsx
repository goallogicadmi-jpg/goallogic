import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, login, saveToken, saveAuthUserSnapshot } from '../../services/authService';
import { useUser } from '../../context/UserContext';
import './MiCuenta.css';

/**
 * Registro gratuito: crea cuenta con trial de 15 días sin pago obligatorio.
 */
const Register = () => {
  const navigate = useNavigate();
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

      const loginRes = await login(email.trim(), password);
      if (!loginRes?.success || !loginRes.token) {
        setSuccess('Cuenta creada. Inicia sesión para continuar.');
        setLoading(false);
        return;
      }

      saveToken(loginRes.token);
      if (loginRes.user) {
        saveAuthUserSnapshot(loginRes.user);
      }
      await loadUserProfile();

      setSuccess('¡Cuenta creada! Disfruta GOAL_LOGIC con acceso gratuito.');
      navigate('/clubes');
    } catch (err) {
      setError(err.message || 'Error al registrar la cuenta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Crear Cuenta</h2>
        <p className="auth-form-subtitle">Registro 100% gratuito. Sin tarjeta requerida.</p>

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
            {loading ? 'Creando cuenta…' : 'Crear cuenta gratis'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
