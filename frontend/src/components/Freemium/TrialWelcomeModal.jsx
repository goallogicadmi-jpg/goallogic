import './TrialWelcomeModal.css';

function BrandBallIcon() {
  return (
    <svg
      className="trial-welcome-modal__brand-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2c2.5 2.8 4 6.2 4 10s-1.5 7.2-4 10M12 2C9.5 4.8 8 8.2 8 12s1.5 7.2 4 10M2 12h20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BrandFireIcon() {
  return (
    <svg
      className="trial-welcome-modal__brand-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12 2c1.2 2.8 3.6 4.2 3.6 7.2 0 1.4-.5 2.6-1.3 3.6.8-.2 1.5-.6 2.1-1.2 1 1.4 1.6 3.1 1.6 5 0 4.4-3.6 8-8 8s-8-3.6-8-8c0-2.8 1.4-5.2 3.6-6.6C6.2 8.2 8.8 6.4 12 2z" />
    </svg>
  );
}

function BulletCheckIcon() {
  return (
    <svg
      className="trial-welcome-modal__list-icon"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M6.5 10.2l2.2 2.2 4.8-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BULLETS = [
  'Predicciones completas y simulaciones avanzadas.',
  'Estadísticas premium y torneos especiales.',
  'Después de 5 días, tu cuenta pasará automáticamente al plan FREE.',
];

export default function TrialWelcomeModal({ onAccept, onViewGuide, busy = false }) {
  return (
    <div className="trial-welcome-overlay" role="presentation">
      <div
        className="trial-welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-welcome-title"
      >
        <div className="trial-welcome-modal__brand">
          <div className="trial-welcome-modal__brand-icons" aria-hidden="true">
            <BrandBallIcon />
            <BrandFireIcon />
          </div>
          <span className="trial-welcome-modal__brand-logo">GOAL_LOGIC</span>
        </div>

        <h2 id="trial-welcome-title" className="trial-welcome-modal__title">
          Bienvenido a GOAL_LOGIC
        </h2>
        <p className="trial-welcome-modal__subtitle">
          Tienes acceso PRO gratuito durante 5 días.
        </p>

        <ul className="trial-welcome-modal__list">
          {BULLETS.map((text) => (
            <li key={text}>
              <BulletCheckIcon />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="trial-welcome-modal__actions">
          <button
            type="button"
            className="trial-welcome-modal__btn trial-welcome-modal__btn--primary"
            onClick={onAccept}
            disabled={busy}
          >
            {busy ? 'Guardando…' : 'Entendido'}
          </button>
          {onViewGuide ? (
            <button
              type="button"
              className="trial-welcome-modal__btn trial-welcome-modal__btn--secondary"
              onClick={onViewGuide}
              disabled={busy}
            >
              Ver cómo funciona GOAL_LOGIC
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
