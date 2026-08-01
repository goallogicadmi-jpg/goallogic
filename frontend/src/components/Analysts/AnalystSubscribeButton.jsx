import { useState } from 'react';
import { subscribeToAnalyst, formatPriceCents } from '../../services/analystService';

export default function AnalystSubscribeButton({
  analystId,
  subscribed = false,
  priceCents = null,
  hasStripePrice = true,
  label = 'Suscribirse',
  className = '',
  onSubscribed,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (subscribed) {
    return <span className={`analyst-subscribe-btn analyst-subscribe-btn--active ${className}`}>Suscrito</span>;
  }

  const handleSubscribe = async () => {
    setError('');
    setBusy(true);
    try {
      const data = await subscribeToAnalyst(analystId);
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      onSubscribed?.();
    } catch (err) {
      setError(err.message || 'No se pudo iniciar la suscripción');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`analyst-subscribe-wrap ${className}`}>
      <button
        type="button"
        className="analyst-subscribe-btn"
        onClick={handleSubscribe}
        disabled={busy || !hasStripePrice}
      >
        {busy ? 'Conectando…' : label}
        {priceCents != null ? ` · ${formatPriceCents(priceCents)}/mes` : ''}
      </button>
      {!hasStripePrice ? (
        <p className="analyst-subscribe-hint">Precio pendiente de configuración por el administrador.</p>
      ) : null}
      {error ? <p className="analyst-subscribe-error">{error}</p> : null}
    </div>
  );
}
