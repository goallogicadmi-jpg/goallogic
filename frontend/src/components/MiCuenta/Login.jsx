import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, saveToken, saveAuthUserSnapshot } from '../../services/authService';
import { useUser } from '../../context/UserContext';
import './MiCuenta.css';

/**
 * Componente de Login
 * Permite al usuario iniciar sesión con email y contraseña
 */
const Login = ({ onLoginSuccess }) => {
  const { loadUserProfile } = useUser();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validar campos
      if (!email || !password) {
        setError('Por favor completa todos los campos');
        setLoading(false);
        return;
      }

      // Validar formato de email básico
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(email)) {
        setError('Por favor ingresa un email válido');
        setLoading(false);
        return;
      }

      // Llamar a la API de login
      const response = await login(email, password);

      if (response.success && response.token) {
        // Guardar token en localStorage
        saveToken(response.token);
        if (response.user) {
          saveAuthUserSnapshot(response.user);
        }
        
        // Verificar si es administrador principal
        const userRole = response.user?.role || 'usuario';
        const isMainAdmin = response.user?.isMainAdmin || false;
        
        // Cargar perfil completo del usuario
        try {
          await loadUserProfile();
          setSuccess('¡Inicio de sesión exitoso!');
          
          // Redirigir según el rol
          setTimeout(() => {
            if (userRole === 'admin' || isMainAdmin) {
              // Administrador principal → redirigir a panel de administración
              navigate('/admin');
            } else if (userRole === 'admin_secundario') {
              // Admin secundario → también al panel de administración
              navigate('/admin');
            } else {
              // Usuario normal → redirigir a Mi Cuenta
              if (onLoginSuccess) {
                onLoginSuccess();
              }
            }
          }, 500);
        } catch (profileError) {
          console.error('Error cargando perfil:', profileError);
          // Aún así, permitir el login si el token se guardó correctamente
          setSuccess('¡Inicio de sesión exitoso!');
          
          // Redirigir según el rol (sin perfil completo)
          setTimeout(() => {
            if (userRole === 'admin' || isMainAdmin) {
              navigate('/admin');
            } else if (userRole === 'admin_secundario') {
              navigate('/admin');
            } else {
              if (onLoginSuccess) {
                onLoginSuccess();
              }
            }
          }, 500);
        }
      } else {
        setError(response.message || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form">
        <h2 className="auth-form-title">Iniciar Sesión</h2>
        
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
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-form-group">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-button auth-button-primary"
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="auth-form-footer-link">
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
