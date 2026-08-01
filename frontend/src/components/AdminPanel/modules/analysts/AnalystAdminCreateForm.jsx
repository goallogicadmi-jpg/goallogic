import { useState } from 'react';
import AvatarUpload from '../../../AvatarUpload';
import {
  createAnalyst,
  createStripePrice,
  getStripeDashboardUrls,
  formatPriceCents,
} from '../../../../services/analystAdminService';

const EMPTY_BET = {
  partido: '',
  mercado: 'Resultado',
  seleccion: 'Local',
  cuota: '',
  stake: '10',
  modelo_analisis: 'Mixto',
  confianza: '3',
  resultado: 'ganada',
};

export default function AnalystAdminCreateForm({ isMainAdmin, onCreated }) {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    email: '',
    pais: '',
    foto_perfil_url: '',
    analystDescription: '',
    password: '',
    analystSubscriptionPriceCents: '',
    analystStripePriceId: '',
  });
  const [bets, setBets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [createdInfo, setCreatedInfo] = useState(null);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const openStripeDashboard = async () => {
    try {
      const urls = await getStripeDashboardUrls();
      window.open(urls.createPriceUrl || urls.pricesUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      window.open('https://dashboard.stripe.com/test/products/create', '_blank', 'noopener,noreferrer');
    }
  };

  const handleCreateStripePrice = async () => {
    if (!isMainAdmin) {
      alert('Solo el administrador principal puede crear Price IDs vía API. Usa el panel de Stripe o pega el ID manualmente.');
      return;
    }
    const cents = parseInt(form.analystSubscriptionPriceCents, 10);
    if (!form.nombre.trim() || Number.isNaN(cents) || cents <= 0) {
      alert('Indica nombre del analista y precio mensual en centavos antes de crear el Price ID.');
      return;
    }
    try {
      const data = await createStripePrice({
        productName: `Suscripción ${form.nombre.trim()}`,
        unitAmountCents: cents,
      });
      update('analystStripePriceId', data.priceId);
      alert(`Price ID creado: ${data.priceId}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const addBetRow = () => setBets((prev) => [...prev, { ...EMPTY_BET, id: Date.now() }]);

  const updateBet = (index, field, value) => {
    setBets((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const removeBet = (index) => setBets((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setCreatedInfo(null);

    try {
      const payload = {
        ...form,
        analystSubscriptionPriceCents:
          form.analystSubscriptionPriceCents === ''
            ? null
            : Number(form.analystSubscriptionPriceCents),
        initialBets: bets.map(({ id, ...bet }) => ({
          ...bet,
          cuota: Number(bet.cuota),
          stake: Number(bet.stake),
          confianza: Number(bet.confianza),
        })),
      };

      const result = await createAnalyst(payload);
      setSuccess(result.message || 'Analista creado');
      setCreatedInfo(result.data);
      setForm({
        nombre: '',
        apellido: '',
        email: '',
        pais: '',
        foto_perfil_url: '',
        analystDescription: '',
        password: '',
        analystSubscriptionPriceCents: '',
        analystStripePriceId: '',
      });
      setBets([]);
      onCreated?.(result.data);
    } catch (err) {
      setError(err.message || 'No se pudo crear el analista');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="analyst-admin-create-form admin-panel-card" onSubmit={handleSubmit}>
      <h3>Crear Analista Deportivo</h3>
      <p className="admin-panel-card__hint">
        Se generará automáticamente el <strong>publicId</strong>. Si no indicas contraseña, se creará una temporal.
      </p>

      {error ? <div className="admin-alert admin-alert-error">{error}</div> : null}
      {success ? <div className="admin-alert admin-alert-success">{success}</div> : null}
      {createdInfo ? (
        <div className="admin-alert admin-alert-success">
          <p><strong>publicId:</strong> <code>{createdInfo.publicId}</code></p>
          {createdInfo.temporaryPassword ? (
            <p><strong>Contraseña temporal:</strong> <code>{createdInfo.temporaryPassword}</code></p>
          ) : null}
          <p>Apuestas iniciales: {createdInfo.initialBetsCount ?? 0}</p>
        </div>
      ) : null}

      <section className="analyst-admin-create-section">
        <h4>Datos personales</h4>
        <div className="admin-form-row">
          <label>
            Nombre *
            <input className="admin-input" value={form.nombre} onChange={(e) => update('nombre', e.target.value)} required />
          </label>
          <label>
            Apellido
            <input className="admin-input" value={form.apellido} onChange={(e) => update('apellido', e.target.value)} />
          </label>
        </div>
        <div className="admin-form-row">
          <label>
            Email *
            <input type="email" className="admin-input" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </label>
          <label>
            País
            <input className="admin-input" value={form.pais} onChange={(e) => update('pais', e.target.value)} />
          </label>
        </div>
        <AvatarUpload
          label="Foto de perfil"
          nombre={form.nombre}
          value={form.foto_perfil_url}
          folder="analysts"
          onChange={(url) => update('foto_perfil_url', url)}
        />
        <label>
          Descripción
          <textarea className="admin-input" rows={3} value={form.analystDescription} onChange={(e) => update('analystDescription', e.target.value)} />
        </label>
        <label>
          Contraseña inicial (opcional)
          <input type="password" className="admin-input" value={form.password} onChange={(e) => update('password', e.target.value)} />
        </label>
      </section>

      <section className="analyst-admin-create-section">
        <h4>Monetización</h4>
        <div className="admin-form-row">
          <label>
            Precio mensual (centavos)
            <input
              type="number"
              min="0"
              className="admin-input"
              value={form.analystSubscriptionPriceCents}
              onChange={(e) => update('analystSubscriptionPriceCents', e.target.value)}
            />
            <small>{formatPriceCents(form.analystSubscriptionPriceCents)}/mes</small>
          </label>
          <label>
            Stripe Price ID
            <input
              className="admin-input"
              value={form.analystStripePriceId}
              onChange={(e) => update('analystStripePriceId', e.target.value)}
              placeholder="price_..."
            />
          </label>
        </div>
        <div className="analyst-admin-actions">
          <button type="button" className="admin-btn-secondary" onClick={openStripeDashboard}>
            Abrir Stripe
          </button>
          {isMainAdmin ? (
            <button type="button" className="admin-btn-secondary" onClick={handleCreateStripePrice}>
              Crear Price ID en Stripe
            </button>
          ) : null}
        </div>
      </section>

      <section className="analyst-admin-create-section">
        <div className="analyst-admin-create-section__header">
          <h4>Carga inicial de apuestas</h4>
          <button type="button" className="admin-btn-secondary" onClick={addBetRow}>
            + Añadir apuesta
          </button>
        </div>
        {!bets.length ? (
          <p className="admin-panel-card__hint">Opcional. Añade apuestas para que el analista nazca con historial.</p>
        ) : (
          <div className="analyst-admin-bets-editor">
            {bets.map((bet, index) => (
              <div key={bet.id || index} className="analyst-admin-bet-row">
                <input placeholder="Partido" value={bet.partido} onChange={(e) => updateBet(index, 'partido', e.target.value)} />
                <select value={bet.mercado} onChange={(e) => updateBet(index, 'mercado', e.target.value)}>
                  <option value="Resultado">Resultado</option>
                  <option value="Over/Under">Over/Under</option>
                  <option value="BTTS">BTTS</option>
                  <option value="Corners">Corners</option>
                  <option value="Combinado">Combinado</option>
                </select>
                <input placeholder="Selección" value={bet.seleccion} onChange={(e) => updateBet(index, 'seleccion', e.target.value)} />
                <input type="number" step="0.01" placeholder="Cuota" value={bet.cuota} onChange={(e) => updateBet(index, 'cuota', e.target.value)} />
                <input type="number" placeholder="Stake" value={bet.stake} onChange={(e) => updateBet(index, 'stake', e.target.value)} />
                <select value={bet.resultado} onChange={(e) => updateBet(index, 'resultado', e.target.value)}>
                  <option value="ganada">Ganada</option>
                  <option value="perdida">Perdida</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="nula">Nula</option>
                </select>
                <button type="button" className="admin-btn-danger" onClick={() => removeBet(index)}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="submit" className="admin-btn-primary" disabled={saving}>
        {saving ? 'Creando…' : 'Crear Analista'}
      </button>
    </form>
  );
}
