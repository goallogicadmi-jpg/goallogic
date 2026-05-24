import React from 'react';
import { tokens } from '../../styles/tokens';

function formatMatchDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function renderTeam(team) {
  const teamRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: `${tokens.spacing.xs} 0`,
    minWidth: 0,
  };

  const teamNameStyle = {
    color: team?.isPlaceholder ? tokens.colors.textSecondary : tokens.colors.textPrimary,
    fontSize: '0.95rem',
    fontWeight: team?.isPlaceholder ? 500 : 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div style={teamRowStyle}>
      {team?.logo && !team?.isPlaceholder ? (
        <img
          src={team.logo}
          alt={team.name}
          style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span style={teamNameStyle}>{team?.name || 'Por definir'}</span>
    </div>
  );
}

export default function OfficialKnockoutBracket({ bracket }) {
  if (!bracket) {
    return null;
  }

  const containerStyle = {
    marginTop: tokens.spacing.xxl,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
  };

  const headerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  };

  const roundsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: tokens.spacing.lg,
  };

  const roundCardStyle = {
    backgroundColor: tokens.colors.bgSecondary,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
  };

  const matchCardStyle = {
    backgroundColor: tokens.colors.bgPrimary,
    border: `1px solid ${tokens.colors.borderSubtle || tokens.colors.borderDefault}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const matchLabelStyle = {
    color: tokens.colors.textSecondary,
    fontSize: '0.8rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  return (
    <section style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: tokens.colors.textPrimary }}>Fase Eliminatoria Oficial</h3>
        <p style={{ margin: 0, color: tokens.colors.textSecondary }}>
          Cruces predefinidos segun el reglamento oficial del torneo.
        </p>
      </div>

      <div style={roundsGridStyle}>
        {bracket.roundsOrder.map((roundKey) => {
          const matches = bracket[roundKey] || [];

          if (matches.length === 0) {
            return null;
          }

          return (
            <div key={roundKey} style={roundCardStyle}>
              <h4 style={{ margin: 0, color: tokens.colors.textPrimary }}>
                {bracket.roundLabels?.[roundKey] || roundKey}
              </h4>

              {matches.map((match, index) => (
                <div key={match.id || `${roundKey}-${index}`} style={matchCardStyle}>
                  <div style={matchLabelStyle}>
                    {match.matchNumber ? `Partido ${match.matchNumber}` : `Cruce ${index + 1}`}
                  </div>
                  {match.date ? (
                    <div style={{ color: tokens.colors.textSecondary, fontSize: '0.8rem' }}>
                      {formatMatchDate(match.date)}
                    </div>
                  ) : null}
                  {renderTeam(match.homeTeam)}
                  <div style={{ color: tokens.colors.textSecondary, fontSize: '0.85rem' }}>
                    {typeof match.score?.home === 'number' && typeof match.score?.away === 'number'
                      ? `${match.score.home} - ${match.score.away}`
                      : 'vs'}
                  </div>
                  {renderTeam(match.awayTeam)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
