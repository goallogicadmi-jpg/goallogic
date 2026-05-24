import { useNavigate } from 'react-router-dom';
import { tokens } from '../../styles/tokens';
import { getCompetitionRoute, getTeamRoute } from '../../config/competitionCatalog';
import { useCompetitionHubData } from '../../hooks/useCompetitionHubData';
import CompetitionHubCard from './CompetitionHubCard';
import CompetitionHubNextMatch from './CompetitionHubNextMatch';
import CompetitionHubMiniStats from './CompetitionHubMiniStats';

const itemStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: tokens.spacing.md,
  minWidth: 0,
};

/**
 * Bloque hub: card + próximo partido + mini stats (un fetch por competición).
 */
export default function CompetitionHubItem({ competition, domain }) {
  const navigate = useNavigate();
  const hub = useCompetitionHubData(competition?.id, domain);

  const handleViewCompetition = () => {
    if (competition?.id) {
      navigate(getCompetitionRoute(domain, competition.id));
    }
  };

  const handleTeamNavigate = (teamId) => {
    if (teamId) {
      navigate(getTeamRoute(domain, teamId));
    }
  };

  if (hub.error && !hub.loading) {
    return (
      <div
        style={{
          ...itemStyle,
          padding: tokens.spacing.lg,
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)',
        }}
      >
        <p style={{ margin: 0, color: tokens.colors.accentNegative, fontWeight: 600 }}>
          {competition?.name}
        </p>
        <p style={{ margin: `${tokens.spacing.sm} 0 0`, color: tokens.colors.textSecondary, fontSize: tokens.typography.fontSizeSm }}>
          {hub.error}
        </p>
        <button
          type="button"
          onClick={handleViewCompetition}
          style={{
            marginTop: tokens.spacing.md,
            padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
            borderRadius: tokens.radius.md,
            border: '1px solid rgba(79, 195, 247, 0.5)',
            background: 'transparent',
            color: '#4FC3F7',
            cursor: 'pointer',
          }}
        >
          Ver competición
        </button>
      </div>
    );
  }

  return (
    <article style={itemStyle}>
      <CompetitionHubCard
        competition={competition}
        domain={domain}
        editorialInfo={hub.editorialInfo}
        currentChampion={hub.currentChampion}
        season={hub.season}
        onViewCompetition={handleViewCompetition}
      />
      <CompetitionHubNextMatch
        partido={hub.nextMatch}
        domain={domain}
        loading={hub.loading}
      />
      <CompetitionHubMiniStats
        leader={hub.leader}
        kpis={hub.kpis}
        highlights={hub.highlights}
        loading={hub.loading}
        onTeamNavigate={handleTeamNavigate}
      />
    </article>
  );
}
