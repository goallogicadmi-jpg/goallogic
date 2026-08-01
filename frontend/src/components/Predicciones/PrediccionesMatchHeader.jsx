/**
 * Cabecera del partido analizado (logos, nombres y competición).
 * @param {{ homeTeam?: { name?: string, logo?: string }, awayTeam?: { name?: string, logo?: string }, leagueLabel?: string|null, leagueLogo?: string|null }} props
 */
export default function PrediccionesMatchHeader({
  homeTeam,
  awayTeam,
  leagueLabel,
  leagueLogo,
}) {
  if (!homeTeam?.name && !awayTeam?.name) {
    return null;
  }

  return (
    <header className="predicciones-match-header" aria-label="Partido analizado">
      <div className="predicciones-match-header__team predicciones-match-header__team--home">
        {homeTeam?.logo ? (
          <img
            src={homeTeam.logo}
            alt=""
            className="predicciones-match-header__logo"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="predicciones-match-header__logo-fallback" aria-hidden="true">
            {(homeTeam?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="predicciones-match-header__name">{homeTeam?.name || 'Local'}</span>
      </div>

      <div className="predicciones-match-header__center">
        {leagueLogo && (
          <img
            src={leagueLogo}
            alt=""
            className="predicciones-match-header__league-logo"
            loading="lazy"
            decoding="async"
          />
        )}
        {leagueLabel && (
          <span className="predicciones-match-header__league">{leagueLabel}</span>
        )}
        <span className="predicciones-match-header__vs">vs</span>
      </div>

      <div className="predicciones-match-header__team predicciones-match-header__team--away">
        {awayTeam?.logo ? (
          <img
            src={awayTeam.logo}
            alt=""
            className="predicciones-match-header__logo"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="predicciones-match-header__logo-fallback" aria-hidden="true">
            {(awayTeam?.name || '?').trim().charAt(0).toUpperCase()}
          </span>
        )}
        <span className="predicciones-match-header__name">{awayTeam?.name || 'Visitante'}</span>
      </div>
    </header>
  );
}
