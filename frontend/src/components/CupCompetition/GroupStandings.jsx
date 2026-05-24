import React from 'react';
import { tokens } from '../../styles/tokens';
import { getCupTournamentRule } from '../../utils/cupTournamentRules';
import { resolveCompetitionDomain } from '../../utils/cupCompetitionDomain';

/**
 * Componente para mostrar la tabla de posiciones de un grupo
 * @param {Object} groupData - Datos del grupo (standings, teams, etc.)
 * @param {string} groupName - Nombre del grupo
 */
export default function GroupStandings({
  groupData,
  groupName,
  competitionId,
  onTeamSelect,
  domain = 'club',
}) {
  const resolvedDomain = resolveCompetitionDomain(competitionId, domain);
  if (!groupData || !groupData.standings || groupData.standings.length === 0) {
    return (
      <div style={{
        padding: tokens.spacing.lg,
        backgroundColor: tokens.colors.bgSecondary,
        borderRadius: tokens.radius.md,
        border: `1px solid ${tokens.colors.borderDefault}`,
        textAlign: 'center',
        color: tokens.colors.textSecondary,
      }}>
        No hay datos disponibles para el {groupName}
      </div>
    );
  }

  const containerStyle = {
    marginBottom: tokens.spacing.xl,
  };

  const headerStyle = {
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: `${tokens.radius.md} ${tokens.radius.md} 0 0`,
    border: `1px solid ${tokens.colors.borderDefault}`,
    borderBottom: 'none',
  };

  const titleStyle = {
    fontSize: tokens.typography.fontSizeXl,
    fontWeight: tokens.typography.fontWeightBold,
    color: tokens.colors.textPrimary,
    margin: 0,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: tokens.colors.bgSecondary,
    borderRadius: `0 0 ${tokens.radius.md} ${tokens.radius.md}`,
    border: `1px solid ${tokens.colors.borderDefault}`,
    overflow: 'hidden',
  };

  const thStyle = {
    padding: tokens.spacing.md,
    textAlign: 'left',
    backgroundColor: tokens.colors.bgTertiary,
    color: tokens.colors.textPrimary,
    fontSize: tokens.typography.fontSizeSm,
    fontWeight: tokens.typography.fontWeightSemibold,
    borderBottom: `1px solid ${tokens.colors.borderDefault}`,
  };

  const tdStyle = {
    padding: tokens.spacing.md,
    borderBottom: `1px solid ${tokens.colors.borderDefault}`,
    color: tokens.colors.textSecondary,
    fontSize: tokens.typography.fontSizeBase,
  };

  const teamNameStyle = {
    fontWeight: tokens.typography.fontWeightSemibold,
    color: tokens.colors.textPrimary,
  };

  const teamCellContentStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    minWidth: 0,
  };

  const teamLogoStyle = {
    width: '24px',
    height: '24px',
    objectFit: 'contain',
    flexShrink: 0,
  };

  const teamNameTextStyle = {
    ...teamNameStyle,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const tournamentRule = getCupTournamentRule(competitionId, resolvedDomain);
  const classificationRule = tournamentRule?.classification || {};

  const classificationColors = {
    direct: '#00d47e',
    bestThird: '#f5c542',
    playoffs: '#00d47e',
    promotion: '#38bdf8',
    relegationPlayoff: '#f59e0b',
    relegation: tokens.colors.accentDanger,
  };

  const resolveClassificationType = (team, position) => {
    switch (classificationRule.mode) {
      case 'top_two_best_third':
        if ((classificationRule.directPositions || []).includes(position)) {
          return 'direct';
        }
        if (position === classificationRule.bestThirdPosition) {
          return 'bestThird';
        }
        return 'eliminated';
      case 'top_two':
        if ((classificationRule.directPositions || []).includes(position)) {
          return 'direct';
        }
        return 'eliminated';
      case 'description': {
        const description = String(team.description || '').toLowerCase();
        if (description.includes('playoff')) {
          return 'playoffs';
        }
        if (description.includes('promotion')) {
          return 'promotion';
        }
        if (description.includes('play-out') || description.includes('relegation play')) {
          return 'relegationPlayoff';
        }
        if (description.includes('relegation')) {
          return 'relegation';
        }
        return null;
      }
      case 'none':
      default:
        return null;
    }
  };

  const standings = Array.isArray(groupData.standings) 
    ? groupData.standings 
    : (groupData.standings?.[0] || []);

  // Normalizar nombre del grupo: buscar "Group" o "Grupo" seguido de una letra mayúscula
  const normalizedGroupName = groupData?.groupLabel || groupName;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>{normalizedGroupName} - Tabla de Posiciones</h2>
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Pos</th>
            <th style={thStyle}>Equipo</th>
            <th style={{...thStyle, textAlign: 'center'}}>PJ</th>
            <th style={{...thStyle, textAlign: 'center'}}>G</th>
            <th style={{...thStyle, textAlign: 'center'}}>E</th>
            <th style={{...thStyle, textAlign: 'center'}}>P</th>
            <th style={{...thStyle, textAlign: 'center'}}>GF</th>
            <th style={{...thStyle, textAlign: 'center'}}>GC</th>
            <th style={{...thStyle, textAlign: 'center'}}>DG</th>
            <th style={{...thStyle, textAlign: 'center'}}>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team, index) => {
            const position = team.rank || team.position || index + 1;
            const played = team.all?.played || team.played || 0;
            const win = team.all?.win || team.win || 0;
            const draw = team.all?.draw || team.draw || 0;
            const lose = team.all?.lose || team.lose || 0;
            const goalsFor = team.all?.goals?.for || team.goalsFor || 0;
            const goalsAgainst = team.all?.goals?.against || team.goalsAgainst || 0;
            const goalDiff = goalsFor - goalsAgainst;
            const points = team.points || team.points || 0;
            const teamName = team.team?.name || team.name || 'Equipo';
            const teamLogo = team.team?.logo || team.logo || null;
            const teamId = team.team?.id ?? team.teamId ?? team.id;
            const canOpenTeam = typeof onTeamSelect === 'function' && teamId != null;
            const classificationType = resolveClassificationType(team, position);
            const borderColor = classificationColors[classificationType] || null;
            const rowStyle = {
              borderLeft: borderColor ? `4px solid ${borderColor}` : 'none',
              opacity: classificationType === 'eliminated' ? 0.5 : 1
            };

            return (
              <tr key={teamId ?? team.team?.id ?? index} style={rowStyle}>
                <td style={tdStyle}>{position}</td>
                <td style={tdStyle}>
                  <div
                    style={{
                      ...teamCellContentStyle,
                      cursor: canOpenTeam ? 'pointer' : 'default',
                    }}
                    role={canOpenTeam ? 'button' : undefined}
                    tabIndex={canOpenTeam ? 0 : undefined}
                    onClick={() => {
                      if (canOpenTeam) onTeamSelect(teamId);
                    }}
                    onKeyDown={(e) => {
                      if (!canOpenTeam) return;
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onTeamSelect(teamId);
                      }
                    }}
                  >
                    {teamLogo && (
                      <img
                        src={teamLogo}
                        alt={teamName}
                        style={teamLogoStyle}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span style={teamNameTextStyle}>{teamName}</span>
                  </div>
                </td>
                <td style={{...tdStyle, textAlign: 'center'}}>{played}</td>
                <td style={{...tdStyle, textAlign: 'center'}}>{win}</td>
                <td style={{...tdStyle, textAlign: 'center'}}>{draw}</td>
                <td style={{...tdStyle, textAlign: 'center'}}>{lose}</td>
                <td style={{...tdStyle, textAlign: 'center'}}>{goalsFor}</td>
                <td style={{...tdStyle, textAlign: 'center'}}>{goalsAgainst}</td>
                <td style={{...tdStyle, textAlign: 'center', color: goalDiff > 0 ? tokens.colors.accentPositive : goalDiff < 0 ? tokens.colors.accentDanger : undefined}}>
                  {goalDiff > 0 ? '+' : ''}{goalDiff}
                </td>
                <td style={{...tdStyle, textAlign: 'center', fontWeight: 'bold'}}>{points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {Array.isArray(classificationRule.legend) && classificationRule.legend.length > 0 ? (
        <div className="legend">
          {classificationRule.legend.map((item) => (
            <div key={item.type} className="legend-item">
              <span
                className="color"
                style={{ backgroundColor: classificationColors[item.type] || 'transparent' }}
              ></span>
              {item.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
