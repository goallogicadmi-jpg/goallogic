import { tokens } from '../../styles/tokens';
import { getCompetitionLogoSources, resolveCompetitionLogo } from '../../config/competitionCatalog';
import CompetitionLogo from './CompetitionLogo';

/**
 * Shell visual para la página de competición (Clubes / Selecciones).
 */
export default function CompetitionPageLayout({
  loading = false,
  competitionName,
  leagueId,
  logoUrl,
  seasons = [],
  currentSeason,
  onSeasonChange,
  seasonMode,
  getSeasonLabel,
  onBack,
  children,
}) {
  const logoSources = getCompetitionLogoSources(leagueId, logoUrl);
  const hasLogo = logoSources.length > 0;
  const displayName = competitionName || 'Competición';

  if (loading) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          backgroundColor: '#0f1419',
          padding: tokens.spacing.lg,
          textAlign: 'center',
          color: '#b0b0b0',
        }}
      >
        Cargando información de la competición...
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#0f1419',
        padding: tokens.spacing.lg,
        color: tokens.colors.textPrimary,
      }}
    >
      <header
        style={{
          marginBottom: tokens.spacing.lg,
          padding: tokens.spacing.lg,
          backgroundColor: '#1a1a1a',
          borderRadius: tokens.radius.lg,
          border: '1px solid rgba(79, 195, 247, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: tokens.spacing.lg,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.sm,
            flex: '1 1 320px',
            minWidth: '240px',
          }}
        >
          {hasLogo ? (
            <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(79, 195, 247, 0.18)',
                backgroundColor: 'rgba(255, 255, 255, 0.94)',
                width: '200px',
                minWidth: '120px',
                maxWidth: '100%',
                minHeight: '88px',
                boxSizing: 'border-box',
              }}
            >
              <CompetitionLogo
                competitionId={leagueId}
                logoUrl={logoUrl || resolveCompetitionLogo(leagueId)}
                alt={`Logo de ${displayName}`}
                width={168}
                height={56}
                loading="eager"
                style={{
                  width: '168px',
                  height: '56px',
                  minWidth: '80px',
                  minHeight: '40px',
                  maxWidth: '100%',
                  maxHeight: '88px',
                }}
              />
            </div>
            <h1
              style={{
                margin: 0,
                color: tokens.colors.textPrimary,
                fontSize: tokens.typography.fontSize2xl,
                fontWeight: tokens.typography.fontWeightSemibold,
              }}
            >
              {displayName}
            </h1>
            </>
          ) : (
            <h1
              style={{
                margin: 0,
                color: tokens.colors.textPrimary,
                fontSize: tokens.typography.fontSize3xl,
                fontWeight: tokens.typography.fontWeightSemibold,
              }}
            >
              {displayName}
            </h1>
          )}
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          {seasons.length > 0 && (
            <div>
              <label style={{ marginRight: tokens.spacing.sm, color: '#b0b0b0' }}>Temporada:</label>
              <select
                value={currentSeason}
                onChange={(e) => onSeasonChange?.(e.target.value)}
                style={{
                  padding: '10px 15px',
                  borderRadius: tokens.radius.md,
                  border: '1px solid rgba(79, 195, 247, 0.3)',
                  backgroundColor: '#1a1a1a',
                  color: tokens.colors.textPrimary,
                  fontSize: tokens.typography.fontSizeMd,
                  cursor: 'pointer',
                }}
              >
                {seasons.map((season) => (
                  <option key={season.year} value={season.year}>
                    {getSeasonLabel ? getSeasonLabel(season, seasonMode) : season.year}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '10px 20px',
              borderRadius: tokens.radius.md,
              border: '1px solid rgba(79, 195, 247, 0.3)',
              backgroundColor: 'transparent',
              color: '#4FC3F7',
              cursor: 'pointer',
              fontSize: tokens.typography.fontSizeMd,
              fontWeight: tokens.typography.fontWeightMedium,
            }}
          >
            ← Volver
          </button>
        </div>
      </header>
      <div className="competition-page-body">{children}</div>
    </div>
  );
}
