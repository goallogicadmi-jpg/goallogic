import './AnalystVerifiedBadge.css';

export default function AnalystVerifiedBadge({ compact = false, showSubtitle = true }) {
  return (
    <div className={`analyst-verified-badge${compact ? ' analyst-verified-badge--compact' : ''}`}>
      <span className="analyst-verified-badge__line">
        <svg className="analyst-verified-badge__check" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M6.2 11.1 3.4 8.3l-.9.9 3.7 3.7 7.4-7.4-.9-.9-6.5 6.5z"
            fill="currentColor"
          />
        </svg>
        Verificado
      </span>
      {showSubtitle ? (
        <span className="analyst-verified-badge__subtitle">Analista Deportivo Certificado</span>
      ) : null}
    </div>
  );
}
