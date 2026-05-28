import { useEffect } from 'react';

function ArrowOutIcon() {
  return (
    <svg className="lineups-sub__arrow lineups-sub__arrow--out" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2v8M8 10l-3-3M8 10l3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowInIcon() {
  return (
    <svg className="lineups-sub__arrow lineups-sub__arrow--in" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 14V6M8 6l-3 3M8 6l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SubstitutionRow({ sub, isNew, onAnimated }) {
  useEffect(() => {
    if (!isNew) return undefined;
    const timer = setTimeout(() => onAnimated?.(sub.id), 1200);
    return () => clearTimeout(timer);
  }, [isNew, onAnimated, sub.id]);

  return (
    <li className={`lineups-sub__item${isNew ? ' lineups-sub__item--new' : ''}`}>
      <span className="lineups-sub__minute">{sub.minuteLabel}&apos;</span>
      <div className="lineups-sub__players">
        <div className="lineups-sub__player lineups-sub__player--out">
          <ArrowOutIcon />
          <span className="lineups-sub__name">{sub.playerOut.name}</span>
        </div>
        <div className="lineups-sub__player lineups-sub__player--in">
          <ArrowInIcon />
          <span className="lineups-sub__name">{sub.playerIn.name}</span>
        </div>
      </div>
    </li>
  );
}

function TeamSubstitutionsColumn({
  team,
  substitutions,
  side,
  newSubstitutionIds,
  onSubAnimated,
}) {
  const teamName = team?.name || (side === 'home' ? 'Local' : 'Visitante');
  const primary = team?.colors?.primary || '#1565c0';

  return (
    <div
      className={`lineups-subs-col lineups-subs-col--${side}`}
      style={{ '--lineups-subs-primary': primary }}
    >
      <header className="lineups-subs-col__header">
        {team?.logo ? (
          <img src={team.logo} alt="" className="lineups-subs-col__logo" loading="lazy" />
        ) : null}
        <h4 className="lineups-subs-col__title">{teamName}</h4>
      </header>

      {substitutions.length === 0 ? (
        <p className="lineups-subs-col__empty">Sin cambios registrados</p>
      ) : (
        <ol className="lineups-subs-col__list">
          {substitutions.map((sub) => (
            <SubstitutionRow
              key={sub.id}
              sub={sub}
              isNew={newSubstitutionIds?.has(sub.id)}
              onAnimated={onSubAnimated}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Cambios en vivo (sustituciones) por equipo.
 */
export default function LineupsSubstitutions({
  homeTeam,
  awayTeam,
  substitutionsHome = [],
  substitutionsAway = [],
  loading = false,
  error = null,
  isLive = false,
  isFinished = false,
  newSubstitutionIds,
  onSubAnimated,
  onRetry,
}) {
  return (
    <section className="lineups-subs" aria-label="Cambios en vivo">
      <div className="lineups-subs__heading">
        <h3 className="lineups-subs__title">Cambios en vivo</h3>
        {isLive && !isFinished && (
          <span className="lineups-subs__live-badge" aria-label="Actualización en vivo">
            LIVE
          </span>
        )}
      </div>

      {loading && <p className="lineups-subs__status">Cargando cambios…</p>}

      {error && !loading && (
        <div className="lineups-subs__error">
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="lineups-retry-btn" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}

      {!loading && !error && (
        <div className="lineups-subs__columns">
          <TeamSubstitutionsColumn
            team={homeTeam}
            substitutions={substitutionsHome}
            side="home"
            newSubstitutionIds={newSubstitutionIds}
            onSubAnimated={onSubAnimated}
          />
          <TeamSubstitutionsColumn
            team={awayTeam}
            substitutions={substitutionsAway}
            side="away"
            newSubstitutionIds={newSubstitutionIds}
            onSubAnimated={onSubAnimated}
          />
        </div>
      )}
    </section>
  );
}
