import { useState } from 'react';
import { createAdminCoupon } from '../../services/couponsAdminService';
import './AdminPanel.css';

const EMPTY_FORM = {
  code: '',
  label: '',
  type: 'percent',
  percentOff: 50,
  amountOff: 500,
  currency: 'usd',
  duration: 'once',
  durationInMonths: 3,
  maxRedemptions: '',
  expiresAt: '',
  redeemBy: '',
  autoApplyCheckout: false,
  scheduledActivateAt: '',
  scheduledDeactivateAt: '',
  notes: '',
};

export default function AdminCouponCreate({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [promo24h, setPromo24h] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const apply24hPromo = (checked) => {
    setPromo24h(checked);
    if (checked) {
      const exp = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const local = new Date(exp.getTime() - exp.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setForm((prev) => ({
        ...prev,
        expiresAt: local,
        label: prev.label || 'Promo 24h',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      alert('El código es obligatorio');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        redeemBy: form.redeemBy ? new Date(form.redeemBy).toISOString() : null,
        scheduledActivateAt: form.scheduledActivateAt
          ? new Date(form.scheduledActivateAt).toISOString()
          : null,
        scheduledDeactivateAt: form.scheduledDeactivateAt
          ? new Date(form.scheduledDeactivateAt).toISOString()
          : null,
      };
      const created = await createAdminCoupon(payload);
      onCreated?.(created);
      setForm(EMPTY_FORM);
      setPromo24h(false);
    } catch (err) {
      alert(err.message || 'Error al crear');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-coupon-create">
      <div className="admin-coupon-create-header">
        <h3>Nuevo cupón Stripe</h3>
        {onCancel && (
          <button type="button" className="admin-btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>

      <form className="admin-cms-form" onSubmit={handleSubmit}>
        <label className="admin-cms-field">
          <span>Código promocional *</span>
          <input
            className="admin-input"
            value={form.code}
            onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
            placeholder="GOAL50"
            required
          />
        </label>

        <label className="admin-cms-field">
          <span>Etiqueta interna</span>
          <input
            className="admin-input"
            value={form.label}
            onChange={(e) => handleChange('label', e.target.value)}
          />
        </label>

        <label className="admin-cms-check">
          <input type="checkbox" checked={promo24h} onChange={(e) => apply24hPromo(e.target.checked)} />
          Promoción temporal 24h (expira mañana)
        </label>

        <div className="admin-cms-field-row">
          <label className="admin-cms-field">
            <span>Tipo</span>
            <select
              className="admin-input"
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
            >
              <option value="percent">Porcentaje</option>
              <option value="amount">Monto fijo</option>
            </select>
          </label>
          {form.type === 'percent' ? (
            <label className="admin-cms-field">
              <span>% descuento</span>
              <input
                type="number"
                min={1}
                max={100}
                className="admin-input"
                value={form.percentOff}
                onChange={(e) => handleChange('percentOff', e.target.value)}
              />
            </label>
          ) : (
            <label className="admin-cms-field">
              <span>Monto (centavos)</span>
              <input
                type="number"
                min={1}
                className="admin-input"
                value={form.amountOff}
                onChange={(e) => handleChange('amountOff', e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="admin-cms-field-row">
          <label className="admin-cms-field">
            <span>Duración</span>
            <select
              className="admin-input"
              value={form.duration}
              onChange={(e) => handleChange('duration', e.target.value)}
            >
              <option value="once">Una vez</option>
              <option value="repeating">Recurrente</option>
              <option value="forever">Siempre</option>
            </select>
          </label>
          {form.duration === 'repeating' && (
            <label className="admin-cms-field">
              <span>Meses</span>
              <input
                type="number"
                min={1}
                className="admin-input admin-input-narrow"
                value={form.durationInMonths}
                onChange={(e) => handleChange('durationInMonths', e.target.value)}
              />
            </label>
          )}
        </div>

        <label className="admin-cms-field">
          <span>Límite de usos (vacío = ilimitado)</span>
          <input
            type="number"
            min={1}
            className="admin-input admin-input-narrow"
            value={form.maxRedemptions}
            onChange={(e) => handleChange('maxRedemptions', e.target.value)}
          />
        </label>

        <label className="admin-cms-field">
          <span>Expira (código)</span>
          <input
            type="datetime-local"
            className="admin-input"
            value={form.expiresAt}
            onChange={(e) => handleChange('expiresAt', e.target.value)}
          />
        </label>

        <div className="admin-cms-schedule">
          <label className="admin-cms-field">
            <span>Activar desde</span>
            <input
              type="datetime-local"
              className="admin-input"
              value={form.scheduledActivateAt}
              onChange={(e) => handleChange('scheduledActivateAt', e.target.value)}
            />
          </label>
          <label className="admin-cms-field">
            <span>Desactivar en</span>
            <input
              type="datetime-local"
              className="admin-input"
              value={form.scheduledDeactivateAt}
              onChange={(e) => handleChange('scheduledDeactivateAt', e.target.value)}
            />
          </label>
        </div>

        <label className="admin-cms-check">
          <input
            type="checkbox"
            checked={form.autoApplyCheckout}
            onChange={(e) => handleChange('autoApplyCheckout', e.target.checked)}
          />
          Aplicar automáticamente en checkout (sin código)
        </label>

        <button type="submit" className="admin-btn-primary" disabled={saving}>
          {saving ? 'Creando en Stripe…' : 'Crear cupón LIVE'}
        </button>
      </form>
    </div>
  );
}
