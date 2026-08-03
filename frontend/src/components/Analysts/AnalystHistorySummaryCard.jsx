import {
  impliedProbabilityFromOdds,
  getResultStatus,
} from '../../utils/analystDisplayUtils';
import './AnalystHistorySummaryCard.css';

export default function AnalystHistorySummaryCard({ item }) {
  const status = getResultStatus(item.resultado);
  const probPct = impliedProbabilityFromOdds(item.cuota);

  return (
    <article className="analyst-history-card">
      <div className="analyst-history-card__head">
        <div>
          <span className="analyst-history-card__label">Partido</span>
          <p className="analyst-history-card__match">{item.partido}</p>
        </div>
        <span className={`analyst-history-card__status analyst-history-card__status--${status.tone}`}>
          {status.label}
        </span>
      </div>

      <div className="analyst-history-card__meta">
        {item.mercado ? (
          <span className="analyst-history-card__tag">{item.mercado}</span>
        ) : null}
        {item.seleccion ? (
          <span className="analyst-history-card__pick">{item.seleccion}</span>
        ) : null}
      </div>

      {probPct != null ? (
        <div className="analyst-history-card__prob">
          <div className="analyst-history-card__prob-head">
            <span className="analyst-history-card__prob-label">Confianza implícita</span>
            <strong className="analyst-history-card__prob-value">{probPct}%</strong>
          </div>
          <div className="analyst-history-card__prob-track" aria-hidden="true">
            <div
              className="analyst-history-card__prob-fill"
              style={{ width: `${probPct}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="analyst-history-card__footer">
        {item.cuota != null ? (
          <span>Cuota <strong>{item.cuota}</strong></span>
        ) : null}
        {item.stake != null ? (
          <span>Stake <strong>{item.stake}</strong></span>
        ) : null}
      </div>
    </article>
  );
}
