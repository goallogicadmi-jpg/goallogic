import { Link } from 'react-router-dom';
import {
  avisoLegalShortDisclaimer,
  avisoLegalFooterSupportLine,
  SUPPORT_EMAIL,
} from '../../content/avisoLegalContent';
import './avisoLegal.css';

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <p className="site-footer__text">
        {avisoLegalShortDisclaimer}{' '}
        <Link to="/aviso-legal" className="site-footer__link">
          Ver Aviso Legal
        </Link>
        .
      </p>
      <p className="site-footer__text site-footer__support">
        {avisoLegalFooterSupportLine}{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="site-footer__link">
          {SUPPORT_EMAIL}
        </a>
      </p>
    </footer>
  );
}