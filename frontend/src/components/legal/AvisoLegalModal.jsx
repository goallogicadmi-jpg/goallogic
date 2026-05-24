import AvisoLegalContent from './AvisoLegalContent';
import { avisoLegalModalSupportLine, SUPPORT_EMAIL } from '../../content/avisoLegalContent';
import './avisoLegal.css';
/**
 * Modal obligatorio: no se puede cerrar sin aceptar el aviso legal.
 */
export default function AvisoLegalModal({ onAccept, busy = false, error = '' }) {
  return (
    <div
      className="legal-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div className="legal-modal">
        <header className="legal-modal__header">
          <h2 id="legal-modal-title">Aviso Legal</h2>
          <p>Debes leer y aceptar el aviso legal para continuar usando GoalLogic.</p>
        </header>

        <div className="legal-modal__body">
          <AvisoLegalContent variant="modal" />
          <p className="legal-modal__support">
            {avisoLegalModalSupportLine}{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="legal-modal__support-link">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

        <footer className="legal-modal__footer">
          <p className="legal-modal__note">
            Al pulsar «Acepto y continuar», confirmas que has leído y aceptas las condiciones del
            Aviso Legal.
          </p>
          {error ? <p className="legal-modal__error">{error}</p> : null}
          <button
            type="button"
            className="legal-modal__accept"
            onClick={onAccept}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? 'Guardando…' : 'Acepto y continuar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
