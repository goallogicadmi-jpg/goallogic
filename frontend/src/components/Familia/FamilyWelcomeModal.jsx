import './FamilyWelcomeModal.css';

/**
 * Modal de bienvenida para cuentas familiares (primera sesión).
 */
export default function FamilyWelcomeModal({ nombre, onAccept, busy = false }) {
  const firstName = (nombre || 'Usuario').trim().split(/\s+/)[0];

  return (
    <div className="family-welcome-overlay" role="presentation">
      <div
        className="family-welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-welcome-title"
      >
        <div className="family-welcome-modal__icon" aria-hidden="true">
          👨‍👩‍👧‍👦
        </div>
        <h2 id="family-welcome-title" className="family-welcome-modal__title">
          ¡Bienvenido {firstName}!
        </h2>
        <p className="family-welcome-modal__text">
          Tu cuenta familiar ha sido creada con éxito. Completa tu registro y recuerda que este
          servicio es totalmente gratuito para ti.
        </p>
        <button
          type="button"
          className="family-welcome-modal__btn"
          onClick={onAccept}
          disabled={busy}
        >
          {busy ? 'Guardando…' : 'Aceptar y continuar'}
        </button>
      </div>
    </div>
  );
}
