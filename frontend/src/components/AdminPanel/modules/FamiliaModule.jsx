import { useCallback, useEffect, useState } from 'react';
import AdminModuleShell from '../AdminModuleShell';
import { createFamilyUser, getFamilyUsers } from '../../../services/adminService';

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  email: '',
  telefono: '',
  password: '',
};

export default function FamiliaModule() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getFamilyUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'No se pudo cargar la lista familiar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await createFamilyUser(form);
      setSuccess('Usuario familiar creado con acceso gratuito permanente.');
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch (err) {
      setError(err.message || 'Error al crear usuario familiar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModuleShell
      title="Familia"
      description="Registra usuarios familiares con acceso gratuito permanente (plan free-family)."
      badge="Gratis"
    >
      <div className="admin-family-module">
        <section className="admin-panel-card admin-family-form-card">
          <h3 className="admin-panel-card__title">Registrar familiar</h3>
          <p className="admin-panel-card__hint">
            Las cuentas familiares tienen premium activo, facturación bloqueada y no verán avisos de
            pago.
          </p>

          {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
          {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}

          <form className="admin-family-form" onSubmit={handleSubmit}>
            <div className="admin-form-row">
              <label>
                Nombre
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  required
                />
              </label>
              <label>
                Apellido
                <input
                  type="text"
                  value={form.apellido}
                  onChange={(e) => handleChange('apellido', e.target.value)}
                />
              </label>
            </div>
            <div className="admin-form-row">
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </label>
              <label>
                Teléfono
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => handleChange('telefono', e.target.value)}
                  required
                />
              </label>
            </div>
            <label>
              Contraseña inicial
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                minLength={8}
              />
            </label>
            <button type="submit" className="admin-btn-primary" disabled={saving}>
              {saving ? 'Creando…' : 'Crear cuenta familiar'}
            </button>
          </form>
        </section>

        <section className="admin-panel-card">
          <h3 className="admin-panel-card__title">Usuarios familiares ({users.length})</h3>
          {loading ? (
            <p>Cargando…</p>
          ) : users.length === 0 ? (
            <p>No hay usuarios familiares registrados.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Plan</th>
                    <th>Bienvenida</th>
                    <th>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        {[user.nombre, user.apellido].filter(Boolean).join(' ')}
                      </td>
                      <td>{user.email}</td>
                      <td>{user.telefono}</td>
                      <td>
                        <span className="status-badge badge-premium-on">{user.plan || 'free-family'}</span>
                      </td>
                      <td>{user.welcomeShown ? 'Mostrada' : 'Pendiente'}</td>
                      <td>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminModuleShell>
  );
}
